import { describe, it, expect } from 'vitest';
import { getCspHeader, getSecurityHeaders } from '../security/headers.js';

describe('getCspHeader', () => {
  const nonce = 'test-nonce-123';

  it('includes the nonce in script-src', () => {
    const csp = getCspHeader(nonce);
    expect(csp).toContain(`'nonce-${nonce}'`);
  });

  it('sets default-src to self', () => {
    const csp = getCspHeader(nonce);
    expect(csp).toContain("default-src 'self'");
  });

  it('allows NVD and FIRST APIs in connect-src', () => {
    const csp = getCspHeader(nonce);
    expect(csp).toContain('https://api.first.org');
    expect(csp).toContain('https://services.nvd.nist.gov');
  });

  it('blocks framing via frame-ancestors', () => {
    const csp = getCspHeader(nonce);
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('does NOT include unsafe-eval in production mode', () => {
    const csp = getCspHeader(nonce, false);
    expect(csp).not.toContain('unsafe-eval');
  });

  it('includes unsafe-eval in dev mode for hot reload', () => {
    const csp = getCspHeader(nonce, true);
    expect(csp).toContain("'unsafe-eval'");
  });

  it('includes websocket sources in dev mode', () => {
    const csp = getCspHeader(nonce, true);
    expect(csp).toContain('ws://localhost:*');
    expect(csp).toContain('wss://localhost:*');
  });

  it('excludes websocket sources in production', () => {
    const csp = getCspHeader(nonce, false);
    expect(csp).not.toContain('ws://localhost:*');
  });
});

describe('getSecurityHeaders', () => {
  it('returns all required security headers', () => {
    const headers = getSecurityHeaders({ nonce: 'abc' });

    expect(headers['Content-Security-Policy']).toBeDefined();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-XSS-Protection']).toBe('0');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toBe(
      'camera=(), microphone=(), geolocation=()',
    );
  });

  it('includes HSTS in production mode', () => {
    const headers = getSecurityHeaders({ isDev: false });
    expect(headers['Strict-Transport-Security']).toBe(
      'max-age=31536000; includeSubDomains',
    );
  });

  it('excludes HSTS in dev mode', () => {
    const headers = getSecurityHeaders({ isDev: true });
    expect(headers['Strict-Transport-Security']).toBeUndefined();
  });

  it('defaults to production mode', () => {
    const headers = getSecurityHeaders();
    expect(headers['Strict-Transport-Security']).toBeDefined();
  });

  it('embeds the nonce in the CSP header', () => {
    const headers = getSecurityHeaders({ nonce: 'my-nonce' });
    expect(headers['Content-Security-Policy']).toContain("'nonce-my-nonce'");
  });
});
