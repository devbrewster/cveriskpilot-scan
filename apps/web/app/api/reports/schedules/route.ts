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
      if (daysUntil <= 0 || (daysUntil === 0 && next <= now)) daysUntil += 7;
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

function validateScheduleBody(body: Record<string, unknown>): string | null {
  if (!body.name || typeof body.name !== 'string') return 'name is required';
  if (!['daily', 'weekly', 'monthly'].includes(body.frequency as string)) return 'frequency must be daily, weekly, or monthly';
  if (!['executive', 'findings', 'sla'].includes(body.reportType as string)) return 'reportType must be executive, findings, or sla';
  if (!['pdf', 'csv'].includes(body.format as string)) return 'format must be pdf or csv';
  if (!Array.isArray(body.recipients) || body.recipients.length === 0) return 'recipients must be a non-empty array of emails';
  if (typeof body.hourUtc !== 'number' || body.hourUtc < 0 || body.hourUtc > 23) return 'hourUtc must be 0-23';
  return null;
}

// ---------------------------------------------------------------------------
// GET /api/reports/schedules — List schedules for the authenticated org
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const schedules = await prisma.reportSchedule.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: 'desc' },
    });

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
    const auth2 = await requireAuth(request);
    if (auth2 instanceof NextResponse) return auth2;
    const session = auth2;

    const body = await request.json();
    const validationError = validateScheduleBody(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const schedule = await prisma.reportSchedule.create({
      data: {
        organizationId: session.organizationId,
        name: body.name,
        clientId: body.clientId ?? null,
        frequency: body.frequency,
        reportType: body.reportType,
        format: body.format,
        recipients: body.recipients,
        dayOfWeek: body.dayOfWeek ?? null,
        hourUtc: body.hourUtc,
        enabled: body.enabled !== false,
        nextRunAt: computeNextRun(body.frequency, body.dayOfWeek ?? null, body.hourUtc),
      },
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/reports/schedules error:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}
