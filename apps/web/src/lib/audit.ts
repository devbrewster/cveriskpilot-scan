import { prisma } from '@/lib/prisma';
import type { Prisma } from '@cveriskpilot/domain';
import {
  createAuditEntry,
  signAuditEntry,
  type AuditSignatureData,
} from '@cveriskpilot/auth';
import {
  appendLeaf,
  type MerkleStorage,
} from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// Prisma-backed Merkle storage
// ---------------------------------------------------------------------------

const prismaMerkleStorage: MerkleStorage = {
  async getNode(orgId, level, position) {
    const node = await prisma.merkleNode.findUnique({
      where: {
        organizationId_level_position: { organizationId: orgId, level, position },
      },
    });
    return node?.hash ?? null;
  },

  async putNode(orgId, level, position, hash) {
    await prisma.merkleNode.upsert({
      where: {
        organizationId_level_position: { organizationId: orgId, level, position },
      },
      update: { hash },
      create: { organizationId: orgId, level, position, hash },
    });
  },

  async getLeafCount(orgId) {
    const state = await prisma.merkleTreeState.findUnique({
      where: { organizationId: orgId },
    });
    return state?.leafCount ?? 0;
  },

  async setLeafCount(orgId, count) {
    await prisma.merkleTreeState.upsert({
      where: { organizationId: orgId },
      update: { leafCount: count },
      create: { organizationId: orgId, leafCount: count },
    });
  },
};

// ---------------------------------------------------------------------------
// Tier check for Vault Protocol (FOUNDERS_BETA+ only)
// ---------------------------------------------------------------------------

const VAULT_ENABLED_TIERS = new Set([
  'FOUNDERS_BETA',
  'PRO',
  'ENTERPRISE',
  'MSSP',
]);

async function isVaultEnabled(orgId: string): Promise<boolean> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { tier: true },
    });
    return org ? VAULT_ENABLED_TIERS.has(org.tier) : false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Vault Protocol: sign + append to Merkle tree (fire-and-forget)
// ---------------------------------------------------------------------------

async function signAndAppend(
  auditLogId: string,
  entryHash: string,
  orgId: string,
): Promise<void> {
  try {
    // Sign the audit entry
    const entry = { hash: entryHash } as Parameters<typeof signAuditEntry>[0];
    const sigData: AuditSignatureData = await signAuditEntry(entry, orgId);

    // Append to Merkle tree
    const { rootHash, leafIndex } = await appendLeaf(
      prismaMerkleStorage,
      orgId,
      entryHash,
    );

    // Update root hash
    await prisma.merkleTreeState.upsert({
      where: { organizationId: orgId },
      update: { rootHash },
      create: { organizationId: orgId, leafCount: 1, rootHash },
    });

    // Store the signature with leaf index
    await prisma.auditSignature.create({
      data: {
        organizationId: orgId,
        auditEntryId: auditLogId,
        entryHash: sigData.entryHash,
        signature: sigData.signature,
        keyVersion: sigData.keyVersion,
        leafIndex,
      },
    });
  } catch (err) {
    // Fire-and-forget: signing failures must not block audit logging
    console.error('[vault] Failed to sign/append audit entry:', err);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Lightweight audit log helper for API routes.
 * Persists an audit entry to the AuditLog table with a tamper-detection hash.
 * For paid tiers (FOUNDERS_BETA+), also creates a cryptographic signature
 * and appends to the org's Merkle tree (Vault Protocol).
 *
 * Fire-and-forget by default — failures are logged but do not propagate.
 */
export async function logAudit(params: {
  organizationId: string;
  actorId: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'STATE_CHANGE' | 'RISK_EXCEPTION' | 'EXPORT' | 'LOGIN' | 'LOGOUT';
  entityType: string;
  entityId: string;
  details?: Prisma.InputJsonValue;
  actorIp?: string;
}): Promise<void> {
  try {
    // Create the audit entry with hash-chain integrity
    const auditEntry = createAuditEntry({
      organizationId: params.organizationId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      actorId: params.actorId,
      actorIp: params.actorIp,
      details: params.details as Record<string, unknown> | undefined,
    });

    const created = await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details ?? {},
        actorIp: params.actorIp,
        hash: auditEntry.hash,
      },
    });

    // Vault Protocol: sign + Merkle append for paid tiers (async, non-blocking)
    const vaultEnabled = await isVaultEnabled(params.organizationId);
    if (vaultEnabled) {
      // Don't await — fire-and-forget to avoid slowing down the API response
      signAndAppend(created.id, auditEntry.hash, params.organizationId).catch((err) => {
        console.error('[vault] Background signing failed:', err);
      });
    }
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err);
  }
}
