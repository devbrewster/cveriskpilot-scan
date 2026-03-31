import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FOUNDERS_BETA_TOTAL = 50;

/**
 * GET /api/billing/founders-spots
 *
 * Public endpoint (no auth required). Returns the number of Founders Beta
 * spots taken, remaining, and total cap. Cached for 60 seconds at CDN layer.
 */
export async function GET() {
  try {
    const taken = await prisma.organization.count({
      where: { tier: 'FOUNDERS_BETA' },
    });

    const remaining = Math.max(0, FOUNDERS_BETA_TOTAL - taken);

    return NextResponse.json(
      { total: FOUNDERS_BETA_TOTAL, taken, remaining },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60',
        },
      },
    );
  } catch (error) {
    console.error('[API] GET /api/billing/founders-spots error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
