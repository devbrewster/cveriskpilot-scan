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

  // Update lastUsedAt (fire-and-forget for performance)
  (prisma as any).apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {
    // Ignore update errors — usage tracking is best-effort
  });

  return {
    valid: true,
    keyId: apiKey.id,
    organizationId: apiKey.organizationId,
    scope: apiKey.scope,
    assignedClients: apiKey.assignedClients,
  };
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
