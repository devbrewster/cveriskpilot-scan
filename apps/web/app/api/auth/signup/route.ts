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
} from '@cveriskpilot/billing';
import { checkAuthRateLimit } from '@/lib/auth-rate-limit';

export async function POST(request: NextRequest) {
  // IP-based auth rate limit (10 req/min) — runs before any other logic
  const rateLimited = await checkAuthRateLimit(request);
  if (rateLimited) return rateLimited;

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

    const { name, email, password, orgName, plan, billingInterval } = body as {
      name?: string;
      email?: string;
      password?: string;
      orgName?: string;
      plan?: string;
      billingInterval?: string;
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

    // Paid plans → create Stripe checkout session (account already created on FREE tier)
    // Webhook will upgrade tier on checkout.session.completed
    const PAID_PLANS = new Set(['FOUNDERS_BETA', 'PRO', 'ENTERPRISE', 'MSSP']);

    // Block Founders Beta signups when all 50 spots are taken
    if (normalizedPlan === 'FOUNDERS_BETA') {
      const foundersBetaCount = await prisma.organization.count({
        where: { tier: 'FOUNDERS_BETA' },
      });
      if (foundersBetaCount >= 50) {
        return NextResponse.json(
          { error: 'Founders Beta is sold out. Upgrade to Pro instead.' },
          { status: 409 },
        );
      }
    }

    if (normalizedPlan && PAID_PLANS.has(normalizedPlan)) {
      const interval = billingInterval === 'annual' ? 'ANNUAL' : 'MONTHLY';
      const priceKey = `${normalizedPlan}_${interval}`;
      const priceGetter = (STRIPE_PRICES as Record<string, (() => string | null) | undefined>)[priceKey];
      const priceId = priceGetter?.();

      if (priceId && priceId.length > 0) {
        try {
          const checkout = await createCheckoutSession({
            organizationId: result.organizationId,
            email: email!,
            priceId,
          });
          checkoutUrl = checkout.url;
        } catch (stripeErr) {
          console.error(`[signup] Stripe checkout creation failed for ${normalizedPlan}:`, stripeErr);
          // Account is created — user can upgrade later from billing settings
        }
      } else {
        console.warn(`[signup] No Stripe price configured for ${priceKey}, account created on FREE tier`);
      }
    }
    // FREE tier — no Stripe interaction at all. Straight to dashboard.

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
      { error: 'Account creation failed. Please try again.' },
      { status: 500 },
    );
  }
}
