import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';
import {
  getOrgUsageSummary,
  getClientUsage,
  estimateUsageCost,
} from '@cveriskpilot/billing';

/**
 * GET /api/billing/usage
 * Returns usage summary for the authenticated user's organization.
 * Query params: period (optional, defaults to current month), clientId (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { searchParams } = new URL(request.url);
    const organizationId = session.organizationId;
    const period = searchParams.get('period') ?? undefined;
    const clientId = searchParams.get('clientId');

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { id: true, tier: true },
    });

    // If a specific client is requested, return just that client's usage
    if (clientId) {
      const clientUsage = await getClientUsage(organizationId, clientId, period);

      // Enrich with client name
      const client = await prisma.client.findFirst({
        where: { id: clientId, organizationId },
        select: { name: true },
      });
      clientUsage.clientName = client?.name;

      return NextResponse.json({ usage: clientUsage });
    }

    // Full org usage summary (includes per-client breakdown for MSSP)
    const summary = await getOrgUsageSummary(organizationId, period);

    // Enrich client names
    if (summary.clients.length > 0) {
      const clientIds = summary.clients.map((c: any) => c.clientId);
      const clients = await prisma.client.findMany({
        where: { id: { in: clientIds }, organizationId },
        select: { id: true, name: true },
      });
      const nameMap = new Map(clients.map((c: any) => [c.id, c.name]));
      for (const client of summary.clients) {
        (client as any).clientName = nameMap.get(client.clientId);
      }
    }

    // Cost estimate
    const costEstimate = estimateUsageCost(org.tier, summary.totals);

    return NextResponse.json({
      usage: summary,
      costEstimate,
      tier: org.tier,
    });
  } catch (error) {
    console.error('[API] GET /api/billing/usage error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 },
    );
  }
}
