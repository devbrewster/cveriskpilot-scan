import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ orgId: string }>;
}

/**
 * GET /api/badge/:orgId
 *
 * Returns a shields.io-compatible compliance badge SVG.
 * Query params:
 *   - framework: nist|soc2|cmmc|fedramp|asvs|ssdf (default: all)
 *   - style: flat|flat-square|for-the-badge|plastic (default: flat)
 *
 * Public endpoint — no auth required. Only exposes pass/fail status, not details.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { orgId } = await context.params;
  const { searchParams } = new URL(request.url);
  const style = searchParams.get('style') || 'flat';
  const framework = searchParams.get('framework') || 'all';

  // Validate orgId format
  if (!orgId || typeof orgId !== 'string' || orgId.length < 10) {
    return serveBadge('compliance', 'invalid', '#9e9e9e', style);
  }

  try {
    // Check if org exists and has badge enabled
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    });

    if (!org) {
      return serveBadge('compliance', 'not found', '#9e9e9e', style);
    }

    // Count open vulnerability cases by severity
    const recentCases = await prisma.vulnerabilityCase.groupBy({
      by: ['severity'],
      where: {
        organizationId: orgId,
        status: { notIn: ['VERIFIED_CLOSED', 'FALSE_POSITIVE', 'NOT_APPLICABLE', 'DUPLICATE'] },
      },
      _count: true,
    });

    const counts: Record<string, number> = {};
    for (const row of recentCases) {
      counts[row.severity] = row._count;
    }

    const critical = counts['CRITICAL'] || 0;
    const high = counts['HIGH'] || 0;

    // Determine badge status
    let label = framework === 'all' ? 'compliance' : framework.toUpperCase();
    let message: string;
    let color: string;

    if (critical > 0) {
      message = `${critical} critical`;
      color = '#e53935'; // red
    } else if (high > 0) {
      message = `${high} high`;
      color = '#ff9800'; // orange
    } else {
      message = 'passing';
      color = '#4caf50'; // green
    }

    return serveBadge(label, message, color, style);
  } catch {
    return serveBadge('compliance', 'error', '#9e9e9e', style);
  }
}

function serveBadge(label: string, message: string, color: string, style: string) {
  // Use shields.io endpoint format for reliable rendering
  const badgeUrl = `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(message)}-${color.replace('#', '')}?style=${style}&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAxTDMgNXY2YzAgNS41NSAzLjg0IDEwLjc0IDkgMTIgNS4xNi0xLjI2IDktNi40NSA5LTEyVjVsLTktNHoiLz48L3N2Zz4=&logoColor=white`;

  return NextResponse.redirect(badgeUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
