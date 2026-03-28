import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';
import { sendWebhook } from '@cveriskpilot/integrations';
import type { WebhookPayload } from '@cveriskpilot/integrations';

// ---------------------------------------------------------------------------
// POST /api/webhooks/test — send a test webhook to a registered endpoint
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.organizationId;
    const body = await request.json();
    const { endpointId } = body as {
      endpointId: string;
    };

    if (!endpointId) {
      return NextResponse.json(
        { error: 'endpointId is required' },
        { status: 400 },
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { entitlements: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const entitlements = org.entitlements as Record<string, unknown> | null;
    const endpoints = (
      Array.isArray(entitlements?.webhookEndpoints)
        ? entitlements!.webhookEndpoints
        : []
    ) as Array<{ id: string; url: string; secret: string; events: string[] }>;

    const endpoint = endpoints.find((e) => e.id === endpointId);
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }

    const testPayload: WebhookPayload = {
      id: crypto.randomUUID(),
      eventType: 'case.created',
      timestamp: new Date().toISOString(),
      organizationId,
      data: {
        test: true,
        message: 'This is a test webhook from CVERiskPilot',
        caseId: 'test-case-id',
        title: 'Test Vulnerability Case',
        severity: 'MEDIUM',
      },
    };

    const result = await sendWebhook(
      endpoint.url,
      endpoint.secret,
      'case.created',
      testPayload,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] POST /api/webhooks/test error:', error);
    return NextResponse.json({ error: 'Failed to send test webhook' }, { status: 500 });
  }
}
