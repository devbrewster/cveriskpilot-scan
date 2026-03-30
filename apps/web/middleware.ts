// Next.js middleware — runs on the Edge runtime for every matched request.
// Responsibilities:
//   1. Inject security headers (CSP, HSTS, etc.)
//   2. Generate a per-request CSP nonce
//   3. Session-gate /app/* routes (redirect to /login when missing)
//   4. Structured request logging for Cloud Logging metrics

import { NextResponse, type NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// CSP builder (inlined to avoid importing Node-only packages on the Edge)
// ---------------------------------------------------------------------------

function buildCsp(nonce: string, isDev: boolean): string {
  // Next.js standalone output does not inject nonce attributes into prerendered
  // script tags. Per CSP spec, when a nonce-source is present browsers IGNORE
  // 'unsafe-inline' — which blocks all Next.js inline scripts and causes a
  // white screen. Until Next.js supports nonce injection in standalone mode,
  // we must use 'unsafe-inline' WITHOUT a nonce.
  const scriptSrc = isDev
    ? `'self' 'unsafe-eval' 'unsafe-inline'`
    : `'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com`;

  const connectSrc = isDev
    ? `'self' https://api.first.org https://services.nvd.nist.gov ws://localhost:* wss://localhost:*`
    : `'self' https://api.first.org https://services.nvd.nist.gov https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com`;

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com`,
    `font-src 'self'`,
    `connect-src ${connectSrc}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ');
}

// ---------------------------------------------------------------------------
// Path matchers
// ---------------------------------------------------------------------------

/** Paths the middleware should ignore entirely. */
const SKIP_PREFIXES = [
  '/_next',
  '/favicon.ico',
  '/api/webhooks',
];

const STATIC_EXTENSIONS = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot|map)$/;

/** Block access to dotfiles and common attack paths. */
const BLOCKED_PATHS = /^\/(\.env|\.git|\.svn|\.hg|\.DS_Store|wp-admin|wp-login|wp-content|phpinfo|\.htaccess|\.htpasswd|web\.config)/;

/** Public paths that do NOT require an active session. */
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/pricing',
  '/privacy',
  '/terms',
  '/government',
  '/robots.txt',
  '/sitemap.xml',
  '/security-policy',
];

const PUBLIC_PREFIXES = [
  '/demo',
  '/docs',       // documentation is public
  '/blog',       // blog is public
  '/portal',     // portal has its own auth via crp_portal_session
  '/_next',
];

/** API routes that are genuinely public (use their own auth mechanisms). */
const API_PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/auth/mfa/verify',
  '/api/auth/dev-session',
  '/api/webhooks',                          // webhooks have their own HMAC auth
  '/api/integrations/jira/webhook',         // Jira webhook (HMAC auth)
  '/api/connectors/webhook/',               // Scanner webhooks (HMAC auth)
  '/api/billing/webhook',                   // Stripe webhook (signature verification)
  '/api/pipeline/scan',                     // uses API key auth, not session
  '/api/health',
  '/api/docs',
];

function shouldSkip(pathname: string): boolean {
  if (STATIC_EXTENSIONS.test(pathname)) return true;
  return SKIP_PREFIXES.some((p) => pathname.startsWith(p));
}

