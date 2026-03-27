import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const connector = await getConnector(prisma, id);

    if (!connector) {
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
    const { id } = await context.params;
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
      connector = await getConnector(prisma, id);
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
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
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
