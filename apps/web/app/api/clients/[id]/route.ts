import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assets: true,
            findings: true,
            vulnerabilityCases: true,
            uploadJobs: true,
          },
        },
        clientTeamAssignments: {
          include: {
            team: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!client || client.deletedAt) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('[API] GET /api/clients/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to load client' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, isActive } = body;

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) {
      data.name = name;
      data.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    if (isActive !== undefined) {
      data.isActive = isActive;
    }

    const client = await prisma.client.update({
      where: { id },
      data,
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error('[API] PUT /api/clients/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Soft-delete
    await prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/clients/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 },
    );
  }
}
