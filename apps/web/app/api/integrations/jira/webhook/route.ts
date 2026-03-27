import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapJiraStatusToCaseStatus } from '@cveriskpilot/integrations';
import type { JiraOrgConfig } from '@cveriskpilot/integrations';

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
    const payload = await request.json();

    const issueKey: string | undefined = payload?.issue?.key;
    const newStatusName: string | undefined =
      payload?.issue?.fields?.status?.name;

    if (!issueKey || !newStatusName) {
      // Not an event we care about — ack anyway to avoid Jira retries
      return NextResponse.json({ ignored: true });
    }

    // Find the ticket by its Jira key
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

    // Load org-level status mapping
    const org = await prisma.organization.findUnique({
      where: { id: ticket.vulnerabilityCase.organizationId },
    });

    const settings = (org?.entitlements ?? {}) as Record<string, unknown>;
    const jiraConfig = settings.jira as JiraOrgConfig | undefined;

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
      { error: (error as Error).message },
      { status: 200 },
    );
  }
}
