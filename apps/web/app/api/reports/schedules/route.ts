import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// In-memory store for report schedules.
// In production, this would be a Prisma model or a dedicated DB table.
// ---------------------------------------------------------------------------

export interface ReportSchedule {
  id: string;
  name: string;
  organizationId: string;
  clientId: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  reportType: 'executive' | 'findings' | 'sla';
  format: 'pdf' | 'csv';
  recipients: string[];
  dayOfWeek: number | null;
  hourUtc: number;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
  createdAt: string;
  updatedAt: string;
}

// Shared mutable store (persists for the lifetime of the server process)
const scheduleStore = new Map<string, ReportSchedule>();

export { scheduleStore };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `sched_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function computeNextRun(frequency: string, dayOfWeek: number | null, hourUtc: number): string {
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
      if (daysUntil <= 0 || (daysUntil === 0 && next <= now)) daysUntil += 7;
      next.setUTCDate(next.getUTCDate() + daysUntil);
      break;
    }
    case 'monthly':
      next.setUTCMonth(next.getUTCMonth() + 1);
      next.setUTCDate(1);
      break;
  }

  return next.toISOString();
}

function validateScheduleBody(body: Record<string, unknown>): string | null {
  if (!body.name || typeof body.name !== 'string') return 'name is required';
  if (!body.organizationId || typeof body.organizationId !== 'string') return 'organizationId is required';
  if (!['daily', 'weekly', 'monthly'].includes(body.frequency as string)) return 'frequency must be daily, weekly, or monthly';
  if (!['executive', 'findings', 'sla'].includes(body.reportType as string)) return 'reportType must be executive, findings, or sla';
  if (!['pdf', 'csv'].includes(body.format as string)) return 'format must be pdf or csv';
  if (!Array.isArray(body.recipients) || body.recipients.length === 0) return 'recipients must be a non-empty array of emails';
  if (typeof body.hourUtc !== 'number' || body.hourUtc < 0 || body.hourUtc > 23) return 'hourUtc must be 0-23';
  return null;
}

// ---------------------------------------------------------------------------
// GET /api/reports/schedules — List schedules for an organization
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

    const schedules = Array.from(scheduleStore.values()).filter(
      (s) => s.organizationId === organizationId,
    );

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('[API] GET /api/reports/schedules error:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/reports/schedules — Create a new schedule
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationError = validateScheduleBody(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const now = new Date().toISOString();
    const schedule: ReportSchedule = {
      id: generateId(),
      name: body.name,
      organizationId: body.organizationId,
      clientId: body.clientId ?? null,
      frequency: body.frequency,
      reportType: body.reportType,
      format: body.format,
      recipients: body.recipients,
      dayOfWeek: body.dayOfWeek ?? null,
      hourUtc: body.hourUtc,
      enabled: body.enabled !== false,
      lastRunAt: null,
      nextRunAt: computeNextRun(body.frequency, body.dayOfWeek ?? null, body.hourUtc),
      createdAt: now,
      updatedAt: now,
    };

    scheduleStore.set(schedule.id, schedule);

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/reports/schedules error:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}
