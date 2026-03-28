import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import {
  isPasswordExpired,
  isPasswordReused,
  sha1Prefix,
  isPasswordBreached,
  checkPasswordPolicy,
} from '../security/password-policy';

// ---------------------------------------------------------------------------
// Password Expiry
// ---------------------------------------------------------------------------

describe('isPasswordExpired', () => {
  it('exempts SSO users (no passwordHash)', () => {
    const result = isPasswordExpired({ passwordHash: null }, 90);
    expect(result.expired).toBe(false);
    expect(result.daysRemaining).toBe(90);
    expect(result.changedAt).toBeNull();
  });

  it('returns not-expired when expiryDays is 0 (disabled)', () => {
    const result = isPasswordExpired(
      { passwordHash: 'hash', passwordChangedAt: new Date() },
      0,
    );
    expect(result.expired).toBe(false);
    expect(result.daysRemaining).toBe(Infinity);
  });

  it('treats missing passwordChangedAt as expired', () => {
    const result = isPasswordExpired(
      { passwordHash: 'hash', passwordChangedAt: null },
      90,
    );
    expect(result.expired).toBe(true);
    expect(result.daysRemaining).toBe(0);
    expect(result.changedAt).toBeNull();
  });

  it('returns expired when password is older than expiryDays', () => {
    const changedAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
    const result = isPasswordExpired(
      { passwordHash: 'hash', passwordChangedAt: changedAt },
      90,
    );
    expect(result.expired).toBe(true);
    expect(result.daysRemaining).toBe(0);
    expect(result.changedAt).toEqual(changedAt);
  });

  it('returns not-expired when password is within expiryDays', () => {
    const changedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    const result = isPasswordExpired(
      { passwordHash: 'hash', passwordChangedAt: changedAt },
      90,
    );
    expect(result.expired).toBe(false);
    expect(result.daysRemaining).toBeGreaterThan(0);
    expect(result.daysRemaining).toBeLessThanOrEqual(80);
  });

  it('defaults to 90 days when expiryDays is omitted', () => {
    const changedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const result = isPasswordExpired({
      passwordHash: 'hash',
      passwordChangedAt: changedAt,
    });
    expect(result.expired).toBe(false);
    expect(result.daysRemaining).toBeGreaterThan(70);
  });
});

// ---------------------------------------------------------------------------
// Password History (reuse prevention)
// ---------------------------------------------------------------------------

