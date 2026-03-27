// Security headers utility
// Returns the full set of recommended HTTP security headers for CVERiskPilot.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SecurityHeaderOptions {
  /** CSP nonce for inline scripts */
  nonce?: string;
  /** Set to true to relax CSP for Next.js hot-reload in development */
  isDev?: boolean;
}

// ---------------------------------------------------------------------------
// CSP
// ---------------------------------------------------------------------------

/**
 * Build a Content-Security-Policy header value.
 *
 * In dev mode the policy is relaxed to allow Next.js HMR websockets and
 * eval-based hot reload.
 */
export function getCspHeader(nonce: string, isDev = false): string {
  const scriptSrc = isDev
    ? `'self' 'unsafe-eval' 'nonce-${nonce}'`
    : `'self' 'nonce-${nonce}'`;

  const connectSrc = isDev
    ? `'self' https://api.first.org https://services.nvd.nist.gov ws://localhost:* wss://localhost:*`
    : `'self' https://api.first.org https://services.nvd.nist.gov`;

  const directives = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src ${connectSrc}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ];

  return directives.join('; ');
}

// ---------------------------------------------------------------------------
// Full header set
// ---------------------------------------------------------------------------

/**
 * Return all recommended security headers as a flat object suitable for
 * `NextResponse.headers`.
 */
export function getSecurityHeaders(
  options?: SecurityHeaderOptions,
): Record<string, string> {
  const nonce = options?.nonce ?? '';
  const isDev = options?.isDev ?? false;

  const headers: Record<string, string> = {
    'Content-Security-Policy': getCspHeader(nonce, isDev),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };

  if (!isDev) {
    headers['Strict-Transport-Security'] =
      'max-age=31536000; includeSubDomains';
  }

  return headers;
}
