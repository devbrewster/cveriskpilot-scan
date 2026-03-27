import { describe, it, expect } from 'vitest';
import { generateCsrfToken, validateCsrfToken, CSRF_COOKIE_NAME } from '../security/csrf';

describe('CSRF protection', () => {
  describe('generateCsrfToken', () => {
    it('returns a token and a Set-Cookie string', () => {
      const result = generateCsrfToken({ secure: false });
      expect(result.token).toBeDefined();
      expect(result.token.length).toBe(64); // 32 bytes hex
      expect(result.cookie).toContain(`${CSRF_COOKIE_NAME}=`);
      expect(result.cookie).toContain('HttpOnly');
      expect(result.cookie).toContain('SameSite=strict');
    });

    it('includes Secure flag when secure option is true', () => {
      const result = generateCsrfToken({ secure: true });
      expect(result.cookie).toContain('Secure');
    });

    it('omits Secure flag when secure option is false', () => {
      const result = generateCsrfToken({ secure: false });
      expect(result.cookie).not.toContain('Secure');
    });

    it('generates unique tokens on each call', () => {
      const a = generateCsrfToken({ secure: false });
      const b = generateCsrfToken({ secure: false });
      expect(a.token).not.toBe(b.token);
    });

    it('respects sameSite option', () => {
      const result = generateCsrfToken({ secure: false, sameSite: 'lax' });
      expect(result.cookie).toContain('SameSite=lax');
    });
  });

  describe('validateCsrfToken', () => {
    it('returns true for matching tokens', () => {
      const { token } = generateCsrfToken({ secure: false });
      expect(validateCsrfToken(token, token)).toBe(true);
    });

    it('returns false for mismatched tokens', () => {
      const a = generateCsrfToken({ secure: false });
      const b = generateCsrfToken({ secure: false });
      expect(validateCsrfToken(a.token, b.token)).toBe(false);
    });

    it('returns false for null cookie token', () => {
      expect(validateCsrfToken(null, 'something')).toBe(false);
    });

    it('returns false for undefined header token', () => {
      expect(validateCsrfToken('something', undefined)).toBe(false);
    });

    it('returns false for empty strings', () => {
      expect(validateCsrfToken('', '')).toBe(false);
    });

    it('returns false for tokens of different lengths', () => {
      expect(validateCsrfToken('short', 'muchlongertoken')).toBe(false);
    });

    it('uses timing-safe comparison (no early exit on mismatch)', () => {
      // We can't truly verify timing safety in a unit test, but we confirm
      // the function handles edge cases without throwing.
      const token = 'a'.repeat(64);
      const almost = 'a'.repeat(63) + 'b';
      expect(validateCsrfToken(token, almost)).toBe(false);
    });
  });
});
