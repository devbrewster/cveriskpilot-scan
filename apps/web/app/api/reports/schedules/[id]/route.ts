import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeNextRun(frequency: string, dayOfWeek: number | null, hourUtc: number): Date {
  const now = new Date();
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(hourUtc);

  switch (frequency) {
    case 'daily':
      if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
      break;
    case 'weekly': {
      const target = dayOfWeek ?? 1;
      let daysUntil = target - next.getUTCDay();
      if (daysUntil <= 0) daysUntil += 7;
      next.setUTCDate(next.getUTCDate() + daysUntil);
      break;
    }
    case 'monthly':
      next.setUTCMonth(next.getUTCMonth() + 1);
      next.setUTCDate(1);
      break;
  }

  return next;
}

// ---------------------------------------------------------------------------
// GET /api/reports/schedules/[id] — Get a single schedule
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { id } = await params;
    const schedule = await prisma.reportSchedule.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('[API] GET /api/reports/schedules/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/reports/schedules/[id] — Update a schedule
// ---------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth2 = await requireAuth(request);
    if (auth2 instanceof NextResponse) return auth2;
    const session = auth2;

    const { id } = await params;

    // Verify the schedule belongs to the authenticated org
    const existing = await prisma.reportSchedule.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const body = await request.json();

    // Build the update payload from provided fields
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.clientId !== undefined) data.clientId = body.clientId;
    if (body.frequency !== undefined) data.frequency = body.frequency;
    if (body.reportType !== undefined) data.reportType = body.reportType;
    if (body.format !== undefined) data.format = body.format;
    if (body.recipients !== undefined) data.recipients = body.recipients;
    if (body.dayOfWeek !== undefined) data.dayOfWeek = body.dayOfWeek;
    if (body.hourUtc !== undefined) data.hourUtc = body.hourUtc;
    if (body.enabled !== undefined) data.enabled = body.enabled;

    // Recompute nextRunAt if frequency or timing changed
    if (
      body.frequency !== undefined ||
      body.dayOfWeek !== undefined ||
      body.hourUtc !== undefined
    ) {
      const freq = body.frequency ?? existing.frequency;
      const dow = body.dayOfWeek !== undefined ? body.dayOfWeek : existing.dayOfWeek;
      const hour = body.hourUtc !== undefined ? body.hourUtc : existing.hourUtc;
      data.nextRunAt = computeNextRun(freq, dow, hour);
    }

    const schedule = await prisma.reportSchedule.update({
      where: { id },
      data,
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('[API] PUT /api/reports/schedules/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/reports/schedules/[id] — Delete a schedule
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth3 = await requireAuth(request);
    if (auth3 instanceof NextResponse) return auth3;
    const session = auth3;

    const { id } = await params;

    // Verify the schedule belongs to the authenticated org before deleting
    const existing = await prisma.reportSchedule.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    await prisma.reportSchedule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/reports/schedules/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
