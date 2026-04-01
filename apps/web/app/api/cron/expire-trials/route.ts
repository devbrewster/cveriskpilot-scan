// POST /api/cron/expire-trials — Daily cron to expire Pro trials
//
// Called by Cloud Scheduler with Bearer token auth (CRON_SECRET).
// Finds all orgs where trialEndsAt < now AND tier = PRO, then batch
// downgrades them to FREE.

import { timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail, trialExpiryTemplate, trialExpiredTemplate } from '@cveriskpilot/notifications';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cveriskpilot.com';

const PRO_FEATURES = [
  'Unlimited uploads',
  '1,000 AI triage calls/month',
  '1,000 assets',
  'POAM auto-generation',
  'Executive PDF reports',
  '13 compliance frameworks',
];

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
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const upgradeUrl = `${BASE_URL}/pricing`;

    // ---------------------------------------------------------------
    // 1. Send warning emails for trials expiring within 3 days
    // ---------------------------------------------------------------
    const warningOrgs = await prisma.organization.findMany({
      where: {
        tier: 'PRO',
        trialEndsAt: { gt: now, lte: threeDaysFromNow },
      },
      select: { id: true, name: true, trialEndsAt: true },
    });

    let warned = 0;
    for (const org of warningOrgs) {
      const daysRemaining = Math.max(
        1,
        Math.ceil((org.trialEndsAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      );

      const owners = await prisma.user.findMany({
        where: { organizationId: org.id, role: { in: ['OWNER', 'ADMIN'] } },
        select: { email: true },
      });

      const emails = owners.map((u) => u.email).filter(Boolean);
      if (emails.length > 0) {
        const html = trialExpiryTemplate(org.name, daysRemaining, upgradeUrl, PRO_FEATURES);
        sendEmail({
          to: emails,
          subject: `Your Pro trial expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
          html,
        }).catch(() => {});
        warned++;
      }
    }

    if (warningOrgs.length > 0) {
      console.log(
        `[cron/expire-trials] Sent ${warned} trial expiry warnings`,
      );
    }

    // ---------------------------------------------------------------
    // 2. Downgrade expired trials and send expired notifications
    // ---------------------------------------------------------------
    const expiredOrgs = await prisma.organization.findMany({
      where: {
        tier: 'PRO',
        trialEndsAt: { lt: now },
      },
      select: { id: true, name: true },
    });

    if (expiredOrgs.length === 0) {
      return NextResponse.json({ expired: 0, warned });
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

    // Send expired notifications (fire-and-forget)
    for (const org of expiredOrgs) {
      const owners = await prisma.user.findMany({
        where: { organizationId: org.id, role: { in: ['OWNER', 'ADMIN'] } },
        select: { email: true },
      });

      const emails = owners.map((u) => u.email).filter(Boolean);
      if (emails.length > 0) {
        const html = trialExpiredTemplate(org.name, upgradeUrl);
        sendEmail({
          to: emails,
          subject: 'Your Pro trial has expired — upgrade to restore access',
          html,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ expired: result.count, warned });
  } catch (error) {
    console.error('[cron/expire-trials] Error:', error);
    return NextResponse.json(
      { error: 'Failed to expire trials' },
      { status: 500 },
    );
  }
}
