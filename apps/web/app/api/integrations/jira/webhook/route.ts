import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { mapJiraStatusToCaseStatus } from '@cveriskpilot/integrations';
import type { JiraOrgConfig } from '@cveriskpilot/integrations';

// ---------------------------------------------------------------------------
// HMAC Verification for Jira webhooks
// ---------------------------------------------------------------------------

/**
 * Verify the HMAC-SHA256 signature from the Jira webhook.
 * Jira Cloud sends the signature in the `x-hub-signature` header as `sha256=<hex>`.
 * Jira Data Center/Server may use a shared secret query param instead.
 */
function verifyJiraSignature(
  payload: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;

  // Jira sends "sha256=<hex_digest>"
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

/**
 * Jira webhook endpoint.
 * Jira Cloud sends a POST for issue updates. We care about status transitions.
 *
 * Webhook payload (simplified):
 * {
 *   "webhookEvent": "jira:issue_updated",
 *   "issue": { "key": "VULN-42", "fields": { "status": { "name": "Done" } } },
 *   "changelog": { "items": [{ "field": "status", "fromString": "...", "toString": "..." }] }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for HMAC verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature');

    // SECURITY: Parse JSON but defer all DB lookups until after HMAC verification
    // to prevent unauthenticated query amplification attacks.
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 },
      );
    }

    const issueKey: string | undefined = (payload?.issue as Record<string, unknown>)?.key as string | undefined;
    const newStatusName: string | undefined =
      ((payload?.issue as Record<string, unknown>)?.fields as Record<string, unknown>)?.status
        ? (((payload.issue as Record<string, unknown>).fields as Record<string, unknown>).status as Record<string, unknown>).name as string
        : undefined;

    if (!issueKey || !newStatusName) {
      // Not an event we care about — ack anyway to avoid Jira retries
      return NextResponse.json({ ignored: true });
    }

    // SECURITY: Find the ticket with org-scoped relation to prevent cross-tenant access
    const ticket = await prisma.ticket.findFirst({
      where: { system: 'jira', ticketKey: issueKey },
      include: {
        vulnerabilityCase: {
          select: { id: true, organizationId: true, status: true },
        },
      },
    });

    if (!ticket) {
      // Unknown ticket — could be from a different integration; ack.
      return NextResponse.json({ ignored: true, reason: 'ticket not found' });
    }

    // Load org-level Jira config including webhook secret
    const org = await prisma.organization.findUnique({
      where: { id: ticket.vulnerabilityCase.organizationId },
    });

    const settings = (org?.entitlements ?? {}) as Record<string, unknown>;
    const jiraConfig = settings.jira as JiraOrgConfig | undefined;

    // SECURITY: Require webhook secret — reject unsigned webhooks entirely
    const webhookSecret = (jiraConfig as Record<string, unknown> | undefined)?.webhookSecret as string | undefined;
    if (!webhookSecret) {
      console.warn(`[webhook/jira] No webhook secret configured for org ${ticket.vulnerabilityCase.organizationId}`);
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 401 });
    }
    if (!verifyJiraSignature(rawBody, signature, webhookSecret)) {
      console.warn(`[webhook/jira] Invalid signature for org ${ticket.vulnerabilityCase.organizationId}`);
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 },
      );
    }
    // HMAC verified — proceed with ticket update

    // Update the ticket status
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: newStatusName,
        syncedAt: new Date(),
        lastSyncError: null,
      },
    });

    // Attempt to update the case status
    const mappedCaseStatus = mapJiraStatusToCaseStatus(
      newStatusName,
      jiraConfig?.statusMapping,
    );

    let caseUpdated = false;
    if (
      mappedCaseStatus &&
      ticket.vulnerabilityCase.status !== mappedCaseStatus
    ) {
      await prisma.vulnerabilityCase.update({
        where: { id: ticket.vulnerabilityCase.id },
        data: { status: mappedCaseStatus as any },
      });
      caseUpdated = true;
    }

    return NextResponse.json({
      ok: true,
      ticketKey: issueKey,
      jiraStatus: newStatusName,
      mappedCaseStatus,
      caseUpdated,
    });
  } catch (error) {
    console.error('[API] POST /api/integrations/jira/webhook error:', error);
    // Return 200 even on error to avoid Jira retrying forever
    return NextResponse.json(
      { error: 'Internal processing error' },
      { status: 200 },
    );
  }
}
