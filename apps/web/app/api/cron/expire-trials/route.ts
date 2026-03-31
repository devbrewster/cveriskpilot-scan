// POST /api/cron/expire-trials — Daily cron to expire Pro trials
//
// Called by Cloud Scheduler with Bearer token auth (CRON_SECRET).
// Finds all orgs where trialEndsAt < now AND tier = PRO, then batch
// downgrades them to FREE.

import { timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // --- Auth: Bearer token must match CRON_SECRET ---
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  const expected = `Bearer ${cronSecret}`;
  if (!cronSecret || !authHeader || !constantTimeEqual(authHeader, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find all orgs with expired Pro trials
    const expiredOrgs = await prisma.organization.findMany({
      where: {
        tier: 'PRO',
        trialEndsAt: { lt: new Date() },
      },
      select: { id: true, name: true },
    });

    if (expiredOrgs.length === 0) {
      return NextResponse.json({ expired: 0 });
    }

    // Batch downgrade to FREE
    const result = await prisma.organization.updateMany({
      where: {
        id: { in: expiredOrgs.map((o) => o.id) },
      },
      data: {
        tier: 'FREE',
        trialEndsAt: null,
      },
    });

    console.log(
      `[cron/expire-trials] Expired ${result.count} Pro trials:`,
      expiredOrgs.map((o) => o.id),
    );

    return NextResponse.json({ expired: result.count });
  } catch (error) {
    console.error('[cron/expire-trials] Error:', error);
    return NextResponse.json(
      { error: 'Failed to expire trials' },
      { status: 500 },
    );
  }
}
