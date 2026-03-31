import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createOrganization,
  validateEmail,
  createSession,
  setSessionCookie,
  getSignupLimiter,
} from '@cveriskpilot/auth';
import { UserRole } from '@cveriskpilot/domain';
import { STRIPE_PRICES, createCheckoutSession } from '@cveriskpilot/billing';
import { checkAuthRateLimit } from '@/lib/auth-rate-limit';
import crypto from 'crypto';

/**
 * POST /api/billing/quick-purchase
 *
 * Simplified purchase flow: email + plan → create org → Stripe checkout.
 * No password or org name required. Account is created on FREE tier;
 * Stripe webhook upgrades tier on checkout completion.
 */
export async function POST(request: NextRequest) {
  // IP-based rate limit
  const rateLimited = await checkAuthRateLimit(request);
  if (rateLimited) return rateLimited;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  try {
    const limiter = getSignupLimiter();
    const rl = await limiter.check(`quickbuy:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
      );
    }
  } catch {
    // Redis not available — skip rate limiting
  }

  try {
    const body = await request.json();
    const { email, plan, billingInterval = 'monthly' } = body as {
      email?: string;
      plan?: string;
      billingInterval?: string;
    };

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Derive org name and display name from email
    const emailPrefix = email.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, ' ') || 'User';
    const orgName = `${emailPrefix}'s Org`;
    // Generate a random password — user can set a real one later via password reset
    const randomPassword = crypto.randomBytes(32).toString('base64url');

    // Create org + user on FREE tier
    const result = await createOrganization(
      prisma,
      orgName,
      email,
      emailPrefix,
      randomPassword,
    );

    // Create session
    let sessionId: string | null = null;
    try {
      sessionId = await createSession({
        userId: result.userId,
        organizationId: result.organizationId,
        role: UserRole.ORG_OWNER,
        email: email.toLowerCase().trim(),
      });
    } catch {
      // Redis not available
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session service unavailable. Please try again.' },
        { status: 503 },
      );
    }

    // For FREE plan, skip Stripe — go directly to success
    const normalizedPlan = plan?.toUpperCase();
    let checkoutUrl: string | undefined;

    const PAID_PLANS = new Set(['FOUNDERS_BETA', 'PRO', 'ENTERPRISE', 'MSSP']);

    if (normalizedPlan && PAID_PLANS.has(normalizedPlan)) {
      const validInterval = billingInterval === 'annual' ? 'annual' : 'monthly';
      const priceKey = validInterval === 'annual'
        ? `${normalizedPlan}_ANNUAL`
        : `${normalizedPlan}_MONTHLY`;

      const priceGetter = (STRIPE_PRICES as Record<string, (() => string) | undefined>)[priceKey];
      const priceId = priceGetter?.();

      if (priceId) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'http://localhost:3000';
        const checkout = await createCheckoutSession({
          organizationId: result.organizationId,
          email,
          priceId,
          successUrl: `${appUrl}/buy/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${appUrl}/buy`,
        });
        checkoutUrl = checkout.url;
      }
    }

    const response = NextResponse.json(
      {
        success: true,
        checkoutUrl: checkoutUrl || null,
      },
      { status: 201 },
    );

    setSessionCookie(response, sessionId);
    return response;
  } catch (error: unknown) {
    // Duplicate email
    if (
      error instanceof Error &&
      'code' in error &&
      (error as any).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Sign in to upgrade.' },
        { status: 409 },
      );
    }

    console.error('[API] POST /api/billing/quick-purchase error:', error instanceof Error ? error.stack : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
