import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getSessionIdFromRequest,
  getSession,
  updateSession,
} from '@cveriskpilot/auth';

/**
 * POST /api/session/client
 *
 * Switch the active MSSP client context for the current session.
 * Body: { clientId: string | null }
 *   - string  → switch to that client (must belong to session's org)
 *   - null    → clear client context (org-wide view)
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = getSessionIdFromRequest(request);
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId } = body as { clientId: string | null };

    if (clientId === undefined) {
      return NextResponse.json(
        { error: 'clientId is required (string or null)' },
        { status: 400 },
      );
    }

    if (clientId !== null) {
      // Verify the client exists and belongs to this org
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          organizationId: session.organizationId,
          deletedAt: null,
        },
        select: { id: true, name: true },
      });

      if (!client) {
        return NextResponse.json(
          { error: 'Client not found or does not belong to this organization' },
          { status: 404 },
        );
      }

      const updated = await updateSession(sessionId, {
        clientId: client.id,
        clientName: client.name,
      });

      return NextResponse.json({ session: updated });
    }

    // clientId is null — clear client context for org-wide view
    const updated = await updateSession(sessionId, {
      clientId: undefined,
      clientName: undefined,
    });

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error('[API] POST /api/session/client error:', error);
    return NextResponse.json(
      { error: 'Failed to switch client context' },
      { status: 500 },
    );
  }
}
