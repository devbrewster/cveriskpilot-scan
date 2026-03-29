// ---------------------------------------------------------------------------
// GET  /api/auth/mfa/setup — Return TOTP setup data (secret, QR URI, backup codes)
// POST /api/auth/mfa/setup — Confirm MFA setup by verifying initial token
// ---------------------------------------------------------------------------

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import {
  getServerSessionFromCookies,
  generateTOTPSecret,
  verifyTOTPToken,
  getRedisClient,
} from '@cveriskpilot/auth';
import { checkAuthRateLimit } from '@/lib/auth-rate-limit';

/**
 * GET — Generate a new TOTP secret and return setup data.
 * Requires an authenticated session. Stores the pending secret in Redis
 * with a 10-minute TTL so it can be confirmed via POST.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getServerSessionFromCookies(
      (name: string) => cookieStore.get(name)?.value,
    );

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate a real TOTP secret
    const { secret, uri } = generateTOTPSecret(session.email);

    // Store the pending secret in Redis with 10-minute TTL
    const redis = getRedisClient();
    try {
      await redis.set(
        `crp:mfa_setup:${session.userId}`,
        JSON.stringify({ secret, createdAt: new Date().toISOString() }),
        'EX',
        600, // 10 minutes
      );
    } catch {
      return NextResponse.json(
        { error: 'Session service unavailable. Please try again.' },
        { status: 503 },
      );
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );

    return NextResponse.json({
      secret,
      qrCodeUri: uri,
      backupCodes,
    });
  } catch (error) {
    console.error('[API] GET /api/auth/mfa/setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST — Confirm MFA setup by verifying the first TOTP token.
 * On success, marks the user's mfaEnabled = true in the database and
 * stores the encrypted MFA secret.
 */
export async function POST(request: NextRequest) {
  // IP-based auth rate limit (10 req/min) — runs before any other logic
  const rateLimited = await checkAuthRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    const cookieStore = await cookies();
    const session = await getServerSessionFromCookies(
      (name: string) => cookieStore.get(name)?.value,
    );

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { token } = body as { token?: string };

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 },
      );
    }

    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { error: 'Token must be a 6-digit code' },
        { status: 400 },
      );
    }

    // Retrieve the pending secret from Redis
    const redis = getRedisClient();
    const redisKey = `crp:mfa_setup:${session.userId}`;
    let pendingSecret: string | null = null;

    try {
      const raw = await redis.get(redisKey);
      if (!raw) {
        return NextResponse.json(
          { error: 'MFA setup session expired. Please start setup again.' },
          { status: 400 },
        );
      }
      const data = JSON.parse(raw);
      pendingSecret = data.secret;
    } catch {
      return NextResponse.json(
        { error: 'Session service unavailable. Please try again.' },
        { status: 503 },
      );
    }

    if (!pendingSecret) {
      return NextResponse.json(
        { error: 'MFA setup session expired. Please start setup again.' },
        { status: 400 },
      );
    }

    // Verify the TOTP token against the pending secret
    const isValid = verifyTOTPToken(token, pendingSecret);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code. Please try again.' },
        { status: 400 },
      );
    }

    // Token is valid — enable MFA for the user
    await (prisma as any).user.update({
      where: { id: session.userId },
      data: {
        mfaEnabled: true,
        mfaSecret: pendingSecret,
      },
    });

    // Clean up the pending setup key
    try {
      await redis.del(redisKey);
    } catch {
      // Non-fatal: key will expire via TTL anyway
    }

    return NextResponse.json({
      success: true,
      message: 'MFA has been enabled for your account',
    });
  } catch (error) {
    console.error('[API] POST /api/auth/mfa/setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
