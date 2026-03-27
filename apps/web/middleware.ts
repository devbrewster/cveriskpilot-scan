// Next.js middleware — runs on the Edge runtime for every matched request.
// Responsibilities:
//   1. Inject security headers (CSP, HSTS, etc.)
//   2. Generate a per-request CSP nonce
//   3. Session-gate /app/* routes (redirect to /login when missing)

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
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/invite',
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
// Middleware
// ---------------------------------------------------------------------------

export function middleware(request: NextRequest) {
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
      return NextResponse.redirect(loginUrl);
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
