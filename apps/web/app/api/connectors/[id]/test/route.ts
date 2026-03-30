import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, requireRole, WRITE_ROLES, checkCsrf } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';
import {
  resolveCredentials,
  adapterRegistry,
  CredentialResolutionError,
} from '@cveriskpilot/connectors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/connectors/[id]/test
 * Test a scanner connector's connection by resolving credentials
 * and calling the adapter's testConnection method.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const roleCheck = requireRole(session.role, WRITE_ROLES);
    if (roleCheck) return roleCheck;

    const { id } = await context.params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid connector ID' },
        { status: 400 },
      );
    }

    // Load connector and verify org ownership
    const connector = await prisma.scannerConnector.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!connector) {
      return NextResponse.json(
        { error: 'Connector not found' },
        { status: 404 },
      );
    }

    // Resolve (decrypt) credentials
    let credentials;
    try {
      credentials = await resolveCredentials(connector, connector.organizationId, prisma);
    } catch (error) {
      if (error instanceof CredentialResolutionError) {
        console.error('[API] Credential resolution error:', error.message);
        return NextResponse.json(
          { ok: false, message: 'Failed to resolve connector credentials' },
          { status: 200 },
        );
      }
      throw error;
    }

    // Get the adapter for this connector type
    const adapter = adapterRegistry.get(connector.type);
    if (!adapter) {
      return NextResponse.json(
        {
          ok: false,
          message: `No adapter available for scanner type "${connector.type}". Available types: ${adapterRegistry.list().join(', ')}`,
        },
        { status: 200 },
      );
    }

    // Test the connection
    let result: { ok: boolean; message: string };
    try {
      result = await adapter.testConnection(credentials);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown connection error';
      console.error('[API] Connector test connection error:', message);

      // Classify common error types — return generic messages without internal details
      if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
        result = { ok: false, message: 'Network error: Unable to reach endpoint' };
      } else if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        result = { ok: false, message: 'Connection timed out' };
      } else if (message.includes('401') || message.includes('403') || message.includes('Unauthorized')) {
        result = { ok: false, message: 'Authentication failed' };
      } else {
        result = { ok: false, message: 'Connection test failed' };
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        actorId: session.userId,
        action: 'READ',
        entityType: 'Connector',
        entityId: connector.id,
        details: { action: 'test_connection', result: result.ok },
        hash: `test-connector-${connector.id}-${Date.now()}`,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] POST /api/connectors/[id]/test error:', error);
    return NextResponse.json(
      { error: 'Failed to test connector' },
      { status: 500 },
    );
  }
}
