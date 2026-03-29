import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession, requireRole, MANAGE_ROLES, checkCsrf } from '@cveriskpilot/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.organizationId;

    const teams = await prisma.team.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: {
            memberships: true,
            clientAssignments: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          take: 5, // Preview of first 5 members
        },
        clientAssignments: {
          include: {
            client: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = teams.map((team: any) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      createdAt: team.createdAt,
      memberCount: team._count.memberships,
      clientCount: team._count.clientAssignments,
      members: team.memberships.map((m: any) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      })),
      clients: team.clientAssignments.map((a: any) => ({
        id: a.client.id,
        name: a.client.name,
      })),
    }));

    return NextResponse.json({ teams: result });
  } catch (error) {
    console.error('[API] GET /api/teams error:', error);
    return NextResponse.json(
      { error: 'Failed to load teams' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleError = requireRole(session.role, MANAGE_ROLES);
    if (roleError) return roleError;

    // CSRF protection
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 },
      );
    }

    const team = await prisma.team.create({
      data: {
        organizationId: session.organizationId,
        name,
        description: description || null,
      },
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/teams error:', error);
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 },
    );
  }
}
