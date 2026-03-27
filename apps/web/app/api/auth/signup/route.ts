import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createOrganization,
  validatePassword,
  validateEmail,
  createSession,
  setSessionCookie,
  getLoginLimiter,
} from '@cveriskpilot/auth';
import { UserRole } from '@cveriskpilot/domain';

export async function POST(request: NextRequest) {
  try {
    // Parse body first before anything else
    const body = await request.json() as Record<string, unknown>;

    const { name, email, password, orgName } = body as {
      name?: string;
      email?: string;
      password?: string;
      orgName?: string;
    };

    // Validate required fields
    const missing: string[] = [];
    if (!name || typeof name !== 'string') missing.push('name');
    if (!email || typeof email !== 'string') missing.push('email');
    if (!password || typeof password !== 'string') missing.push('password');
    if (!orgName || typeof orgName !== 'string') missing.push('orgName');

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate email format
    if (!validateEmail(email!)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 },
      );
    }

    // Validate password strength
    const passwordCheck = validatePassword(password!);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: passwordCheck.errors },
        { status: 400 },
      );
    }

    // Create organization and owner user
    const result = await createOrganization(
      prisma,
      orgName!,
      email!,
      name!,
      password!,
    );

    // Create session in Redis (graceful fallback if unavailable)
    let sessionId: string | null = null;
    try {
      sessionId = await createSession({
        userId: result.userId,
        organizationId: result.organizationId,
        role: UserRole.ORG_OWNER,
        email: email!.toLowerCase().trim(),
      });
    } catch {
      // Redis not available — session will not be persisted server-side
    }

    const response = NextResponse.json(
      {
        success: true,
        userId: result.userId,
        organizationId: result.organizationId,
      },
      { status: 201 },
    );

    // Set session cookie
    if (sessionId) {
      setSessionCookie(response, sessionId);
    } else {
      // Fallback: set a basic cookie so the client knows auth succeeded
      response.cookies.set('crp_session', result.userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 86400,
      });
    }

    return response;
  } catch (error: unknown) {
    // Handle duplicate email (Prisma unique constraint violation)
    if (
      error instanceof Error &&
      'code' in error &&
      (error as any).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    console.error('[API] POST /api/auth/signup error:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
