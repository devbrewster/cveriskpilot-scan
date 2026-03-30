import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Unauthenticated requests get minimal response — no infra details
  const session = request.cookies.get('crp_session');
  if (!session?.value) {
    return NextResponse.json({ status: 'healthy' });
  }
  const checks: Record<string, 'ok' | 'error'> = {
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

  // Redis check
  try {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      checks.redis = 'ok'; // Basic check — URL is configured
    } else {
      checks.redis = 'error';
    }
  } catch {
    checks.redis = 'error';
  }

  const healthy = Object.values(checks).every((v) => v === 'ok');

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
