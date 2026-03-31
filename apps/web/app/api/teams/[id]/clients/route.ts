import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, checkCsrf, requireRole, WRITE_ROLES } from '@cveriskpilot/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const roleCheck = requireRole(session.role, WRITE_ROLES);
    if (roleCheck) return roleCheck;

    const { id: teamId } = await context.params;
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 },
      );
    }

    // Check team exists and belongs to the user's organization
    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId: session.organizationId },
    });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Verify client belongs to the same organization
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId: session.organizationId },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check if already assigned (team org-ownership verified above)
    const existing = await prisma.clientTeamAssignment.findFirst({
      where: {
        teamId,
        clientId,
        team: { organizationId: session.organizationId },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Client is already assigned to this team' },
        { status: 409 },
      );
    }

    const assignment = await prisma.clientTeamAssignment.create({
      data: { teamId, clientId },
      include: {
        client: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/teams/[id]/clients error:', error);
    return NextResponse.json(
      { error: 'Failed to assign client to team' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError2 = checkCsrf(request);
    if (csrfError2) return csrfError2;

    const roleCheck = requireRole(session.role, WRITE_ROLES);
    if (roleCheck) return roleCheck;

    const { id: teamId } = await context.params;

    // Verify team belongs to user's organization
    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId: session.organizationId },
    });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId query param is required' },
        { status: 400 },
      );
    }

    // Verify assignment exists and team belongs to org (defense in depth)
    const existing = await prisma.clientTeamAssignment.findFirst({
      where: {
        teamId,
        clientId,
        team: { organizationId: session.organizationId },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Client is not assigned to this team' },
        { status: 404 },
      );
    }

    await prisma.clientTeamAssignment.deleteMany({
      where: { teamId, clientId, team: { organizationId: session.organizationId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/teams/[id]/clients error:', error);
    return NextResponse.json(
      { error: 'Failed to unassign client from team' },
      { status: 500 },
    );
  }
}
