import { NextRequest, NextResponse } from 'next/server';
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
    // Return 200 to prevent Stripe from retrying on application errors
    // Only signature verification failures should return 400
    if (message.includes('signature') || message.includes('Webhook')) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    return NextResponse.json({ received: true, error: message });
  }
}
