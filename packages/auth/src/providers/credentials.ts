// Email/password credential authentication for CVERiskPilot
// Includes password hashing, validation, and account lockout

import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@cveriskpilot/domain';
import { UserStatus } from '@cveriskpilot/domain';

/** Number of bcrypt salt rounds */
const BCRYPT_SALT_ROUNDS = 14;

/** Maximum failed login attempts before lockout */
const MAX_FAILED_ATTEMPTS = 5;

/** Account lockout duration in minutes */
const LOCKOUT_DURATION_MINUTES = 30;

/** Minimum password length */
const MIN_PASSWORD_LENGTH = 12;

/** Result of a credential authentication attempt */
export interface CredentialAuthResult {
  success: boolean;
  userId?: string;
  organizationId?: string;
  error?: string;
}

/** Password validation result */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Hash a plaintext password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength.
 * Requirements: min 12 chars, mixed case, at least one number, at least one symbol.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Authenticate a user with email and password.
 * Handles account lockout after repeated failed attempts.
 */
export async function authenticateWithCredentials(
  prisma: PrismaClient,
  email: string,
  password: string,
): Promise<CredentialAuthResult> {
  // Find user by email (not soft-deleted)
  const user = await (prisma as any).user.findFirst({
    where: {
      email: email.toLowerCase().trim(),
      deletedAt: null,
    },
  });

  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Check if account is deactivated
  if (user.status === UserStatus.DEACTIVATED) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Check if account is locked
  if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    const minutesLeft = Math.ceil(
      (user.accountLockedUntil.getTime() - Date.now()) / (1000 * 60),
    );
    return {
      success: false,
      error: `Account is locked. Try again in ${minutesLeft} minute(s).`,
    };
  }

  // User must have a password hash for credential auth
  if (!user.passwordHash) {
    return {
      success: false,
      error: 'Invalid email or password',
    };
  }

  // Verify password
  const passwordValid = await verifyPassword(password, user.passwordHash);

  if (!passwordValid) {
    const newFailedCount = user.failedLoginCount + 1;
    const updateData: Record<string, unknown> = {
      failedLoginCount: newFailedCount,
    };

    // Lock account after MAX_FAILED_ATTEMPTS
    if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
      updateData.accountLockedUntil = new Date(
        Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000,
      );
    }

    await (prisma as any).user.update({
      where: { id: user.id },
      data: updateData,
    });

    const remaining = MAX_FAILED_ATTEMPTS - newFailedCount;
    if (remaining > 0) {
      return {
        success: false,
        error: `Invalid email or password. ${remaining} attempt(s) remaining before lockout.`,
      };
    }

    return {
      success: false,
      error: `Account locked due to too many failed attempts. Try again in ${LOCKOUT_DURATION_MINUTES} minutes.`,
    };
  }

  // Successful login: reset lockout counters and update last login
  await (prisma as any).user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      accountLockedUntil: null,
      lastLoginAt: new Date(),
      // Activate pending invite users on first successful login
      ...(user.status === UserStatus.PENDING_INVITE
        ? { status: UserStatus.ACTIVE }
        : {}),
    },
  });

  return {
    success: true,
    userId: user.id,
    organizationId: user.organizationId,
  };
}
