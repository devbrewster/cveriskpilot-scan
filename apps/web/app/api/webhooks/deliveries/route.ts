import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryTracker } from '@cveriskpilot/integrations';

// ---------------------------------------------------------------------------
// GET /api/webhooks/deliveries — list recent webhook deliveries for an org
// ---------------------------------------------------------------------------
//
// Query params:
//   organizationId (required) — the org to list deliveries for
//   limit          (optional) — max records to return, default 50
//   offset         (optional) — pagination offset, default 0
//   event          (optional) — filter by event type (e.g. "case.created")
//   success        (optional) — filter by outcome: "true" or "false"
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId query parameter is required' },
        { status: 400 },
      );
    }

    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200);
    const offset = Number(searchParams.get('offset') ?? 0);
    const event = searchParams.get('event') ?? undefined;
    const successParam = searchParams.get('success');
    const success =
      successParam === 'true' ? true : successParam === 'false' ? false : undefined;

    const tracker = getDeliveryTracker();
    const { deliveries, total } = tracker.listDeliveries(organizationId, {
      limit,
      offset,
      event,
      success,
    });

    // Strip full payload from list view to reduce response size
    const summary = deliveries.map((d) => ({
      id: d.id,
      endpointId: d.endpointId,
      event: d.event,
      totalAttempts: d.totalAttempts,
      success: d.success,
      createdAt: d.createdAt,
      lastAttemptAt: d.lastAttemptAt,
      nextRetryAt: d.nextRetryAt,
      completedAt: d.completedAt,
      attempts: d.attempts.map((a) => ({
        attemptNumber: a.attemptNumber,
        timestamp: a.timestamp,
        statusCode: a.statusCode,
        success: a.success,
        error: a.error,
        durationMs: a.durationMs,
      })),
    }));

    return NextResponse.json({
      deliveries: summary,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[API] GET /api/webhooks/deliveries error:', error);
    return NextResponse.json(
      { error: 'Failed to list webhook deliveries' },
      { status: 500 },
    );
  }
}
