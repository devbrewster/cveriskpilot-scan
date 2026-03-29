import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@cveriskpilot/auth';
import { UserRole } from '@cveriskpilot/domain';
import { prisma } from '@/lib/prisma';
import { SyncOrchestrator } from '@cveriskpilot/connectors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Roles allowed to trigger a manual sync */
const SYNC_ALLOWED_ROLES: Set<string> = new Set([
  UserRole.PLATFORM_ADMIN,
  UserRole.ORG_OWNER,
  UserRole.SECURITY_ADMIN,
  UserRole.ANALYST,
]);

/**
 * POST /api/connectors/[id]/sync
 * Trigger a manual sync for an API-based scanner connector.
 * Creates a SyncJob with PENDING status and returns the job ID.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    // Role check
    if (!SYNC_ALLOWED_ROLES.has(session.role)) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient role to trigger sync' },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid connector ID' },
        { status: 400 },
      );
    }

    // Load connector and verify org ownership
    const connector = await prisma.scannerConnector.findUnique({
      where: { id },
    });

    if (!connector) {
      return NextResponse.json(
        { error: 'Connector not found' },
        { status: 404 },
      );
    }

    if (connector.organizationId !== session.organizationId) {
      return NextResponse.json(
        { error: 'Connector not found' },
        { status: 404 },
      );
    }

    // Verify this is an API connector
    if (!connector.isApiConnector) {
      return NextResponse.json(
        { error: 'This connector is not an API connector. Manual sync is only available for API-based connectors.' },
        { status: 400 },
      );
    }

    // Check for an already-running sync job to prevent duplicate work
    const runningJob = await prisma.syncJob.findFirst({
      where: {
        connectorId: id,
        status: { in: ['PENDING', 'RUNNING', 'POLLING', 'DOWNLOADING', 'PROCESSING'] },
      },
    });

    if (runningJob) {
      return NextResponse.json(
        {
          error: 'A sync job is already in progress for this connector',
          existingJobId: runningJob.id,
          existingStatus: runningJob.status,
        },
        { status: 409 },
      );
    }

    // Enqueue the sync job
    const orchestrator = new SyncOrchestrator(prisma);
    const jobId = await orchestrator.enqueueSyncJob(id, 'MANUAL');

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        actorId: session.userId,
        action: 'CREATE',
        entityType: 'SyncJob',
        entityId: jobId,
        details: { connectorId: id, trigger: 'MANUAL' },
        hash: `sync-connector-${id}-${Date.now()}`,
      },
    });

    return NextResponse.json(
      { jobId, status: 'PENDING' },
      { status: 202 },
    );
  } catch (error) {
    console.error('[API] POST /api/connectors/[id]/sync error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 },
    );
  }
}
