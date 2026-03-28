// Password policy enforcement for CVERiskPilot
// Includes expiry checking, password history (reuse prevention), and
// HIBP breach checking via k-anonymity API.

import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HIBP_API = 'https://api.pwnedpasswords.com/range/';
const HIBP_TIMEOUT_MS = 3_000;
const DEFAULT_EXPIRY_DAYS = 90;
const DEFAULT_HISTORY_DEPTH = 5;

// ---------------------------------------------------------------------------
// Password Expiry
// ---------------------------------------------------------------------------

export interface PasswordExpiryConfig {
  /** Number of days before a password expires. 0 = never expire. */
  expiryDays?: number;
}

export interface PasswordExpiryResult {
  expired: boolean;
  daysRemaining: number;
  changedAt: Date | null;
}

/**
 * Check whether a user's password has expired.
 *
 * - SSO-only users (no `passwordHash`) are exempt.
 * - Users who have never set `passwordChangedAt` are treated as expired.
 * - `expiryDays <= 0` disables expiry entirely.
 */
export function isPasswordExpired(
  user: { passwordHash?: string | null; passwordChangedAt?: Date | null },
  expiryDays: number = DEFAULT_EXPIRY_DAYS,
): PasswordExpiryResult {
  // SSO users (no password) are exempt
  if (!user.passwordHash) {
    return { expired: false, daysRemaining: expiryDays, changedAt: null };
  }

  // Expiry disabled (0 = never expire)
  if (expiryDays <= 0) {
    return {
      expired: false,
      daysRemaining: Infinity,
      changedAt: user.passwordChangedAt ?? null,
    };
  }

  // Never set = expired
  if (!user.passwordChangedAt) {
    return { expired: true, daysRemaining: 0, changedAt: null };
  }

  const now = new Date();
  const expiresAt = new Date(
    user.passwordChangedAt.getTime() + expiryDays * 24 * 60 * 60 * 1000,
  );
  const msRemaining = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.max(
    0,
    Math.ceil(msRemaining / (24 * 60 * 60 * 1000)),
  );

  return {
    expired: msRemaining <= 0,
    daysRemaining,
    changedAt: user.passwordChangedAt,
  };
}

// ---------------------------------------------------------------------------
// Password History (reuse prevention)
// ---------------------------------------------------------------------------

export interface PasswordHistoryEntry {
  passwordHash: string;
}

/**
 * Check whether `newPassword` matches any of the given previous password
 * hashes. Returns `true` if the password was recently used (and should be
 * rejected).
 *
 * Accepts a pre-fetched array so callers can use any data source (Prisma,
 * in-memory, etc.) without coupling this module to a specific ORM.
 */
export async function isPasswordReused(
  newPassword: string,
  previousHashes: PasswordHistoryEntry[],
  depth: number = DEFAULT_HISTORY_DEPTH,
): Promise<boolean> {
  const entries = previousHashes.slice(0, depth);

  for (const entry of entries) {
    const matches = await bcrypt.compare(newPassword, entry.passwordHash);
    if (matches) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// HIBP Breach Checking (k-anonymity)
// ---------------------------------------------------------------------------

/**
 * Compute the SHA-1 hash of a password and split it into the 5-character
 * prefix (sent to HIBP) and the remaining 35-character suffix (compared
 * locally).
 *
 * Exported for testing.
 */
export function sha1Prefix(password: string): {
  prefix: string;
  suffix: string;
} {
  const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
  return { prefix: sha1.slice(0, 5), suffix: sha1.slice(5) };
}

/**
 * Check if a password has appeared in known data breaches using the
 * HaveIBeenPwned Passwords API with k-anonymity.
 *
 * Only the first 5 hex characters of the SHA-1 hash are sent to the API.
 * The full hash never leaves the server.
 *
 * Behaviour:
 * - Returns `false` when `HIBP_ENABLED` env var is `"false"`.
 * - Fails open (returns `false`) on network errors or non-200 responses so
 *   user registration/login is not blocked by an external service outage.
 */
export async function isPasswordBreached(password: string): Promise<boolean> {
  if (process.env.HIBP_ENABLED === 'false') return false;

  try {
    const { prefix, suffix } = sha1Prefix(password);

    const response = await fetch(`${HIBP_API}${prefix}`, {
      headers: { 'User-Agent': 'CVERiskPilot-PasswordCheck' },
      signal: AbortSignal.timeout(HIBP_TIMEOUT_MS),
    });

    if (!response.ok) return false;

    const text = await response.text();
    // Response format: SUFFIX:COUNT\r\n per line
    const lines = text.split('\r\n');
    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix === suffix && parseInt(countStr, 10) > 0) {
        return true;
      }
    }

    return false;
  } catch {
    // Fail-open: don't block authentication if HIBP is unreachable
    return false;
  }
}

// ---------------------------------------------------------------------------
// Aggregate policy check
// ---------------------------------------------------------------------------

export interface PasswordPolicyViolation {
  code: 'EXPIRED' | 'REUSED' | 'BREACHED';
  message: string;
}

export interface PasswordPolicyConfig {
  expiryDays?: number;
  historyDepth?: number;
  checkBreach?: boolean;
}

/**
 * Run all password-policy checks for a password change operation and return
 * any violations found.
 *
 * This is a convenience wrapper — callers may also invoke the individual
 * functions directly for finer control.
 */
export async function checkPasswordPolicy(
  newPassword: string,
  previousHashes: PasswordHistoryEntry[],
  config: PasswordPolicyConfig = {},
): Promise<PasswordPolicyViolation[]> {
  const {
    historyDepth = DEFAULT_HISTORY_DEPTH,
    checkBreach = true,
  } = config;

  const violations: PasswordPolicyViolation[] = [];

  // History check
  if (previousHashes.length > 0) {
    const reused = await isPasswordReused(newPassword, previousHashes, historyDepth);
    if (reused) {
      violations.push({
        code: 'REUSED',
        message: `Password must not match any of your last ${historyDepth} passwords`,
      });
    }
  }

  // Breach check
  if (checkBreach) {
    const breached = await isPasswordBreached(newPassword);
    if (breached) {
      violations.push({
        code: 'BREACHED',
        message:
          'This password has appeared in a known data breach. Please choose a different password.',
      });
    }
  }

  return violations;
}
