import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requirePerm,
  getOrgPublicKey,
  createInMemoryStorage,
  generateInclusionProof,
} from '@cveriskpilot/auth';
import { logAudit } from '@/lib/audit';

/**
 * GET /api/audit/export-signed — Export a signed audit package.
 * Returns all audit entries with their signatures and Merkle proofs.
 * Query params: ?from=ISO&to=ISO&limit=1000
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const permError = requirePerm(session.role, 'audit:read');
    if (permError) return permError;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '1000', 10), 5000);

    // Fetch audit entries with signatures (org-scoped)
    const entries = await prisma.auditLog.findMany({
      where: {
        organizationId: session.organizationId,
        ...(from && { createdAt: { gte: new Date(from) } }),
        ...(to && { createdAt: { lte: new Date(to) } }),
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    const entryIds = entries.map((e) => e.id);

    // Fetch all signatures for these entries
    const signatures = await prisma.auditSignature.findMany({
      where: { auditEntryId: { in: entryIds } },
    });

    const sigMap = new Map(signatures.map((s) => [s.auditEntryId, s]));

    // Load Merkle tree for proof generation
    const treeState = await prisma.merkleTreeState.findUnique({
      where: { organizationId: session.organizationId },
    });

    let storage: Awaited<ReturnType<typeof createInMemoryStorage>> | null = null;

    if (treeState && treeState.leafCount > 0) {
      const nodes = await prisma.merkleNode.findMany({
        where: { organizationId: session.organizationId },
      });
      storage = createInMemoryStorage();
      for (const node of nodes) {
        await storage.putNode(session.organizationId, node.level, node.position, node.hash);
      }
      await storage.setLeafCount(session.organizationId, treeState.leafCount);
    }

    // Build the export package
    const signedEntries = await Promise.all(
      entries.map(async (entry) => {
        const sig = sigMap.get(entry.id);
        let merkleProof = null;

        if (sig?.leafIndex !== null && sig?.leafIndex !== undefined && storage) {
          const proof = await generateInclusionProof(
            storage,
            session.organizationId,
            sig.leafIndex,
          );
          if (proof) {
            merkleProof = proof;
          }
        }

        return {
          entry: {
            id: entry.id,
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            actorId: entry.actorId,
            details: entry.details,
            hash: entry.hash,
            createdAt: entry.createdAt.toISOString(),
          },
          signature: sig
            ? {
                signature: sig.signature,
                keyVersion: sig.keyVersion,
                entryHash: sig.entryHash,
                signedAt: sig.createdAt.toISOString(),
                leafIndex: sig.leafIndex,
              }
            : null,
          merkleProof,
        };
      }),
    );

    // Get public key for independent verification
    let publicKey: string | null = null;
    try {
      publicKey = await getOrgPublicKey(session.organizationId);
    } catch {
      // Non-fatal
    }

    const exportPackage = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      organizationId: session.organizationId,
      merkleRoot: treeState?.rootHash ?? null,
      merkleLeafCount: treeState?.leafCount ?? 0,
      publicKey,
      entries: signedEntries,
      totalEntries: signedEntries.length,
      signedEntries: signedEntries.filter((e) => e.signature !== null).length,
    };

    // Log the export action
    logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: 'EXPORT',
      entityType: 'AuditTrail',
      entityId: session.organizationId,
      details: { entriesExported: signedEntries.length, from, to },
    });

    return NextResponse.json(exportPackage, {
      headers: {
        'Content-Disposition': `attachment; filename="audit-export-${session.organizationId}-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error('[API] GET /api/audit/export-signed error:', error);
    return NextResponse.json({ error: 'Failed to export signed audit trail' }, { status: 500 });
  }
}
