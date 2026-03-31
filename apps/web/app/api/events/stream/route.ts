// Signal Engine — GET /api/events/stream
//
// Real-time SSE feed for continuous ingestion events.
// Clients connect via EventSource and receive finding/scan events
// as they arrive from the ingestion pipeline.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, requirePerm } from '@cveriskpilot/auth';
import { SSEEmitter } from '@cveriskpilot/streaming';
import type { StreamEvent } from '@cveriskpilot/streaming';
import { prisma } from '@/lib/prisma';
import { getOrgTier, checkBillingGate } from '@/lib/billing';

// ---------------------------------------------------------------------------
// Singleton SSEEmitter for the Signal Engine event stream
// (separate from the scan-progress emitter in /api/stream)
// ---------------------------------------------------------------------------

let signalEmitterInstance: SSEEmitter | null = null;

export function getSignalEmitter(): SSEEmitter {
  if (!signalEmitterInstance) {
    signalEmitterInstance = new SSEEmitter({ heartbeatIntervalMs: 15_000 });
    signalEmitterInstance.start();
  }
  return signalEmitterInstance;
}

// ---------------------------------------------------------------------------
// Route config
// ---------------------------------------------------------------------------

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/events/stream
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Auth
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    // RBAC
    const permError = requirePerm(session.role, 'cases:read');
    if (permError) return permError;

    // Billing gate — continuous_ingest is a PRO+ feature
    const orgId = session.organizationId;
    const tier = await getOrgTier(orgId);
    const gate = await checkBillingGate(orgId, tier, 'continuous_ingest');
    if (!gate.allowed) {
      return NextResponse.json(
        {
          error: gate.reason ?? 'Real-time event stream requires a Pro or higher plan',
          code: 'BILLING_LIMIT_EXCEEDED',
          upgradeRequired: gate.upgradeRequired,
          upgradeUrl: '/settings/billing',
        },
        { status: 402 },
      );
    }

    const emitter = getSignalEmitter();

    // Support Last-Event-ID for resumption after reconnect
    const lastEventId = request.headers.get('Last-Event-ID') ?? undefined;

    const { connectionId, stream } = emitter.addClient(orgId, {
      lastEventId,
    });

    // Send initial summary event with org stats
    const [totalCases, openCases] = await Promise.all([
      prisma.vulnerabilityCase.count({
        where: { organizationId: orgId },
      }),
      prisma.vulnerabilityCase.count({
        where: { organizationId: orgId, status: 'NEW' },
      }),
    ]);

    const summaryEvent: StreamEvent = {
      id: emitter.nextEventId(),
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
      tenantId: orgId,
      jobId: '',
      data: {
        kind: 'connection.summary',
        connectionId,
        totalCases,
        openCases,
        connectedAt: new Date().toISOString(),
      },
    };

    // Send to this specific tenant (the newly connected client will receive it)
    emitter.sendToTenant(orgId, summaryEvent);

    // Clean up when the client disconnects
    request.signal.addEventListener('abort', () => {
      emitter.removeClient(connectionId);
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Connection-Id': connectionId,
      },
    });
  } catch (error) {
    console.error('[Signal Engine] Stream error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
