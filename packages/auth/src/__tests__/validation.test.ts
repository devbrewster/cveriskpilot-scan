import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  validateEmail,
  validateSlug,
  validateCveId,
  validateUUID,
  sanitizeFilename,
  validateFileSize,
  validateMimeType,
} from '../security/validation.js';

describe('sanitizeHtml', () => {
  it('strips simple HTML tags', () => {
    expect(sanitizeHtml('<b>bold</b>')).toBe('bold');
  });

  it('strips nested tags', () => {
    expect(sanitizeHtml('<div><p>text</p></div>')).toBe('text');
  });

  it('strips script tags', () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('leaves plain text unchanged', () => {
    expect(sanitizeHtml('hello world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('strips self-closing tags', () => {
    expect(sanitizeHtml('before<br/>after')).toBe('beforeafter');
  });
});

describe('validateEmail', () => {
  it.each([
    'user@example.com',
    'first.last@sub.domain.org',
    'user+tag@example.com',
    'u@x.co',
  ])('accepts valid email: %s', (email) => {
    expect(validateEmail(email)).toBe(true);
  });

  it.each([
    '',
    'notanemail',
    '@missing-local.com',
    'missing-domain@',
    'spaces in@here.com',
    'a'.repeat(255) + '@example.com', // too long
  ])('rejects invalid email: %s', (email) => {
    expect(validateEmail(email)).toBe(false);
  });
});

describe('validateSlug', () => {
  it.each([
    'acme-corp',
    'org',
    'a-b-c',
    'abc123',
    'my-org-2024',
  ])('accepts valid slug: %s', (slug) => {
    expect(validateSlug(slug)).toBe(true);
  });

  it.each([
    '',
    'ab',             // too short
    'AB',             // uppercase
    '-leading',       // leading hyphen
    'trailing-',      // trailing hyphen
    'has space',
    'a'.repeat(64),   // too long
    'UPPER',
  ])('rejects invalid slug: %s', (slug) => {
    expect(validateSlug(slug)).toBe(false);
  });
});

describe('validateCveId', () => {
  it.each([
    'CVE-2024-12345',
    'CVE-1999-00001',
    'CVE-2025-123456',
  ])('accepts valid CVE ID: %s', (id) => {
    expect(validateCveId(id)).toBe(true);
  });

  it.each([
    '',
    'CVE-2024-123',    // too few digits
    'cve-2024-12345',  // lowercase
    'CVE202412345',    // missing hyphens
    'CVE-24-12345',    // short year
    'GHSA-xxxx-yyyy',
  ])('rejects invalid CVE ID: %s', (id) => {
    expect(validateCveId(id)).toBe(false);
  });
});

describe('validateUUID', () => {
  it('accepts valid UUID v4', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts uppercase UUID v4', () => {
    expect(validateUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it.each([
    '',
    'not-a-uuid',
    '550e8400-e29b-31d4-a716-446655440000', // v3 not v4
    '550e8400e29b41d4a716446655440000',      // no hyphens
  ])('rejects invalid UUID: %s', (id) => {
    expect(validateUUID(id)).toBe(false);
  });
});

describe('sanitizeFilename', () => {
  it('removes path traversal', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('etcpasswd');
  });

  it('removes backslashes', () => {
    expect(sanitizeFilename('..\\..\\windows\\system32')).toBe('windowssystem32');
  });

  it('removes control characters', () => {
    expect(sanitizeFilename('file\x00name.txt')).toBe('filename.txt');
  });

  it('removes leading dots', () => {
    expect(sanitizeFilename('.hidden')).toBe('hidden');
  });

  it('returns "unnamed" for empty result', () => {
    expect(sanitizeFilename('...')).toBe('unnamed');
  });

  it('preserves normal filenames', () => {
    expect(sanitizeFilename('report-2024.pdf')).toBe('report-2024.pdf');
  });
});

describe('validateFileSize', () => {
  it('accepts file under limit', () => {
    expect(validateFileSize(1_000_000, 10)).toBe(true);
  });

  it('accepts file exactly at limit', () => {
    expect(validateFileSize(10 * 1024 * 1024, 10)).toBe(true);
  });

  it('rejects file over limit', () => {
    expect(validateFileSize(10 * 1024 * 1024 + 1, 10)).toBe(false);
  });

  it('rejects negative bytes', () => {
    expect(validateFileSize(-1, 10)).toBe(false);
  });

  it('rejects zero maxMB', () => {
    expect(validateFileSize(100, 0)).toBe(false);
  });
});

describe('validateMimeType', () => {
  it('accepts allowed MIME type', () => {
    expect(validateMimeType('application/pdf', ['application/pdf', 'text/csv'])).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(validateMimeType('Application/PDF', ['application/pdf'])).toBe(true);
  });

  it('rejects disallowed MIME type', () => {
    expect(validateMimeType('application/exe', ['application/pdf'])).toBe(false);
  });

  it('rejects empty MIME type', () => {
    expect(validateMimeType('', ['application/pdf'])).toBe(false);
  });

  it('rejects empty allowed list', () => {
    expect(validateMimeType('application/pdf', [])).toBe(false);
  });
});
