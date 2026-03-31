import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePerm, checkCsrf } from '@cveriskpilot/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { id } = await context.params;

    const team = await prisma.team.findUnique({
      where: { id, organizationId: session.organizationId },
      include: {
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        clientAssignments: {
          include: {
            client: {
              select: { id: true, name: true, slug: true, isActive: true },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error('[API] GET /api/teams/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to load team' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const permError = requirePerm(session.role, 'org:manage_teams');
    if (permError) return permError;

    const { id } = await context.params;
    const body = await request.json();
    const { name, description } = body;

    // Input validation — type-check provided fields
    if (name !== undefined && typeof name !== 'string') {
      return NextResponse.json({ error: 'name must be a string' }, { status: 400 });
    }
    if (description !== undefined && description !== null && typeof description !== 'string') {
      return NextResponse.json({ error: 'description must be a string or null' }, { status: 400 });
    }

    const existing = await prisma.team.findUnique({ where: { id, organizationId: session.organizationId } });
    if (!existing) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;

    const team = await prisma.team.update({ where: { id, organizationId: session.organizationId }, data });

    return NextResponse.json({ team });
  } catch (error) {
    console.error('[API] PUT /api/teams/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update team' },
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

    const permError2 = requirePerm(session.role, 'org:manage_teams');
    if (permError2) return permError2;

    const { id } = await context.params;

    const existing = await prisma.team.findUnique({ where: { id, organizationId: session.organizationId } });
    if (!existing) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Delete memberships and client assignments first, then the team
    await prisma.$transaction([
      prisma.clientTeamAssignment.deleteMany({ where: { teamId: id } }),
      prisma.teamMembership.deleteMany({ where: { teamId: id } }),
      prisma.team.delete({ where: { id, organizationId: session.organizationId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/teams/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 },
    );
  }
}
