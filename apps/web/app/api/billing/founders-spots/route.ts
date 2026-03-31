import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FOUNDERS_BETA_TOTAL = 50;

/** In-memory cache to avoid DB query on every request */
let cache: { data: { total: number; taken: number; remaining: number }; expires: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * GET /api/billing/founders-spots
 *
 * Public endpoint (no auth required). Returns the number of Founders Beta
 * spots taken, remaining, and total cap. Cached in-memory for 60s and at
 * CDN layer via Cache-Control.
 */
export async function GET() {
  try {
    const now = Date.now();

    if (cache && cache.expires > now) {
      return NextResponse.json(cache.data, {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
          'X-Cache': 'HIT',
        },
      });
    }

    const taken = await prisma.organization.count({
      where: { tier: 'FOUNDERS_BETA' },
    });

    const remaining = Math.max(0, FOUNDERS_BETA_TOTAL - taken);
    const data = { total: FOUNDERS_BETA_TOTAL, taken, remaining };

    cache = { data, expires: now + CACHE_TTL_MS };

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('[API] GET /api/billing/founders-spots error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
