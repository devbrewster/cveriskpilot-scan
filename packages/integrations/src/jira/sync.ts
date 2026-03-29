// -----------------------------------------------------------------------------
// Jira bi-directional sync logic
// -----------------------------------------------------------------------------

import type { PrismaClient } from '@cveriskpilot/domain';
import { JiraClient, JiraApiError } from './client';
import type { JiraDocContent } from './types';
import { mapJiraStatusToCaseStatus } from './status-mapping';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert plain text to Atlassian Document Format. */
function textToAdf(text: string): JiraDocContent {
  return {
    type: 'doc',
    version: 1,
    content: text.split('\n\n').map((paragraph) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: paragraph }],
    })),
  };
}

function severityToJiraPriority(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return 'Highest';
    case 'HIGH':
      return 'High';
    case 'MEDIUM':
      return 'Medium';
    case 'LOW':
      return 'Low';
    case 'INFO':
      return 'Lowest';
    default:
      return 'Medium';
  }
}

// ---------------------------------------------------------------------------
// Push: CVERiskPilot case -> Jira issue
// ---------------------------------------------------------------------------

export interface PushResult {
  ticketId: string;
  jiraKey: string;
  jiraUrl: string;
}

/**
 * Create a Jira issue from an existing VulnerabilityCase and persist
 * a Ticket record linking the two.
 */
export async function pushCaseToJira(
  prisma: PrismaClient,
  jiraClient: JiraClient,
  caseId: string,
  projectKey: string,
  issueType: string = 'Bug',
): Promise<PushResult> {
  const vulnCase = await prisma.vulnerabilityCase.findUniqueOrThrow({
    where: { id: caseId },
    include: { findings: { take: 5 } },
  });

  // Build description
  const lines: string[] = [];
  lines.push(`Severity: ${vulnCase.severity}`);
  if (vulnCase.cvssScore !== null) lines.push(`CVSS: ${vulnCase.cvssScore}`);
  if (vulnCase.epssScore !== null)
    lines.push(`EPSS: ${(vulnCase.epssScore * 100).toFixed(2)}%`);
  if (vulnCase.kevListed) lines.push('KEV: Listed');
  if (vulnCase.cveIds.length > 0) lines.push(`CVEs: ${vulnCase.cveIds.join(', ')}`);
  if (vulnCase.description) lines.push(`\n${vulnCase.description}`);

  const created = await jiraClient.createIssue({
    fields: {
      project: { key: projectKey },
      summary: vulnCase.title,
      description: textToAdf(lines.join('\n')),
      issuetype: { name: issueType },
      priority: { name: severityToJiraPriority(vulnCase.severity) },
      labels: ['cveriskpilot', ...vulnCase.cveIds],
    },
  });

  const jiraUrl = `${jiraClient['baseUrl']}/browse/${created.key}`;

  const ticket = await prisma.ticket.create({
    data: {
      organizationId: vulnCase.organizationId,
      vulnerabilityCaseId: caseId,
      system: 'jira',
      ticketKey: created.key,
      ticketUrl: jiraUrl,
      status: 'To Do',
      syncedAt: new Date(),
    },
  });

  return {
    ticketId: ticket.id,
    jiraKey: created.key,
    jiraUrl,
  };
}

// ---------------------------------------------------------------------------
// Pull: Jira issue status -> CVERiskPilot ticket / case
// ---------------------------------------------------------------------------

export interface PullResult {
  ticketId: string;
  jiraKey: string;
  previousStatus: string;
  currentStatus: string;
  caseStatusUpdated: boolean;
}

/**
 * Fetch the current status of a Jira issue and update the local Ticket.
 * Optionally updates the VulnerabilityCase status if a mapping exists.
 */
export async function pullJiraStatus(
  prisma: PrismaClient,
  jiraClient: JiraClient,
  ticketId: string,
  statusMapping?: Record<string, string> | null,
): Promise<PullResult> {
  const ticket = await prisma.ticket.findUniqueOrThrow({
    where: { id: ticketId },
  });

  let jiraIssue;
  try {
    jiraIssue = await jiraClient.getIssue(ticket.ticketKey, [
      'status',
      'assignee',
    ]);
  } catch (err) {
    const message =
      err instanceof JiraApiError ? err.message : (err as Error).message;
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { lastSyncError: message, syncedAt: new Date() },
    });
    throw err;
  }

  const jiraStatus = jiraIssue.fields.status?.name ?? 'Unknown';
  const previousStatus = ticket.status;

  // Update ticket record
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: jiraStatus,
      assignee: jiraIssue.fields.assignee?.displayName ?? null,
      syncedAt: new Date(),
      lastSyncError: null,
    },
  });

  // Attempt to map Jira status to a CaseStatus
  let caseStatusUpdated = false;
  const mappedCaseStatus = mapJiraStatusToCaseStatus(jiraStatus, statusMapping);

  if (mappedCaseStatus) {
    const vulnCase = await prisma.vulnerabilityCase.findUnique({
      where: { id: ticket.vulnerabilityCaseId },
    });

    if (vulnCase && vulnCase.status !== mappedCaseStatus) {
      await prisma.vulnerabilityCase.update({
        where: { id: ticket.vulnerabilityCaseId },
        data: { status: mappedCaseStatus as any },
      });
      caseStatusUpdated = true;
    }
  }

  return {
    ticketId: ticket.id,
    jiraKey: ticket.ticketKey,
    previousStatus,
    currentStatus: jiraStatus,
    caseStatusUpdated,
  };
}

// ---------------------------------------------------------------------------
// Batch sync: all open tickets for an org
// ---------------------------------------------------------------------------

export interface SyncAllResult {
  total: number;
  synced: number;
  errors: { ticketId: string; error: string }[];
}

/**
 * Sync all open (non-closed) tickets for a given organization.
 */
export async function syncAllTickets(
  prisma: PrismaClient,
  jiraClient: JiraClient,
  orgId: string,
  statusMapping?: Record<string, string> | null,
): Promise<SyncAllResult> {
  // Find all tickets belonging to cases in this org where status is not a
  // terminal Jira state.
  const tickets = await prisma.ticket.findMany({
    where: {
      system: 'jira',
      vulnerabilityCase: {
        organizationId: orgId,
      },
      NOT: {
        status: { in: ['Done', "Won't Do"] },
      },
    },
  });

  const result: SyncAllResult = {
    total: tickets.length,
    synced: 0,
    errors: [],
  };

  for (const ticket of tickets) {
    try {
      await pullJiraStatus(prisma, jiraClient, ticket.id, statusMapping);
      result.synced++;
    } catch (err) {
      result.errors.push({
        ticketId: ticket.id,
        error: (err as Error).message,
      });
    }
  }

  return result;
}
