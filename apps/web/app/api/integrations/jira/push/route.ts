import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { JiraClient, pushCaseToJira } from '@cveriskpilot/integrations';
import type { JiraOrgConfig } from '@cveriskpilot/integrations';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, projectKey } = body as {
      caseId?: string;
      projectKey?: string;
    };

    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
    }

    // Load the case to discover the org
    const vulnCase = await prisma.vulnerabilityCase.findUnique({
      where: { id: caseId },
      select: { organizationId: true },
    });

    if (!vulnCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Load Jira config from org settings
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: vulnCase.organizationId },
    });

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
        { error: 'projectKey is required (not set in org config either)' },
        { status: 400 },
      );
    }

    const jiraClient = new JiraClient({
      baseUrl: jiraConfig.baseUrl,
      email: jiraConfig.email,
      apiToken: jiraConfig.apiToken,
    });

    const result = await pushCaseToJira(
      prisma as any,
      jiraClient,
      caseId,
      effectiveProjectKey,
      jiraConfig.issueType,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/integrations/jira/push error:', error);
    return NextResponse.json(
      { error: (error as Error).message ?? 'Failed to push case to Jira' },
      { status: 500 },
    );
  }
}