function isPublicPage(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function isPublicApiPath(pathname: string): boolean {
  return API_PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

// ---------------------------------------------------------------------------
// IP range matching (Edge-compatible, no Node.js imports)
// ---------------------------------------------------------------------------

/**
 * Check if an IPv4 address falls within a CIDR range.
 * Handles both CIDR (10.0.0.0/8) and single IPs (10.0.0.1).
 */
function isIpInRange(ip: string, range: string): boolean {
  const [rangeIp, prefixStr] = range.split('/');
  const prefix = prefixStr ? parseInt(prefixStr, 10) : 32;

  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(rangeIp);

  if (ipNum === null || rangeNum === null) return false;

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
}

function ipToNumber(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  let num = 0;
  for (const part of parts) {
    const octet = parseInt(part, 10);
    if (isNaN(octet) || octet < 0 || octet > 255) return null;
    num = (num << 8) | octet;
  }

  return num >>> 0;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Structured log helper (Edge-compatible, no Node.js imports)
// Mirrors the format from @cveriskpilot/shared logger so Cloud Logging
// metrics (context="http") work for both middleware and API routes.
// ---------------------------------------------------------------------------

function writeRequestLog(
  severity: 'INFO' | 'WARNING' | 'ERROR',
  message: string,
  data: Record<string, unknown>,
): void {
  const entry = {
    severity,
    message,
    context: 'http',
    timestamp: new Date().toISOString(),
    ...data,
  };

  if (process.env.NODE_ENV === 'production' || process.env.K_SERVICE) {
    // Structured JSON for Cloud Logging
    if (severity === 'ERROR') {
      console.error(JSON.stringify(entry));
    } else if (severity === 'WARNING') {
      console.warn(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }
  // In development, skip request logs to reduce noise
}

export function middleware(request: NextRequest) {
  const start = Date.now();
  const { pathname } = request.nextUrl;

  // Skip static assets and internal Next.js routes
  if (shouldSkip(pathname)) {
    return NextResponse.next();
  }

  // Block dotfiles and common attack paths — return 404 before any redirect
  if (BLOCKED_PATHS.test(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  // --- Session gate for protected routes ---
  // API routes that are not in the public API list require a session cookie.
  // Return 401 JSON (not a redirect) so API clients get a proper error.
  if (pathname.startsWith('/api/') && !isPublicApiPath(pathname)) {
    const sessionCookie = request.cookies.get('crp_session');
    if (!sessionCookie?.value) {
      const duration_ms = Date.now() - start;
      writeRequestLog('INFO', `${request.method} ${pathname} 401 ${duration_ms}ms`, {
        method: request.method,
        path: pathname,
        status: 401,
        duration_ms,
      });

      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }
  }

  // Non-API pages that are not explicitly public require an active session.
  if (!pathname.startsWith('/api/') && !isPublicPage(pathname)) {
    const sessionCookie = request.cookies.get('crp_session');
    if (!sessionCookie?.value) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);

      const duration_ms = Date.now() - start;
      writeRequestLog('INFO', `${request.method} ${pathname} 302 ${duration_ms}ms`, {
        method: request.method,
        path: pathname,
        status: 302,
        duration_ms,
      });

      return NextResponse.redirect(loginUrl);
    }
  }

  // --- Ops domain gate: /ops/* and /api/ops/* require @cveriskpilot.com or founder email ---
  // Founder emails get ops access regardless of domain (Edge-safe, no Node imports)
  const FOUNDER_EMAILS_SET = new Set(['gontiveros292@gmail.com', 'george.ontiveros@cveriskpilot.com']);
  if (pathname.startsWith('/ops') || pathname.startsWith('/api/ops')) {
    const sessionCookie = request.cookies.get('crp_session');
    if (!sessionCookie?.value) {
      // No session — already caught by the session gate above, but guard defensively.
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        : NextResponse.redirect(new URL(`/login?callbackUrl=${pathname}`, request.url));
    }

    // Attempt to read email from session cookie (base64-encoded JSON).
    // When Redis-backed sessions are active, the cookie is an opaque UUID
    // and JSON.parse will fail. In that case, route-level auth (getServerSession)
    // handles domain verification, but we still block at middleware as defense-in-depth.
    let email: string | null = null;
    let isOpaqueToken = false;
    try {
      const payload = JSON.parse(atob(sessionCookie.value));
      email = typeof payload.email === 'string' ? payload.email : null;
    } catch {
      // Opaque token (Redis session UUID) — can't verify domain at middleware layer.
      // Block both page and API routes. Route-level auth is the primary gate,
      // but ops routes should not be reachable without domain verification.
      isOpaqueToken = true;
    }

    // For opaque tokens, let route-level getServerSession handle auth.
    // The route-level handlers (added in Wave 22a) will verify the staff domain.
    // We still block page routes since they don't have route-level auth.
    if (isOpaqueToken && !pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Internal staff only' }, { status: 403 });
    }

    if (email && !email.endsWith('@cveriskpilot.com') && !FOUNDER_EMAILS_SET.has(email.toLowerCase())) {
      const duration_ms = Date.now() - start;
      writeRequestLog('WARNING', `${request.method} ${pathname} 403 ${duration_ms}ms (ops domain denied)`, {
        method: request.method,
        path: pathname,
        status: 403,
        duration_ms,
        denied_email: email,
      });

      return NextResponse.json(
        { error: 'Internal staff only' },
        { status: 403 },
      );
    }
  }

  // --- IP Allowlist check for API routes (read from x-org-ip-allowlist header set by upstream) ---
  // Note: Full IP allowlist enforcement is handled in the API route layer via
  // org entitlements lookup. The middleware provides an early check if the
  // x-org-ip-allowlist-enabled header is set by a load balancer or prior middleware.
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    const ipAllowlistEnabled = request.headers.get('x-org-ip-allowlist-enabled');
    if (ipAllowlistEnabled === 'true') {
      const allowedRanges = request.headers.get('x-org-ip-allowlist');
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

      if (allowedRanges && clientIp) {
        const ranges = allowedRanges.split(',').map((r: string) => r.trim());
        const ipAllowed = ranges.some((range: string) => isIpInRange(clientIp, range));

        if (!ipAllowed) {
          const duration_ms = Date.now() - start;
          writeRequestLog('WARNING', `${request.method} ${pathname} 403 ${duration_ms}ms (IP blocked)`, {
            method: request.method,
            path: pathname,
            status: 403,
            duration_ms,
            blocked_ip: clientIp,
          });

          return NextResponse.json(
            { error: 'Access denied: IP not in allowlist' },
            { status: 403 },
          );
        }
      }
    }
  }

  // --- Security headers ---
  const nonce = crypto.randomUUID();
  const isDev = process.env.NODE_ENV !== 'production';

  const response = NextResponse.next();

  // --- CSRF cookie seeder ---
  // Set a crp_csrf cookie on every response so the client can read it and send
  // it back as X-CSRF-Token on sensitive mutations. Enforcement happens at the
  // route level via checkCsrf() on high-risk endpoints (billing, keys, webhooks,
  // teams, retention). Session cookies with SameSite=Lax provide baseline CSRF
  // protection for all same-origin API calls.
  if (!request.cookies.get('crp_csrf')?.value) {
    const token = crypto.randomUUID();
    response.cookies.set('crp_csrf', token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: !isDev,
      path: '/',
    });
  }

  // CSP
  response.headers.set('Content-Security-Policy', buildCsp(nonce, isDev));

  // Standard security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '0');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );

  // HSTS in production only
  if (!isDev) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }

  // --- Structured request log ---
  const duration_ms = Date.now() - start;
  const sessionCookie = request.cookies.get('crp_session');

  writeRequestLog('INFO', `${request.method} ${pathname} 200 ${duration_ms}ms`, {
    method: request.method,
    path: pathname,
    status: 200,
    duration_ms,
    ...(sessionCookie?.value ? { user_session: 'present' } : {}),
  });

  return response;
}

// ---------------------------------------------------------------------------
// Config — tell Next.js which paths to run the middleware on
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *   - _next/static (static files)
     *   - _next/image  (image optimisation)
     *   - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
