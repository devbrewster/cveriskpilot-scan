import { NextRequest, NextResponse } from 'next/server';
import { scheduleStore } from '../route';
import type { ReportSchedule } from '../route';

// ---------------------------------------------------------------------------
// GET /api/reports/schedules/[id] — Get a single schedule
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const schedule = scheduleStore.get(id);

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
    const { id } = await params;
    const existing = scheduleStore.get(id);

    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const body = await request.json();

    const updated: ReportSchedule = {
      ...existing,
      name: body.name ?? existing.name,
      clientId: body.clientId !== undefined ? body.clientId : existing.clientId,
      frequency: body.frequency ?? existing.frequency,
      reportType: body.reportType ?? existing.reportType,
      format: body.format ?? existing.format,
      recipients: body.recipients ?? existing.recipients,
      dayOfWeek: body.dayOfWeek !== undefined ? body.dayOfWeek : existing.dayOfWeek,
      hourUtc: body.hourUtc !== undefined ? body.hourUtc : existing.hourUtc,
      enabled: body.enabled !== undefined ? body.enabled : existing.enabled,
      updatedAt: new Date().toISOString(),
    };

    // Recompute next run if frequency or timing changed
    if (
      body.frequency !== undefined ||
      body.dayOfWeek !== undefined ||
      body.hourUtc !== undefined
    ) {
      const next = new Date();
      next.setUTCMinutes(0, 0, 0);
      next.setUTCHours(updated.hourUtc);

      switch (updated.frequency) {
        case 'daily':
          if (next <= new Date()) next.setUTCDate(next.getUTCDate() + 1);
          break;
        case 'weekly': {
          const target = updated.dayOfWeek ?? 1;
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

      updated.nextRunAt = next.toISOString();
    }

    scheduleStore.set(id, updated);

    return NextResponse.json({ schedule: updated });
  } catch (error) {
    console.error('[API] PUT /api/reports/schedules/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/reports/schedules/[id] — Delete a schedule
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existed = scheduleStore.delete(id);

    if (!existed) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/reports/schedules/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
