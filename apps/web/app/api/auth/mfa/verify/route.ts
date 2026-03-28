// ---------------------------------------------------------------------------
// POST /api/auth/mfa/verify — Verify a TOTP token during login
// Accepts { token, tempSessionId } and promotes the temp session to a full
// session cookie on success.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyTOTPToken,
  createSession,
  setSessionCookie,
  getLoginLimiter,
} from '@cveriskpilot/auth';

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { token, tempSessionId } = body as {
      token?: string;
      tempSessionId?: string;
    };

    // Validate required fields
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 },
      );
    }

    if (!tempSessionId || typeof tempSessionId !== 'string') {
      return NextResponse.json(
        { error: 'Temporary session ID is required' },
        { status: 400 },
      );
    }

    // Validate 6-digit format
    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { error: 'Token must be a 6-digit code' },
        { status: 400 },
      );
    }

    // Rate limit MFA attempts by tempSessionId to prevent brute-force
    try {
      const limiter = getLoginLimiter();
      const rl = await limiter.check(`mfa:${tempSessionId}`);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: 'Too many MFA attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
        );
      }
    } catch {
      // Redis not available — skip rate limiting
    }

    // Look up the temp session to get the userId
    // tempSessionId format: mfa:<userId>:<nonce> (stored in Redis in production)
    // For now, extract userId from the tempSessionId format
    const parts = tempSessionId.split(':');
    if (parts.length < 2 || parts[0] !== 'mfa') {
      return NextResponse.json(
        { error: 'Invalid temporary session' },
        { status: 400 },
      );
    }

    const userId = parts[1];
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid temporary session' },
        { status: 400 },
      );
    }

    // Fetch user from database to get MFA secret
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        mfaEnabled: true,
        mfaSecret: true,
        organizationId: true,
      },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json(
        { error: 'MFA not configured for this user' },
        { status: 400 },
      );
    }

    // Verify the TOTP token against the user's secret
    const isValid = verifyTOTPToken(token, user.mfaSecret);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 },
      );
    }

    // TOTP verified — create a real session
    let sessionId: string | null = null;
    try {
      sessionId = await createSession({
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
        email: user.email,
        mfaVerified: true,
      });
    } catch {
      // Redis not available — cannot create session without Redis for MFA flow
      return NextResponse.json(
        { error: 'Session service unavailable. Please try again.' },
        { status: 503 },
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'MFA verification successful',
    });

    setSessionCookie(response, sessionId);

    return response;
  } catch (error) {
    console.error('[API] POST /api/auth/mfa/verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