describe('isPasswordReused', () => {
  const HASH_ROUNDS = 4; // fast rounds for tests

  it('returns false when history is empty', async () => {
    const result = await isPasswordReused('newPassword!1', []);
    expect(result).toBe(false);
  });

  it('returns true when password matches a previous hash', async () => {
    const hash = await bcrypt.hash('OldPassword!1', HASH_ROUNDS);
    const result = await isPasswordReused('OldPassword!1', [
      { passwordHash: hash },
    ]);
    expect(result).toBe(true);
  });

  it('returns false when password does not match any previous hash', async () => {
    const hash = await bcrypt.hash('OldPassword!1', HASH_ROUNDS);
    const result = await isPasswordReused('CompletelyNew!1', [
      { passwordHash: hash },
    ]);
    expect(result).toBe(false);
  });

  it('respects depth parameter', async () => {
    const hash1 = await bcrypt.hash('First!1', HASH_ROUNDS);
    const hash2 = await bcrypt.hash('Second!1', HASH_ROUNDS);
    const hash3 = await bcrypt.hash('Third!1', HASH_ROUNDS);

    // depth=2 should only check the first 2 entries
    const result = await isPasswordReused(
      'Third!1',
      [
        { passwordHash: hash1 },
        { passwordHash: hash2 },
        { passwordHash: hash3 },
      ],
      2,
    );
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// HIBP - SHA-1 prefix/suffix
// ---------------------------------------------------------------------------

describe('sha1Prefix', () => {
  it('generates correct SHA-1 prefix and suffix for "password"', () => {
    // SHA-1 of "password" = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    const result = sha1Prefix('password');
    expect(result.prefix).toBe('5BAA6');
    expect(result.suffix).toBe('1E4C9B93F3F0682250B6CF8331B7EE68FD8');
  });

  it('prefix is always 5 chars', () => {
    const result = sha1Prefix('any-password-here');
    expect(result.prefix).toHaveLength(5);
  });

  it('suffix is always 35 chars', () => {
    const result = sha1Prefix('test123');
    expect(result.suffix).toHaveLength(35);
  });

  it('output is uppercase hex', () => {
    const result = sha1Prefix('hello');
    expect(result.prefix).toMatch(/^[0-9A-F]+$/);
    expect(result.suffix).toMatch(/^[0-9A-F]+$/);
  });
});

// ---------------------------------------------------------------------------
// HIBP - isPasswordBreached
// ---------------------------------------------------------------------------

describe('isPasswordBreached', () => {
  const originalEnv = process.env.HIBP_ENABLED;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.HIBP_ENABLED;
    } else {
      process.env.HIBP_ENABLED = originalEnv;
    }
  });

  it('returns false when HIBP_ENABLED is "false"', async () => {
    process.env.HIBP_ENABLED = 'false';
    const result = await isPasswordBreached('password');
    expect(result).toBe(false);
  });

  it('returns true when password hash suffix is found in HIBP response', async () => {
    delete process.env.HIBP_ENABLED;
    const suffix = '1E4C9B93F3F0682250B6CF8331B7EE68FD8';
    const mockResponse = `${suffix}:3861493\r\nABCDEF1234567890ABCDEF1234567890ABC:5\r\n`;

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(mockResponse, { status: 200 }),
    );

    const result = await isPasswordBreached('password');
    expect(result).toBe(true);
  });

  it('returns false when password hash suffix is NOT in HIBP response', async () => {
    delete process.env.HIBP_ENABLED;
    const mockResponse =
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:10\r\nBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB:2\r\n';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(mockResponse, { status: 200 }),
    );

    const result = await isPasswordBreached('unique-strong-password-12345!');
    expect(result).toBe(false);
  });

  it('fails open on network error', async () => {
    delete process.env.HIBP_ENABLED;
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new Error('Network error'),
    );

    const result = await isPasswordBreached('password');
    expect(result).toBe(false);
  });

  it('fails open on non-200 response', async () => {
    delete process.env.HIBP_ENABLED;
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Service unavailable', { status: 503 }),
    );

    const result = await isPasswordBreached('password');
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Aggregate checkPasswordPolicy
// ---------------------------------------------------------------------------

describe('checkPasswordPolicy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty array when all checks pass', async () => {
    // No history, mock HIBP as clean
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('AAAA:1\r\n', { status: 200 }),
    );

    const violations = await checkPasswordPolicy('SuperSecure!99', []);
    expect(violations).toEqual([]);
  });

  it('returns REUSED violation when password matches history', async () => {
    const hash = await bcrypt.hash('ReusedPass!1', 4);

    // Mock HIBP as clean
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('AAAA:1\r\n', { status: 200 }),
    );

    const violations = await checkPasswordPolicy('ReusedPass!1', [
      { passwordHash: hash },
    ]);
    expect(violations).toContainEqual(
      expect.objectContaining({ code: 'REUSED' }),
    );
  });

  it('returns BREACHED violation when HIBP reports a match', async () => {
    const suffix = sha1Prefix('password').suffix;
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(`${suffix}:9999\r\n`, { status: 200 }),
    );

    const violations = await checkPasswordPolicy('password', []);
    expect(violations).toContainEqual(
      expect.objectContaining({ code: 'BREACHED' }),
    );
  });

  it('skips breach check when checkBreach is false', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const violations = await checkPasswordPolicy('password', [], {
      checkBreach: false,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(violations).toEqual([]);
  });
});
