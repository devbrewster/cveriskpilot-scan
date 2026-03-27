import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authenticateWithCredentials,
  createSession,
  setSessionCookie,
  getLoginLimiter,
} from '@cveriskpilot/auth';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (graceful fallback if Redis unavailable)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    try {
      const limiter = getLoginLimiter();
      const rl = await limiter.check(`login:${ip}`);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: 'Too many login attempts. Please try again later.' },
          {
            status: 429,
            headers: { 'Retry-After': String(rl.retryAfter ?? 60) },
          },
        );
      }
    } catch {
      // Redis not available — skip rate limiting
    }

    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const { email, password } = body as {
      email?: string;
      password?: string;
    };

    // Validate required fields
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    // Authenticate with credentials
    const result = await authenticateWithCredentials(prisma, email, password);

    if (!result.success) {
      // Determine appropriate status code from error message
      const isLocked = result.error?.includes('locked');
      const status = isLocked ? 423 : 401;

      return NextResponse.json(
        { error: result.error },
        { status },
      );
    }

    // Look up the user's role and email for session data
    const user = await (prisma as any).user.findUnique({
      where: { id: result.userId },
      select: { role: true, email: true },
    });

    // Create session in Redis (graceful fallback if unavailable)
    let sessionId: string | null = null;
    try {
      sessionId = await createSession({
        userId: result.userId!,
        organizationId: result.organizationId!,
        role: user.role,
        email: user.email,
      });
    } catch {
      // Redis not available — session will not be persisted server-side
    }

    const response = NextResponse.json({
      success: true,
      userId: result.userId,
      organizationId: result.organizationId,
    });

    // Set session cookie
    if (sessionId) {
      setSessionCookie(response, sessionId);
    } else {
      // Fallback: set a basic cookie so the client knows auth succeeded
      response.cookies.set('crp_session', result.userId!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 86400,
      });
    }

    return response;
  } catch (error) {
    console.error('[API] POST /api/auth/login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
