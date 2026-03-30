import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Unauthenticated requests get minimal response — no infra details
  const session = request.cookies.get('crp_session');
  if (!session?.value) {
    return NextResponse.json({ status: 'healthy' });
  }
  const checks: Record<string, 'ok' | 'error' | 'skip'> = {
    app: 'ok',
  };

  // Database check
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  // Redis check — actual PING with 2-second timeout
  if (!process.env.REDIS_URL) {
    checks.redis = 'skip';
  } else {
    try {
      const { getRedisClient } = await import('@cveriskpilot/auth');
      const redis = getRedisClient();
      await Promise.race([
        redis.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis ping timeout')), 2000),
        ),
      ]);
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }
  }

  // GCS check — lightweight bucket existence test with 3-second timeout
  const gcsBucket = process.env.GCS_BUCKET_ARTIFACTS;
  if (!gcsBucket) {
    checks.gcs = 'skip';
  } else {
    try {
      const { Storage } = await import('@google-cloud/storage');
      const storage = new Storage();
      await Promise.race([
        storage.bucket(gcsBucket).exists(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('GCS check timeout')), 3000),
        ),
      ]);
      checks.gcs = 'ok';
    } catch {
      checks.gcs = 'error';
    }
  }

  const healthy = Object.values(checks).every((v) => v === 'ok' || v === 'skip');

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
      version: process.env.IMAGE_TAG || 'dev',
    },
    { status: healthy ? 200 : 503 },
  );
}
