import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import {
  authenticateWithCredentials,
  createSession,
  setSessionCookie,
  getLoginLimiter,
} from '@cveriskpilot/auth';
import { checkAuthRateLimit } from '@/lib/auth-rate-limit';

export async function POST(request: NextRequest) {
  // IP-based auth rate limit (10 req/min) — runs before any other logic
  const rateLimited = await checkAuthRateLimit(request);
  if (rateLimited) return rateLimited;

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

      // Audit log for failed login attempt
      try {
        await prisma.auditLog.create({
          data: {
            organizationId: result.organizationId ?? 'unknown',
            actorId: result.userId ?? 'unknown',
            actorIp: ip,
            action: 'LOGIN',
            entityType: 'User',
            entityId: result.userId ?? email,
            details: { success: false, reason: result.error },
            hash: `login-fail-${email}-${Date.now()}`,
          },
        });
      } catch {
        // Non-fatal: don't block login flow for audit failures
      }

      return NextResponse.json(
        { error: result.error },
        { status },
      );
    }

    // Look up the user's role, email, and MFA status for session data
    const user = await (prisma as any).user.findUnique({
      where: { id: result.userId },
      select: { role: true, email: true, mfaEnabled: true },
    });

    // If MFA is enabled, return a challenge instead of a full session
    if (user?.mfaEnabled) {
      // Generate a cryptographically random temp session ID — opaque to the client
      const tempSessionId = crypto.randomUUID();

      // Store the temp session in Redis with 5-minute TTL
      // SECURITY: Bind to client IP to prevent race-condition MFA bypass via MITM/XSS
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? request.headers.get('x-real-ip')
        ?? 'unknown';
      try {
        const { getRedisClient } = await import('@cveriskpilot/auth');
        const redis = getRedisClient();
        await redis.set(
          `crp:mfa_temp:${tempSessionId}`,
          JSON.stringify({
            userId: result.userId,
            organizationId: result.organizationId,
            boundIp: clientIp,
            createdAt: new Date().toISOString(),
          }),
          'EX',
          300, // 5 minutes
        );
      } catch {
        return NextResponse.json(
          { error: 'Session service unavailable. Please try again.' },
          { status: 503 },
        );
      }

      return NextResponse.json({
        mfaRequired: true,
        tempSessionId,
      });
    }

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

    // Session creation is required — no insecure fallback
    if (!sessionId) {
      console.error('[API] POST /api/auth/login: Redis unavailable, cannot create session');
      return NextResponse.json(
        { error: 'Session service unavailable. Please try again.' },
        { status: 503 },
      );
    }

    // Audit log for successful login
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: result.organizationId!,
          actorId: result.userId!,
          actorIp: ip,
          action: 'LOGIN',
          entityType: 'User',
          entityId: result.userId!,
          details: { success: true, mfaRequired: false },
          hash: `login-success-${result.userId}-${Date.now()}`,
        },
      });
    } catch {
      // Non-fatal: don't block login flow for audit failures
    }

    const response = NextResponse.json({
      success: true,
      userId: result.userId,
    });

    setSessionCookie(response, sessionId);

    return response;
  } catch (error) {
    console.error('[API] POST /api/auth/login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
