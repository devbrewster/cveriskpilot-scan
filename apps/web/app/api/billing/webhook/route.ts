import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature, handleWebhookEvent } from '@cveriskpilot/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    const event = verifyWebhookSignature(body, signature);
    await handleWebhookEvent(event, prisma);

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[billing/webhook] Error processing webhook:', message);

    // Signature verification failures → 400 (Stripe won't retry)
    if (message.includes('signature') || message.includes('Webhook')) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Application errors → 500 so Stripe retries (transient DB/network failures)
    // Don't leak internal error details to external callers
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
