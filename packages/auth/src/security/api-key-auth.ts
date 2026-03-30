// API key authentication for CVERiskPilot
// Validates API keys, checks expiry and scopes, updates usage tracking

import type { PrismaClient } from '@cveriskpilot/domain';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiKeyValidationResult {
  valid: boolean;
  keyId?: string;
  organizationId?: string;
  scope?: string;
  assignedClients?: string[];
  error?: string;
  rotationRequired?: boolean;
  rotationRequiredBy?: string;
  expiringWithinDays?: number;
}

export interface GeneratedApiKey {
  id: string;
  key: string; // Full plaintext key — returned ONCE at creation time
  keyHash: string;
  keyPrefix: string; // e.g., "crp_acme_****abcd"
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Hash an API key using SHA-256.
 * Keys must always be hashed before storage.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a new API key with the format: crp_{orgSlug}_{random32chars}
 */
export function generateApiKey(orgSlug: string): GeneratedApiKey {
  const randomPart = crypto.randomBytes(24).toString('base64url').slice(0, 32);
  const key = `crp_${orgSlug}_${randomPart}`;
  const keyHash = hashApiKey(key);
  const last4 = key.slice(-4);
  const keyPrefix = `crp_****${last4}`;

  return {
    id: '', // Caller sets after DB insert
    key,
    keyHash,
    keyPrefix,
  };
}

/**
 * Mask an API key for display: crp_****{last4}
 */
export function maskApiKey(key: string): string {
  const last4 = key.slice(-4);
  return `crp_****${last4}`;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate an API key against the database.
 * Checks:
 *   1. Key exists (via SHA-256 hash lookup)
 *   2. Key has not expired
 *   3. Organization is active
 * On success, updates lastUsedAt.
 */
export async function validateApiKey(
  prisma: PrismaClient,
  key: string,
): Promise<ApiKeyValidationResult> {
  if (!key || !key.startsWith('crp_')) {
    return { valid: false, error: 'Invalid API key format' };
  }

  const keyHash = hashApiKey(key);

  const apiKey = await (prisma as any).apiKey.findFirst({
    where: { keyHash },
    include: {
      organization: {
        select: { id: true, deletedAt: true },
      },
    },
  });

  if (!apiKey) {
    return { valid: false, error: 'API key not found' };
  }

  // Check if the organization is soft-deleted
  if (apiKey.organization?.deletedAt) {
    return { valid: false, error: 'Organization is deactivated' };
  }

  // Check expiry
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) <= new Date()) {
    return { valid: false, error: 'API key has expired' };
  }

  // Check rotation policy
  if (apiKey.rotationRequiredBy && new Date(apiKey.rotationRequiredBy) <= new Date()) {
    return { valid: false, error: 'API key rotation required. Please rotate this key.' };
  }

  // Update lastUsedAt and increment requestCount (fire-and-forget for performance)
  (prisma as any).apiKey.update({
    where: { id: apiKey.id },
    data: {
      lastUsedAt: new Date(),
      requestCount: { increment: 1 },
    },
  }).catch(() => {
    // Ignore update errors — usage tracking is best-effort
  });

  // Build result with optional warnings
  const result: ApiKeyValidationResult = {
    valid: true,
    keyId: apiKey.id,
    organizationId: apiKey.organizationId,
    scope: apiKey.scope,
    assignedClients: apiKey.assignedClients,
  };

  // Rotation approaching warning (within 7 days)
  if (apiKey.rotationRequiredBy) {
    const rotationDate = new Date(apiKey.rotationRequiredBy);
    const msUntilRotation = rotationDate.getTime() - Date.now();
    const daysUntilRotation = msUntilRotation / (1000 * 60 * 60 * 24);
    if (daysUntilRotation <= 7) {
      result.rotationRequired = true;
      result.rotationRequiredBy = rotationDate.toISOString();
    }
  }

  // Expiry approaching warning (within 14 days)
  // Callers can use this to add X-Api-Key-Expires-In response header
  if (apiKey.expiresAt) {
    const expiryDate = new Date(apiKey.expiresAt);
    const msUntilExpiry = expiryDate.getTime() - Date.now();
    const daysUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 14) {
      result.expiringWithinDays = daysUntilExpiry;
    }
  }

  return result;
}

/**
 * Check if an API key's scope allows a specific action.
 * Scopes are comma-separated: "upload,read" or "admin" (full access).
 */
export function hasScope(scope: string, requiredScope: string): boolean {
  if (scope === 'admin') return true;
  const scopes = scope.split(',').map((s) => s.trim());
  return scopes.includes(requiredScope);
}

/**
 * Record an API key error (fire-and-forget).
 * Increments errorCount and sets lastErrorAt.
 */
export function recordApiKeyError(prisma: PrismaClient, keyId: string): void {
  (prisma as any).apiKey.update({
    where: { id: keyId },
    data: {
      errorCount: { increment: 1 },
      lastErrorAt: new Date(),
    },
  }).catch(() => {
    // Best-effort error tracking
  });
}
