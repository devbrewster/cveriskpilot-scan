import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks: Record<string, { status: string; latency?: number; error?: string }>;
}

export async function GET() {
  const checks: HealthCheck['checks'] = {};
  let overallStatus: HealthCheck['status'] = 'healthy';

  // Check database
  try {
    const dbStart = Date.now();
    const { prisma } = await import('@/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', latency: Date.now() - dbStart };
  } catch (err) {
    checks.database = { status: 'error', error: err instanceof Error ? err.message : 'unknown' };
    overallStatus = 'unhealthy';
  }

  // Check Redis
  if (!process.env.REDIS_URL) {
    checks.redis = { status: 'unavailable' };
    if (overallStatus === 'healthy') overallStatus = 'degraded';
  } else {
    try {
      const redisStart = Date.now();
      const { getRedisClient } = await import('@cveriskpilot/auth');
      const redis = getRedisClient();
      await Promise.race([
        redis.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis ping timeout')), 2000),
        ),
      ]);
      checks.redis = { status: 'ok', latency: Date.now() - redisStart };
    } catch (err) {
      checks.redis = { status: 'error', error: err instanceof Error ? err.message : 'unknown' };
      if (overallStatus === 'healthy') overallStatus = 'degraded';
    }
  }

  // Check AI service
  checks.ai = {
    status: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not_configured',
  };

  // Check Stripe
  checks.stripe = {
    status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured',
  };

  // Check GCS
  const gcsBucket = process.env.GCS_BUCKET_ARTIFACTS;
  if (!gcsBucket) {
    checks.gcs = { status: 'unavailable' };
  } else {
    try {
      const gcsStart = Date.now();
      const { Storage } = await import('@google-cloud/storage');
      const storage = new Storage();
      await Promise.race([
        storage.bucket(gcsBucket).exists(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('GCS check timeout')), 3000),
        ),
      ]);
      checks.gcs = { status: 'ok', latency: Date.now() - gcsStart };
    } catch (err) {
      checks.gcs = { status: 'error', error: err instanceof Error ? err.message : 'unknown' };
    }
  }

  // Build version from env or package
  const version = process.env.BUILD_VERSION || process.env.SHORT_SHA || process.env.IMAGE_TAG || '0.3.0-beta';

  const health: HealthCheck = {
    status: overallStatus,
    version,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks,
  };

  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;
  return NextResponse.json(health, { status: httpStatus });
}
