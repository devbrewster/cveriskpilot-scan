import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, MANAGE_ROLES, checkCsrf } from '@cveriskpilot/auth';

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

    const roleError = requireRole(session.role, MANAGE_ROLES);
    if (roleError) return roleError;

    const { id: teamId } = await context.params;
    const body = await request.json();
    const { userId, role } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 },
      );
    }

    // Check team exists and belongs to user's org
    const team = await prisma.team.findUnique({ where: { id: teamId, organizationId: session.organizationId } });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if already a member (team org-ownership verified above)
    const existing = await prisma.teamMembership.findFirst({
      where: {
        userId,
        teamId,
        team: { organizationId: session.organizationId },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'User is already a member of this team' },
        { status: 409 },
      );
    }

    const membership = await prisma.teamMembership.create({
      data: {
        userId,
        teamId,
        role: role === 'OWNER' ? 'OWNER' : 'MEMBER',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/teams/[id]/members error:', error);
    return NextResponse.json(
      { error: 'Failed to add team member' },
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

    const roleError2 = requireRole(session.role, MANAGE_ROLES);
    if (roleError2) return roleError2;

    const { id: teamId } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query param is required' },
        { status: 400 },
      );
    }

    // Verify team belongs to user's org before modifying membership
    const team = await prisma.team.findUnique({ where: { id: teamId, organizationId: session.organizationId } });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Verify membership exists and team belongs to org (defense in depth)
    const existing = await prisma.teamMembership.findFirst({
      where: {
        userId,
        teamId,
        team: { organizationId: session.organizationId },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'User is not a member of this team' },
        { status: 404 },
      );
    }

    await prisma.teamMembership.deleteMany({
      where: { userId, teamId, team: { organizationId: session.organizationId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/teams/[id]/members error:', error);
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 },
    );
  }
}
