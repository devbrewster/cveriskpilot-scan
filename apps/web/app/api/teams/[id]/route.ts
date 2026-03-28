import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@cveriskpilot/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const team = await prisma.team.findUnique({
      where: { id },
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
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { name, description } = body;

    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;

    const team = await prisma.team.update({ where: { id }, data });

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
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Delete memberships and client assignments first, then the team
    await prisma.$transaction([
      prisma.clientTeamAssignment.deleteMany({ where: { teamId: id } }),
      prisma.teamMembership.deleteMany({ where: { teamId: id } }),
      prisma.team.delete({ where: { id } }),
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
