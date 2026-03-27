import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processHeartbeat } from '@cveriskpilot/integrations/connectors/connector-manager';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/connectors/[id]/heartbeat
 * Receive a heartbeat from a scanner connector agent.
 * Body: { version, scannerVersion, status, metrics? }
 */
export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { version, scannerVersion, status, metrics } = body;

    if (!version || !scannerVersion || !status) {
      return NextResponse.json(
        { error: 'version, scannerVersion, and status are required' },
        { status: 400 },
      );
    }

    const validStatuses = ['online', 'offline', 'degraded'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 },
      );
    }

    const connector = await processHeartbeat(prisma, id, {
      connectorId: id,
      timestamp: new Date(),
      version,
      scannerVersion,
      status,
      metrics,
    });

    return NextResponse.json({
      status: connector.status,
      message: 'Heartbeat received',
    });
  } catch (error) {
    console.error('[API] POST /api/connectors/[id]/heartbeat error:', error);
    return NextResponse.json(
      { error: 'Failed to process heartbeat' },
      { status: 500 },
    );
  }
}
