import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@cveriskpilot/auth';
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

    const { id } = await context.params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid connector ID' },
        { status: 400 },
      );
    }

    // Load connector and verify org ownership
    const connector = await prisma.scannerConnector.findUnique({
      where: { id },
    });

    if (!connector) {
      return NextResponse.json(
        { error: 'Connector not found' },
        { status: 404 },
      );
    }

    if (connector.organizationId !== session.organizationId) {
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
        return NextResponse.json(
          { ok: false, message: `Credential error: ${error.message}` },
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

      // Classify common error types
      if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
        result = { ok: false, message: `Network error: Unable to reach endpoint. ${message}` };
      } else if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        result = { ok: false, message: `Connection timed out: ${message}` };
      } else if (message.includes('401') || message.includes('403') || message.includes('Unauthorized')) {
        result = { ok: false, message: `Authentication failed: ${message}` };
      } else {
        result = { ok: false, message: `Connection test failed: ${message}` };
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
