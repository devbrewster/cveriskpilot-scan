// CSRF protection using the double-submit cookie pattern
// Generates a random token sent as both an httpOnly cookie and a request header/form field.
// Validation uses timing-safe comparison to prevent timing attacks.

import crypto from 'node:crypto';

/** CSRF cookie name */
export const CSRF_COOKIE_NAME = 'crp_csrf';

/** Length of the CSRF token in bytes (32 bytes = 64 hex chars) */
const TOKEN_BYTE_LENGTH = 32;

export interface CsrfTokenPair {
  /** Token value to embed in forms / send as a request header */
  token: string;
  /** Set-Cookie header value for the httpOnly cookie */
  cookie: string;
}

/**
 * Generate a CSRF token pair (cookie + header/form value).
 *
 * The caller should:
 *   1. Set the `cookie` value as a response Set-Cookie header.
 *   2. Embed the `token` in a hidden form field or custom request header.
 */
export function generateCsrfToken(options?: {
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}): CsrfTokenPair {
  const token = crypto.randomBytes(TOKEN_BYTE_LENGTH).toString('hex');
  const secure = options?.secure ?? process.env.NODE_ENV === 'production';
  const sameSite = options?.sameSite ?? 'strict';

  const parts = [
    `${CSRF_COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    `SameSite=${sameSite}`,
  ];

  if (secure) {
    parts.push('Secure');
  }

  return {
    token,
    cookie: parts.join('; '),
  };
}

/**
 * Validate that the CSRF cookie token matches the header/form token.
 * Uses crypto.timingSafeEqual to prevent timing side-channel attacks.
 *
 * Returns `false` for any invalid, missing, or mismatched values.
 */
export function validateCsrfToken(
  cookieToken: string | undefined | null,
  headerToken: string | undefined | null,
): boolean {
  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;

  try {
    const a = Buffer.from(cookieToken, 'utf-8');
    const b = Buffer.from(headerToken, 'utf-8');
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
