import { NextRequest, NextResponse } from 'next/server';
import { authRateLimiter } from '@cveriskpilot/auth';

export async function checkAuthRateLimit(request: NextRequest): Promise<NextResponse | null> {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown';
    const result = await authRateLimiter.check(ip);
    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(result.retryAfter ?? 60) } },
      );
    }
    return null;
  } catch {
    return null; // Redis unavailable — don't block auth
  }
}
