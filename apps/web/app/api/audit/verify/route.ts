import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePerm, verifyAuditSignature } from '@cveriskpilot/auth';
import {
  createInMemoryStorage,
  hashLeaf,
  verifyInclusionProof,
  type MerkleInclusionProof,
} from '@cveriskpilot/auth';

/**
 * POST /api/audit/verify — Verify a specific audit entry's cryptographic signature
 * and optional Merkle inclusion proof.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const permError = requirePerm(session.role, 'audit:read');
    if (permError) return permError;

    const body = (await request.json()) as { auditEntryId: string };
    if (!body.auditEntryId) {
      return NextResponse.json({ error: 'auditEntryId is required' }, { status: 400 });
    }

    // Fetch the audit entry (org-scoped)
    const auditEntry = await prisma.auditLog.findFirst({
      where: { id: body.auditEntryId, organizationId: session.organizationId },
    });

    if (!auditEntry) {
      return NextResponse.json({ error: 'Audit entry not found' }, { status: 404 });
    }

    // Fetch the signature
    const sig = await prisma.auditSignature.findUnique({
      where: { auditEntryId: body.auditEntryId },
    });

    if (!sig) {
      return NextResponse.json({
        verified: false,
        signatureExists: false,
        message: 'No cryptographic signature found for this audit entry',
      });
    }

    // Verify the signature
    const signatureValid = await verifyAuditSignature(
      sig.entryHash,
      {
        signature: sig.signature,
        keyVersion: sig.keyVersion,
        entryHash: sig.entryHash,
        signedAt: sig.createdAt.toISOString(),
      },
      session.organizationId,
    );

    // Check Merkle inclusion if leaf index exists
    let merkleValid: boolean | null = null;
    let merkleProof: MerkleInclusionProof | null = null;

    if (sig.leafIndex !== null) {
      // Build proof from stored Merkle nodes
      const treeState = await prisma.merkleTreeState.findUnique({
        where: { organizationId: session.organizationId },
      });

      if (treeState) {
        // Create a storage adapter backed by the database
        const nodes = await prisma.merkleNode.findMany({
          where: { organizationId: session.organizationId },
        });

        const storage = createInMemoryStorage();
        for (const node of nodes) {
          await storage.putNode(session.organizationId, node.level, node.position, node.hash);
        }
        await storage.setLeafCount(session.organizationId, treeState.leafCount);

        // Import and generate proof
        const { generateInclusionProof } = await import('@cveriskpilot/auth');
        merkleProof = await generateInclusionProof(storage, session.organizationId, sig.leafIndex);

        if (merkleProof) {
          const leafHash = hashLeaf(sig.entryHash);
          merkleValid = verifyInclusionProof(leafHash, merkleProof);
        }
      }
    }

    return NextResponse.json({
      verified: signatureValid && (merkleValid === null || merkleValid),
      signatureValid,
      merkleValid,
      merkleProof,
      signature: {
        keyVersion: sig.keyVersion,
        signedAt: sig.createdAt.toISOString(),
        leafIndex: sig.leafIndex,
      },
    });
  } catch (error) {
    console.error('[API] POST /api/audit/verify error:', error);
    return NextResponse.json({ error: 'Failed to verify audit entry' }, { status: 500 });
  }
}
