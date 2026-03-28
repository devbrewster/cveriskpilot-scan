import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@cveriskpilot/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId } = await context.params;
    const body = await request.json();
    const { userId, role } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 },
      );
    }

    // Check team exists
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if already a member
    const existing = await prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId, teamId } },
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
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query param is required' },
        { status: 400 },
      );
    }

    const existing = await prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'User is not a member of this team' },
        { status: 404 },
      );
    }

    await prisma.teamMembership.delete({
      where: { userId_teamId: { userId, teamId } },
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
