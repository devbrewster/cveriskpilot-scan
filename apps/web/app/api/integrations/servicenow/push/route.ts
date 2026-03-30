import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, requireRole, WRITE_ROLES, checkCsrf } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';
import {
  ServiceNowClient,
  mapCaseToIncident,
} from '@cveriskpilot/integrations';
import type { ServiceNowConfig } from '@cveriskpilot/integrations';
import type { CaseFields } from '@cveriskpilot/integrations';

export const dynamic = 'force-dynamic';

interface StoredServiceNowConfig {
  instanceUrl: string;
  authType: 'basic' | 'oauth2';
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  assignmentGroup?: string;
  category?: string;
}

/**
 * Build a ServiceNowConfig from the stored org config.
 */
function buildClientConfig(stored: StoredServiceNowConfig): ServiceNowConfig {
  if (stored.authType === 'oauth2') {
    return {
      instanceUrl: stored.instanceUrl,
      auth: {
        type: 'oauth2',
        clientId: stored.clientId ?? '',
        clientSecret: stored.clientSecret ?? '',
        tokenUrl: stored.tokenUrl,
      },
    };
  }

  return {
    instanceUrl: stored.instanceUrl,
    auth: {
      type: 'basic',
      username: stored.username ?? '',
      password: stored.password ?? '',
    },
  };
}

/**
 * POST — push a vulnerability case to ServiceNow as an incident.
 *
 * Body: { caseId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const roleCheck = requireRole(session.role, WRITE_ROLES);
    if (roleCheck) return roleCheck;

    const body = await request.json();
    const { caseId } = body as { caseId?: string };

    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
    }

    // Load the case to discover the org
    const vulnCase = await prisma.vulnerabilityCase.findFirst({
      where: { id: caseId, organizationId: session.organizationId },
      include: { findings: { take: 5 } },
    });

    if (!vulnCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Load ServiceNow config from org settings
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: vulnCase.organizationId },
    });

    const settings = (org.entitlements ?? {}) as Record<string, unknown>;
    const snConfig = settings.servicenow as StoredServiceNowConfig | undefined;

    if (!snConfig?.instanceUrl) {
      return NextResponse.json(
        { error: 'ServiceNow integration is not configured for this organization' },
        { status: 422 },
      );
    }

    // Validate required auth credentials
    if (snConfig.authType === 'oauth2') {
      if (!snConfig.clientId || !snConfig.clientSecret) {
        return NextResponse.json(
          { error: 'ServiceNow OAuth2 credentials are incomplete' },
          { status: 422 },
        );
      }
    } else {
      if (!snConfig.username || !snConfig.password) {
        return NextResponse.json(
          { error: 'ServiceNow basic auth credentials are incomplete' },
          { status: 422 },
        );
      }
    }

    const clientConfig = buildClientConfig(snConfig);
    const client = new ServiceNowClient(clientConfig);

    // Map case to incident data
    const caseFields: CaseFields = {
      caseId: vulnCase.id,
      title: vulnCase.title,
      description: vulnCase.description ?? undefined,
      severity: vulnCase.severity as CaseFields['severity'],
      status: vulnCase.status,
      cvssScore: vulnCase.cvssScore ?? null,
      epssScore: vulnCase.epssScore ?? null,
      kevListed: vulnCase.kevListed ?? false,
      cveIds: vulnCase.cveIds ?? [],
      createdAt: vulnCase.createdAt,
      updatedAt: vulnCase.updatedAt,
    };

    const incidentData = mapCaseToIncident(caseFields);

    // Apply org-level defaults
    if (snConfig.assignmentGroup) {
      incidentData.assignment_group = snConfig.assignmentGroup;
    }
    if (snConfig.category) {
      incidentData.category = snConfig.category;
    }

    const incident = await client.createIncident(incidentData);

    const incidentUrl = `${snConfig.instanceUrl}/nav_to.do?uri=incident.do?sys_id=${incident.sys_id}`;

    // Store a Ticket record linking the case to the ServiceNow incident
    const ticket = await prisma.ticket.create({
      data: {
        organizationId: session.organizationId,
        vulnerabilityCaseId: caseId,
        system: 'servicenow',
        ticketKey: incident.number,
        ticketUrl: incidentUrl,
        status: 'New',
        syncedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        ticketId: ticket.id,
        incidentSysId: incident.sys_id,
        incidentNumber: incident.number,
        incidentUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[API] POST /api/integrations/servicenow/push error:', error);
    return NextResponse.json(
      { error: (error as Error).message ?? 'Failed to push case to ServiceNow' },
      { status: 500 },
    );
  }
}
