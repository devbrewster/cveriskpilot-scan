import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, validateExternalUrl, encryptForTenant, requireRole, ADMIN_ROLES } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { DEFAULT_JIRA_TO_CASE_STATUS } from '@cveriskpilot/integrations';
import type { JiraOrgConfig } from '@cveriskpilot/integrations';

/**
 * GET  — retrieve the org's current Jira integration config.
 * PUT  — update the org's Jira integration config.
 */

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { organizationId } = session;

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
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const roleError = requireRole(session.role, ADMIN_ROLES);
    if (roleError) return roleError;

    const { organizationId } = session;

    const body = await request.json();
    const {
      baseUrl,
      email,
      apiToken,
      projectKey,
      issueType,
      statusMapping,
    } = body as {
      baseUrl?: string;
      email?: string;
      apiToken?: string;
      projectKey?: string;
      issueType?: string;
      statusMapping?: Record<string, string>;
    };

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const settings = (org.entitlements ?? {}) as Record<string, unknown>;
    const existingJira = (settings.jira ?? {}) as Partial<JiraOrgConfig>;

    // SSRF protection — validate baseUrl
    const effectiveBaseUrl = baseUrl ?? existingJira.baseUrl ?? '';
    if (effectiveBaseUrl) {
      const urlCheck = validateExternalUrl(effectiveBaseUrl);
      if (!urlCheck.valid) {
        return NextResponse.json({ error: `Invalid baseUrl: ${urlCheck.reason}` }, { status: 400 });
      }
    }

    // Encrypt API token before storing
    let storedApiToken = existingJira.apiToken ?? '';
    if (apiToken) {
      try {
        const encrypted = await encryptForTenant(apiToken, organizationId);
        storedApiToken = JSON.stringify(encrypted);
      } catch {
        return NextResponse.json(
          { error: 'Encryption service unavailable. Cannot store secrets.' },
          { status: 503 },
        );
      }
    }

    // Merge — only overwrite provided fields
    const updatedJira: JiraOrgConfig = {
      baseUrl: effectiveBaseUrl,
      email: email ?? existingJira.email ?? '',
      apiToken: storedApiToken,
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

    logAudit({
      organizationId,
      actorId: session.userId,
      action: 'UPDATE',
      entityType: 'JiraConfig',
      entityId: organizationId,
      details: { baseUrl: updatedJira.baseUrl, email: updatedJira.email, projectKey: updatedJira.projectKey },
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
