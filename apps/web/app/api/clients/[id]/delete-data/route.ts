import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// POST /api/clients/[id]/delete-data — GDPR/CCPA client data deletion
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { id: clientId } = await params;
    const body = await request.json();

    const { confirmationText, reason } = body;

    // Fetch the client (scoped to org)
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId: session.organizationId },
      select: { id: true, name: true, organizationId: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Validate confirmation text
    const expectedConfirmation = `DELETE ${client.name}`;
    if (confirmationText !== expectedConfirmation) {
      return NextResponse.json(
        {
          error: 'Confirmation text does not match',
          expected: expectedConfirmation,
        },
        { status: 400 },
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'A reason with at least 5 characters is required' },
        { status: 400 },
      );
    }

    // Count records that will be affected
    const [findingsCount, casesCount, assetsCount, artifactsCount, commentsCount] =
      await Promise.all([
        prisma.finding.count({ where: { clientId } }),
        prisma.vulnerabilityCase.count({ where: { clientId } }),
        prisma.asset.count({ where: { clientId } }),
        prisma.scanArtifact.count({ where: { clientId } }),
        prisma.comment.count({
          where: { vulnerabilityCase: { clientId } },
        }),
      ]);

    const now = new Date();

    // Soft-delete: set deletedAt on the client and all assets
    await prisma.$transaction(async (tx: any) => {
      // Soft-delete assets
      await tx.asset.updateMany({
        where: { clientId, deletedAt: null },
        data: { deletedAt: now },
      });

      // Soft-delete comments
      await tx.comment.updateMany({
        where: { vulnerabilityCase: { clientId }, deletedAt: null },
        data: { deletedAt: now },
      });

      // Soft-delete the client itself
      await tx.client.update({
        where: { id: clientId },
        data: { deletedAt: now, isActive: false },
      });

      // Create audit log entries for the deletion
      await tx.auditLog.create({
        data: {
          organizationId: client.organizationId,
          entityType: 'Client',
          entityId: clientId,
          action: 'DELETE',
          actorId: session.userId,
          details: {
            reason,
            deletionType: 'GDPR_CCPA_CLIENT_DELETION',
            affectedRecords: {
              findings: findingsCount,
              cases: casesCount,
              assets: assetsCount,
              artifacts: artifactsCount,
              comments: commentsCount,
            },
            clientName: client.name,
            deletedAt: now.toISOString(),
          },
          hash: `del-${clientId}-${now.getTime()}`,
        },
      });
    });

    // Return deletion receipt
    return NextResponse.json({
      receipt: {
        clientId,
        clientName: client.name,
        deletedAt: now.toISOString(),
        reason,
        affectedRecords: {
          findings: findingsCount,
          cases: casesCount,
          assets: assetsCount,
          artifacts: artifactsCount,
          comments: commentsCount,
        },
        status: 'SOFT_DELETED',
        message:
          'Client data has been soft-deleted. Hard deletion will occur after the retention period expires.',
      },
    });
  } catch (error) {
    console.error('Client data deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete client data' },
      { status: 500 },
    );
  }
}
