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
  const scriptSrc = isDev
    ? `'self' 'unsafe-eval' 'nonce-${nonce}'`
    : `'self' 'nonce-${nonce}'`;

  const connectSrc = isDev
    ? `'self' https://api.first.org https://services.nvd.nist.gov ws://localhost:* wss://localhost:*`
    : `'self' https://api.first.org https://services.nvd.nist.gov`;

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
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

/** Public pages that do NOT require an active session. */
const PUBLIC_PREFIXES = [
  '/login',
  '/signup',
  '/api',
];

function shouldSkip(pathname: string): boolean {
  if (STATIC_EXTENSIONS.test(pathname)) return true;
  return SKIP_PREFIXES.some((p) => pathname.startsWith(p));
}

function isPublicPage(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
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

  // --- Session gate for /app/* routes ---
  if (pathname.startsWith('/app')) {
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
      'max-age=31536000; includeSubDomains',
    );
  }

  // Expose the nonce so server components can use it (via request header)
  response.headers.set('x-nonce', nonce);

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
