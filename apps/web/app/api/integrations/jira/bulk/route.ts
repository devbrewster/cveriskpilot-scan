import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';
import { JiraClient, pushCaseToJira } from '@cveriskpilot/integrations';
import type { JiraOrgConfig } from '@cveriskpilot/integrations';

interface BulkItemResult {
  caseId: string;
  success: boolean;
  jiraKey?: string;
  jiraUrl?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { organizationId } = session;

    const body = await request.json();
    const { caseIds, projectKey } = body as {
      caseIds?: string[];
      projectKey?: string;
    };

    if (!caseIds || !Array.isArray(caseIds) || caseIds.length === 0) {
      return NextResponse.json(
        { error: 'caseIds array is required and must not be empty' },
        { status: 400 },
      );
    }

    // Load Jira config
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const settings = (org.entitlements ?? {}) as Record<string, unknown>;
    const jiraConfig = settings.jira as JiraOrgConfig | undefined;

    if (!jiraConfig?.baseUrl || !jiraConfig?.email || !jiraConfig?.apiToken) {
      return NextResponse.json(
        { error: 'Jira integration is not configured for this organization' },
        { status: 422 },
      );
    }

    const effectiveProjectKey = projectKey ?? jiraConfig.projectKey;
    if (!effectiveProjectKey) {
      return NextResponse.json(
        { error: 'projectKey is required' },
        { status: 400 },
      );
    }

    const jiraClient = new JiraClient({
      baseUrl: jiraConfig.baseUrl,
      email: jiraConfig.email,
      apiToken: jiraConfig.apiToken,
    });

    // Filter out cases that already have a Jira ticket
    const existingTickets = await prisma.ticket.findMany({
      where: {
        system: 'jira',
        vulnerabilityCaseId: { in: caseIds },
      },
      select: { vulnerabilityCaseId: true },
    });
    const alreadyLinked = new Set(existingTickets.map((t: any) => t.vulnerabilityCaseId));

    const results: BulkItemResult[] = [];

    for (const caseId of caseIds) {
      if (alreadyLinked.has(caseId)) {
        results.push({
          caseId,
          success: false,
          error: 'Case already has a Jira ticket',
        });
        continue;
      }

      try {
        const pushResult = await pushCaseToJira(
          prisma as any,
          jiraClient,
          caseId,
          effectiveProjectKey,
          jiraConfig.issueType,
        );
        results.push({
          caseId,
          success: true,
          jiraKey: pushResult.jiraKey,
          jiraUrl: pushResult.jiraUrl,
        });
      } catch (err) {
        results.push({
          caseId,
          success: false,
          error: (err as Error).message,
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({ total: caseIds.length, succeeded, failed, results });
  } catch (error) {
    console.error('[API] POST /api/integrations/jira/bulk error:', error);
    return NextResponse.json(
      { error: (error as Error).message ?? 'Bulk Jira ticket creation failed' },
      { status: 500 },
    );
  }
}
