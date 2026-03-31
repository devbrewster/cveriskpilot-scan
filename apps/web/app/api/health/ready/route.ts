import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { prisma } = await import('@/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse('OK', { status: 200 });
  } catch {
    return new NextResponse('NOT READY', { status: 503 });
  }
}
