import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { SyncOrchestrator } from '@cveriskpilot/connectors';

// ---------------------------------------------------------------------------
// HMAC Verification
// ---------------------------------------------------------------------------

/**
 * Verify the HMAC-SHA256 signature from the Snyk webhook.
 * Snyk sends the signature in the `x-hub-signature` header as `sha256=<hex>`.
 */
function verifySnykSignature(
  payload: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;

  // Snyk sends "sha256=<hex_digest>"
  const parts = signature.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf-8')
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(parts[1]!, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// POST /api/connectors/webhook/snyk
// ---------------------------------------------------------------------------

/**
 * Snyk webhook receiver.
 * - No session auth (external webhook)
 * - Verifies HMAC-SHA256 signature
 * - Identifies the connector/org from the payload
 * - Enqueues a sync job via the orchestrator
 * - Returns 200 immediately (async processing)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Read raw body for HMAC verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature');

    // Parse payload early so we can identify the connector
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 },
      );
    }

    // Identify which connector this webhook belongs to.
    // Snyk webhooks include the org ID in the payload. We also support
    // a `connectorId` query param for explicit routing.
    const url = new URL(request.url);
    const connectorIdParam = url.searchParams.get('connectorId');

    // Snyk payload structure: { org: { id: "..." }, ... }
    const snykOrgId =
      (payload.org as Record<string, unknown> | undefined)?.id as string | undefined;

    // Find the matching connector
    let connector;

    if (connectorIdParam) {
      // Explicit connector ID in query params (preferred)
      connector = await prisma.scannerConnector.findFirst({
        where: {
          id: connectorIdParam,
          type: 'SNYK',
          isApiConnector: true,
        },
      });
    } else if (snykOrgId) {
      // Match by Snyk org ID stored in scannerConfig
      connector = await prisma.scannerConnector.findFirst({
        where: {
          type: 'SNYK',
          isApiConnector: true,
          // Look for the Snyk org ID in the scanner config JSON
          scannerConfig: {
            path: ['snykOrgId'],
            equals: snykOrgId,
          },
        },
      });
    }

    if (!connector) {
      console.warn(
        `[webhook/snyk] No matching connector found. connectorId=${connectorIdParam ?? 'none'}, snykOrgId=${snykOrgId ?? 'none'}`,
      );
      return NextResponse.json(
        { error: 'No matching connector found for this webhook' },
        { status: 404 },
      );
    }

    // Verify HMAC signature using the connector's webhook secret
    // The webhook secret is stored in scannerConfig.webhookSecret
    const scannerConfig = (connector.scannerConfig as Record<string, unknown>) ?? {};
    const webhookSecret = scannerConfig.webhookSecret as string | undefined;

    if (!webhookSecret) {
      console.error(
        `[webhook/snyk] Connector ${connector.id} has no webhookSecret configured`,
      );
      return NextResponse.json(
        { error: 'Webhook secret not configured for this connector' },
        { status: 500 },
      );
    }

    if (!verifySnykSignature(rawBody, signature, webhookSecret)) {
      console.warn(
        `[webhook/snyk] Invalid signature for connector ${connector.id}`,
      );
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 },
      );
    }

    // Enqueue a sync job (async processing — return 200 immediately)
    const orchestrator = new SyncOrchestrator(prisma);
    const jobId = await orchestrator.enqueueSyncJob(connector.id, 'WEBHOOK');

    // Audit log for webhook receipt
    await prisma.auditLog
      .create({
        data: {
          organizationId: connector.organizationId,
          actorId: 'system:webhook:snyk',
          action: 'CREATE',
          entityType: 'SyncJob',
          entityId: jobId,
          details: {
            source: 'snyk_webhook',
            connectorId: connector.id,
            trigger: 'WEBHOOK',
            snykOrgId: snykOrgId ?? null,
            eventType: (payload.event as string) ?? null,
            processingTimeMs: Date.now() - startTime,
          },
          hash: `webhook-snyk-${connector.id}-${Date.now()}`,
        },
      })
      .catch((err: unknown) => {
        // Audit log failure should not block webhook response
        console.error('[webhook/snyk] Failed to create audit log:', err);
      });

    console.log(
      `[webhook/snyk] Enqueued sync job ${jobId} for connector ${connector.id} (trigger=WEBHOOK)`,
    );

    return NextResponse.json({ received: true, jobId });
  } catch (error) {
    console.error('[API] POST /api/connectors/webhook/snyk error:', error);
    // Always return 200 to prevent Snyk from retrying on server errors
    // that aren't related to signature validation
    return NextResponse.json(
      { received: false, error: 'Internal processing error' },
      { status: 500 },
    );
  }
}
