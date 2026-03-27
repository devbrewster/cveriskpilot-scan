import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_JIRA_TO_CASE_STATUS } from '@cveriskpilot/integrations';
import type { JiraOrgConfig } from '@cveriskpilot/integrations';

/**
 * GET  — retrieve the org's current Jira integration config.
 * PUT  — update the org's Jira integration config.
 *
 * Both expect `organizationId` as a query param (GET) or body field (PUT).
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId query param is required' },
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
    const jiraConfig = (settings.jira ?? {}) as Partial<JiraOrgConfig>;

    // Never return the raw API token — mask it
    return NextResponse.json({
      baseUrl: jiraConfig.baseUrl ?? '',
      email: jiraConfig.email ?? '',
      hasApiToken: Boolean(jiraConfig.apiToken),
      projectKey: jiraConfig.projectKey ?? '',
      issueType: jiraConfig.issueType ?? 'Bug',
      statusMapping: jiraConfig.statusMapping ?? DEFAULT_JIRA_TO_CASE_STATUS,
    });
  } catch (error) {
    console.error('[API] GET /api/integrations/jira/config error:', error);
    return NextResponse.json(
      { error: 'Failed to load Jira config' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      baseUrl,
      email,
      apiToken,
      projectKey,
      issueType,
      statusMapping,
    } = body as {
      organizationId?: string;
      baseUrl?: string;
      email?: string;
      apiToken?: string;
      projectKey?: string;
      issueType?: string;
      statusMapping?: Record<string, string>;
    };

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
    const existingJira = (settings.jira ?? {}) as Partial<JiraOrgConfig>;

    // Merge — only overwrite provided fields
    const updatedJira: JiraOrgConfig = {
      baseUrl: baseUrl ?? existingJira.baseUrl ?? '',
      email: email ?? existingJira.email ?? '',
      apiToken: apiToken ?? existingJira.apiToken ?? '',
      projectKey: projectKey ?? existingJira.projectKey ?? '',
      issueType: issueType ?? existingJira.issueType ?? 'Bug',
      statusMapping:
        statusMapping ?? existingJira.statusMapping ?? DEFAULT_JIRA_TO_CASE_STATUS,
    };

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        entitlements: {
          ...settings,
          jira: updatedJira,
        } as any,
      },
    });

    return NextResponse.json({
      baseUrl: updatedJira.baseUrl,
      email: updatedJira.email,
      hasApiToken: Boolean(updatedJira.apiToken),
      projectKey: updatedJira.projectKey,
      issueType: updatedJira.issueType,
      statusMapping: updatedJira.statusMapping,
    });
  } catch (error) {
    console.error('[API] PUT /api/integrations/jira/config error:', error);
    return NextResponse.json(
      { error: 'Failed to update Jira config' },
      { status: 500 },
    );
  }
}
