import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createOrganization,
  validatePassword,
  validateEmail,
  createSession,
  setSessionCookie,
  getSignupLimiter,
} from '@cveriskpilot/auth';
import { UserRole } from '@cveriskpilot/domain';
import {
  STRIPE_PRICES,
  createCheckoutSession,
  createSetupCheckoutSession,
} from '@cveriskpilot/billing';

export async function POST(request: NextRequest) {
  // Rate limit by IP to prevent mass account creation and email enumeration
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  try {
    const limiter = getSignupLimiter();
    const rl = await limiter.check(`signup:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
      );
    }
  } catch {
    // Redis not available — skip rate limiting
  }

  try {
    // Parse body first before anything else
    const body = await request.json() as Record<string, unknown>;

    const { name, email, password, orgName, plan } = body as {
      name?: string;
      email?: string;
      password?: string;
      orgName?: string;
      plan?: string;
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

    // Session creation is required — no insecure fallback
    if (!sessionId) {
      console.error('[API] POST /api/auth/signup: Redis unavailable, cannot create session');
      return NextResponse.json(
        { error: 'Session service unavailable. Please try again.' },
        { status: 503 },
      );
    }

    // Resolve Stripe checkout URL based on selected plan
    let checkoutUrl: string | undefined;
    const normalizedPlan = plan?.toUpperCase();

    // Validate plan is a known tier
    const VALID_PLANS = new Set(['FREE', 'FOUNDERS_BETA', 'PRO', 'ENTERPRISE', 'MSSP']);
    const isPaidPlan = normalizedPlan && normalizedPlan !== 'FREE' && VALID_PLANS.has(normalizedPlan);

    if (isPaidPlan) {
      // Paid plan — create a subscription checkout
      const priceKey = `${normalizedPlan}_MONTHLY`;
      const priceGetter = (STRIPE_PRICES as Record<string, (() => string) | undefined>)[priceKey];
      const priceId = priceGetter?.();

      if (!priceId) {
        // Missing Stripe price config — don't silently create a free account
        console.error(`[signup] Missing STRIPE_PRICE_${priceKey} env var for plan ${normalizedPlan}`);
        return NextResponse.json(
          { error: `Payment configuration unavailable for ${plan} plan. Please contact support.` },
          { status: 503 },
        );
      }

      const checkout = await createCheckoutSession({
        organizationId: result.organizationId,
        email: email!,
        priceId,
      });
      checkoutUrl = checkout.url;
    } else {
      // Free plan, no plan, or unknown plan — collect payment method via Stripe setup mode
      const setup = await createSetupCheckoutSession({
        organizationId: result.organizationId,
        email: email!,
      });
      checkoutUrl = setup.url;
    }

    const response = NextResponse.json(
      {
        success: true,
        userId: result.userId,
        checkoutUrl,
      },
      { status: 201 },
    );

    setSessionCookie(response, sessionId);

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
