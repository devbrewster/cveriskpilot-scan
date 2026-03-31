import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePerm, getOrgPublicKey } from '@cveriskpilot/auth';

/**
 * GET /api/audit/root — Return the current Merkle root hash for the org.
 * This root can be independently verified against the full audit trail.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const permError = requirePerm(session.role, 'audit:read');
    if (permError) return permError;

    const treeState = await prisma.merkleTreeState.findUnique({
      where: { organizationId: session.organizationId },
    });

    if (!treeState || !treeState.rootHash) {
      return NextResponse.json({
        rootHash: null,
        leafCount: 0,
        message: 'No cryptographic audit trail exists yet',
      });
    }

    // Get the public key for external verification
    let publicKeyPem: string | null = null;
    try {
      publicKeyPem = await getOrgPublicKey(session.organizationId);
    } catch {
      // Public key retrieval failed — non-fatal
    }

    return NextResponse.json({
      rootHash: treeState.rootHash,
      leafCount: treeState.leafCount,
      updatedAt: treeState.updatedAt.toISOString(),
      publicKey: publicKeyPem,
    });
  } catch (error) {
    console.error('[API] GET /api/audit/root error:', error);
    return NextResponse.json({ error: 'Failed to get audit root' }, { status: 500 });
  }
}
