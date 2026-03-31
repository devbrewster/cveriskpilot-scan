import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePerm, checkCsrf } from '@cveriskpilot/auth';
import { createCustomerPortalSession } from '@cveriskpilot/billing';

/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session for managing subscriptions.
 * Returns the portal URL to redirect the user to.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const permError = requirePerm(session.role, 'org:manage_billing');
    if (permError) return permError;

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: session.organizationId },
      select: { stripeCustomerId: true },
    });

    if (!org.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found. Please upgrade first.' },
        { status: 400 },
      );
    }

    const { url } = await createCustomerPortalSession(org.stripeCustomerId);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[API] POST /api/billing/portal error:', error);
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 },
    );
  }
}
