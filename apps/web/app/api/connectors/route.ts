import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, validateExternalUrl, requireRole, MANAGE_ROLES, checkCsrf } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';
import {
  getConnectorStatus,
  registerConnector,
} from '@cveriskpilot/integrations/connectors/connector-manager';

/**
 * GET /api/connectors
 * List all connectors for an organization.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const organizationId = session.organizationId;
    const connectors = await getConnectorStatus(prisma, organizationId);

    return NextResponse.json({ connectors });
  } catch (error) {
    console.error('[API] GET /api/connectors error:', error);
    return NextResponse.json(
      { error: 'Failed to list connectors' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/connectors
 * Register a new scanner connector.
 * Body: { name, type, endpoint, authConfig, schedule? }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const roleError = requireRole(session.role, MANAGE_ROLES);
    if (roleError) return roleError;

    // CSRF protection
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const body = await request.json();
    const { name, type, endpoint, authConfig, schedule, metadata } = body;
    const organizationId = session.organizationId;

    if (!name || !type || !endpoint) {
      return NextResponse.json(
        { error: 'name, type, and endpoint are required' },
        { status: 400 },
      );
    }

    // SSRF protection — validate connector endpoint URL
    const urlCheck = validateExternalUrl(endpoint);
    if (!urlCheck.valid) {
      return NextResponse.json({ error: `Invalid endpoint URL: ${urlCheck.reason}` }, { status: 400 });
    }

    const validTypes = ['nessus', 'qualys', 'openvas', 'generic'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid connector type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 },
      );
    }

    const { connector, authKey } = await registerConnector(prisma, {
      orgId: organizationId,
      name,
      type,
      endpoint,
      authConfig: authConfig ?? { method: 'api_key' },
      schedule,
      status: 'pending',
      metadata,
    });

    // Audit log for connector registration
    await prisma.auditLog.create({
      data: {
        organizationId,
        actorId: session.userId,
        action: 'CREATE',
        entityType: 'Connector',
        entityId: connector.id,
        details: { name, type, endpoint },
        hash: `create-connector-${connector.id}-${Date.now()}`,
      },
    });

    return NextResponse.json(
      {
        connector,
        authKey, // Only returned on creation
        message: 'Connector registered. Save the authKey now — it will not be shown again.',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[API] POST /api/connectors error:', error);
    return NextResponse.json(
      { error: 'Failed to register connector' },
      { status: 500 },
    );
  }
}
