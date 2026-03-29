// Audit logging data structures with SHA-256 tamper-detection hashing
// This module creates audit entry objects — actual persistence is handled by
// the service layer.

import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditParams {
  organizationId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorIp?: string;
  details?: Record<string, unknown>;
  /** Hash of the previous audit entry for hash-chain integrity */
  previousHash?: string;
}

export interface AuditEntry {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorIp?: string;
  details?: Record<string, unknown>;
  timestamp: string; // ISO 8601
  previousHash?: string;
  /** SHA-256 hash of all entry fields for tamper detection */
  hash: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute a deterministic SHA-256 hash of the audit entry's content fields.
 * The `hash` field itself is excluded from the computation.
 */
function computeHash(entry: Omit<AuditEntry, 'hash'>): string {
  const payload = JSON.stringify({
    id: entry.id,
    organizationId: entry.organizationId,
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    actorId: entry.actorId,
    actorIp: entry.actorIp,
    details: entry.details,
    timestamp: entry.timestamp,
    previousHash: entry.previousHash,
  });

  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new audit entry with a tamper-detection hash.
 *
 * If `previousHash` is provided in `params`, it is included in the hash
 * computation, forming a hash chain across consecutive entries.
 */
export function createAuditEntry(params: AuditParams): AuditEntry {
  const partial: Omit<AuditEntry, 'hash'> = {
    id: crypto.randomUUID(),
    organizationId: params.organizationId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    actorId: params.actorId,
    actorIp: params.actorIp,
    details: params.details,
    timestamp: new Date().toISOString(),
    previousHash: params.previousHash,
  };

  return {
    ...partial,
    hash: computeHash(partial),
  };
}

/**
 * Verify that an audit entry's hash matches its content.
 * Returns `false` if the entry has been tampered with.
 */
export function verifyAuditEntry(entry: AuditEntry): boolean {
  const { hash, ...rest } = entry;
  const expected = computeHash(rest);
  // Use timing-safe comparison to prevent timing attacks on hash verification
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'utf-8'),
      Buffer.from(expected, 'utf-8'),
    );
  } catch {
    return false;
  }
}
