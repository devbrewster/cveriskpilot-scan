import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ id: string; jobId: string }>;
}

/**
 * GET /api/connectors/[id]/sync-history/[jobId]
 * Fetch a single SyncJob with its SyncLog entries.
 * Verifies the connector ownership chain (org -> connector -> job).
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { id, jobId } = await context.params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid connector ID' },
        { status: 400 },
      );
    }

    if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid job ID' },
        { status: 400 },
      );
    }

    // Verify connector exists and belongs to this org
    const connector = await prisma.scannerConnector.findFirst({
      where: { id, organizationId: session.organizationId },
      select: { id: true, organizationId: true },
    });

    if (!connector) {
      return NextResponse.json(
        { error: 'Connector not found' },
        { status: 404 },
      );
    }

    // Fetch the sync job, verifying it belongs to this connector
    const job = await prisma.syncJob.findFirst({
      where: {
        id: jobId,
        connectorId: id,
        organizationId: session.organizationId,
      },
      include: {
        logs: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            level: true,
            message: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Sync job not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('[API] GET /api/connectors/[id]/sync-history/[jobId] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync job details' },
      { status: 500 },
    );
  }
}
