import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { JiraClient, syncAllTickets } from '@cveriskpilot/integrations';
import type { JiraOrgConfig } from '@cveriskpilot/integrations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId } = body as { organizationId?: string };

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 },
      );
    }

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

    const jiraClient = new JiraClient({
      baseUrl: jiraConfig.baseUrl,
      email: jiraConfig.email,
      apiToken: jiraConfig.apiToken,
    });

    const result = await syncAllTickets(
      prisma as any,
      jiraClient,
      organizationId,
      jiraConfig.statusMapping,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] POST /api/integrations/jira/sync error:', error);
    return NextResponse.json(
      { error: (error as Error).message ?? 'Failed to sync Jira tickets' },
      { status: 500 },
    );
  }
}
