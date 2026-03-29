import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@cveriskpilot/auth';
import {
  getConnector,
  updateConnector,
  deleteConnector,
  rotateConnectorKey,
} from '@cveriskpilot/integrations/connectors/connector-manager';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/connectors/[id]
 * Get a single connector by ID.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid ID parameter' }, { status: 400 });
    }

    const connector = await getConnector(prisma, id);

    if (!connector) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 });
    }

    // Verify connector belongs to the user's organization
    if ((connector as any).organizationId && (connector as any).organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 });
    }

    return NextResponse.json({ connector });
  } catch (error) {
    console.error('[API] GET /api/connectors/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connector' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/connectors/[id]
 * Update connector configuration.
 * Body: { name?, endpoint?, authConfig?, schedule?, metadata?, rotateKey? }
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid ID parameter' }, { status: 400 });
    }

    // Verify connector belongs to the user's organization
    const existing = await getConnector(prisma, id);
    if (!existing) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 });
    }
    if ((existing as any).organizationId && (existing as any).organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, endpoint, authConfig, schedule, metadata, rotateKey } = body;

    // If key rotation requested, do that first
    let newAuthKey: string | undefined;
    if (rotateKey) {
      const result = await rotateConnectorKey(prisma, id);
      newAuthKey = result.authKey;
    }

    // Update other fields if provided
    const hasUpdates = name !== undefined || endpoint !== undefined || authConfig !== undefined || schedule !== undefined || metadata !== undefined;
    let connector;

    if (hasUpdates) {
      connector = await updateConnector(prisma, id, {
        name,
        endpoint,
        authConfig,
        schedule,
        metadata,
      });
    } else {
      connector = existing;
    }

    const response: Record<string, unknown> = { connector };
    if (newAuthKey) {
      response.authKey = newAuthKey;
      response.message = 'Key rotated. Save the new authKey now — it will not be shown again.';
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] PUT /api/connectors/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update connector' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/connectors/[id]
 * Delete a connector.
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid ID parameter' }, { status: 400 });
    }

    // Verify connector belongs to the user's organization
    const existing = await getConnector(prisma, id);
    if (!existing) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 });
    }
    if ((existing as any).organizationId && (existing as any).organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 });
    }

    await deleteConnector(prisma, id);
    return NextResponse.json({ message: 'Connector deleted' });
  } catch (error) {
    console.error('[API] DELETE /api/connectors/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete connector' },
      { status: 500 },
    );
  }
}
