import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, WRITE_ROLES } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { resolveClientScope } from '@/lib/client-scope';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const environment = searchParams.get('environment');
    const criticality = searchParams.get('criticality');
    const internetExposed = searchParams.get('internetExposed');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '12', 10);

    // Build Prisma where clause, scoped to organization + client
    const clientScope = await resolveClientScope(session);
    const where: Record<string, unknown> = {
      organizationId: session.organizationId,
      ...clientScope.where,
      deletedAt: null,
    };

    if (type) {
      where.type = type;
    }
    if (environment) {
      where.environment = environment.toUpperCase();
    }
    if (criticality) {
      // criticality is an enum (CRITICAL, HIGH, MEDIUM, LOW) — filter exact match
      where.criticality = criticality.toUpperCase();
    }
    if (internetExposed === 'true') {
      where.internetExposed = true;
    }

    const [items, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: { findings: true },
          },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    // Map to response shape matching what the frontend expects
    const mapped = items.map((a) => ({
      id: a.id,
      organizationId: a.organizationId,
      clientId: a.clientId,
      name: a.name,
      type: a.type,
      environment: a.environment.toLowerCase(),
      criticality: a.criticality,
      internetExposed: a.internetExposed,
      tags: a.tags,
      deploymentRefs: a.deploymentRefs ?? {},
      findingCount: a._count.findings,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      items: mapped,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error('[API] GET /api/assets error:', error);
    return NextResponse.json({ error: 'Failed to load assets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const roleError = requireRole(session.role, WRITE_ROLES);
    if (roleError) return roleError;

    const body = await request.json();
    const { name, type, environment, criticality, internetExposed, tags, clientId } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'name and type are required' },
        { status: 400 },
      );
    }

    const validTypes = ['HOST', 'REPOSITORY', 'CONTAINER_IMAGE', 'CLOUD_ACCOUNT', 'APPLICATION'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 },
      );
    }

    // Resolve clientId — use provided or pick the first client in the org
    let resolvedClientId = clientId;
    if (!resolvedClientId) {
      const firstClient = await prisma.client.findFirst({
        where: { organizationId: session.organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!firstClient) {
        return NextResponse.json(
          { error: 'No client found in organization. Create a client first.' },
          { status: 400 },
        );
      }
      resolvedClientId = firstClient.id;
    }

    const newAsset = await prisma.asset.create({
      data: {
        organizationId: session.organizationId,
        clientId: resolvedClientId,
        name,
        type,
        environment: (environment || 'PRODUCTION').toUpperCase(),
        criticality: (criticality || 'MEDIUM').toUpperCase(),
        internetExposed: internetExposed ?? false,
        tags: tags || [],
      },
    });

    logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: 'CREATE',
      entityType: 'Asset',
      entityId: newAsset.id,
      details: { name, type, environment: environment || 'PRODUCTION', criticality: criticality || 'MEDIUM' },
    });

    return NextResponse.json({
      id: newAsset.id,
      organizationId: newAsset.organizationId,
      clientId: newAsset.clientId,
      name: newAsset.name,
      type: newAsset.type,
      environment: newAsset.environment.toLowerCase(),
      criticality: newAsset.criticality,
      internetExposed: newAsset.internetExposed,
      tags: newAsset.tags,
      deploymentRefs: newAsset.deploymentRefs ?? {},
      findingCount: 0,
      createdAt: newAsset.createdAt.toISOString(),
      updatedAt: newAsset.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/assets error:', error);
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}
