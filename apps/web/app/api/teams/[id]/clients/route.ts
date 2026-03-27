import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: teamId } = await context.params;
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 },
      );
    }

    // Check team exists
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if already assigned
    const existing = await prisma.clientTeamAssignment.findUnique({
      where: { teamId_clientId: { teamId, clientId } },
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
    const { id: teamId } = await context.params;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId query param is required' },
        { status: 400 },
      );
    }

    const existing = await prisma.clientTeamAssignment.findUnique({
      where: { teamId_clientId: { teamId, clientId } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Client is not assigned to this team' },
        { status: 404 },
      );
    }

    await prisma.clientTeamAssignment.delete({
      where: { teamId_clientId: { teamId, clientId } },
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
