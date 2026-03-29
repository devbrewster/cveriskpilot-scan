import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, MANAGE_ROLES } from '@cveriskpilot/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const organizationId = session.organizationId;

    const clients = await prisma.client.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            assets: true,
            findings: true,
            vulnerabilityCases: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Compute a basic risk score per client from their cases
    const clientsWithMetrics = await Promise.all(
      clients.map(async (client: any) => {
        const severityCounts = await prisma.vulnerabilityCase.groupBy({
          by: ['severity'],
          where: {
            clientId: client.id,
            organizationId,
          },
          _count: { id: true },
        });

        let riskScore = 0;
        for (const row of severityCounts) {
          const count = row._count.id;
          switch (row.severity) {
            case 'CRITICAL': riskScore += count * 10; break;
            case 'HIGH': riskScore += count * 5; break;
            case 'MEDIUM': riskScore += count * 2; break;
            case 'LOW': riskScore += count * 1; break;
            default: break;
          }
        }

        return {
          id: client.id,
          name: client.name,
          slug: client.slug,
          isActive: client.isActive,
          createdAt: client.createdAt,
          updatedAt: client.updatedAt,
          assetCount: client._count.assets,
          findingCount: client._count.findings,
          caseCount: client._count.vulnerabilityCases,
          riskScore,
        };
      }),
    );

    return NextResponse.json({ clients: clientsWithMetrics });
  } catch (error) {
    console.error('[API] GET /api/clients error:', error);
    return NextResponse.json(
      { error: 'Failed to load clients' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const roleError = requireRole(session.role, MANAGE_ROLES);
    if (roleError) return roleError;

    const organizationId = session.organizationId;
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 },
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check slug uniqueness within org
    const existing = await prisma.client.findUnique({
      where: {
        organizationId_slug: { organizationId, slug },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A client with this name already exists in the organization' },
        { status: 409 },
      );
    }

    const client = await prisma.client.create({
      data: {
        organizationId,
        name,
        slug,
        contactName: body.contactName ?? null,
        contactEmail: body.contactEmail ?? null,
        industry: body.industry ?? null,
        description: body.description ?? null,
        domain: body.domain ?? null,
      },
    });

    // Create a default SLA policy for the new client
    // (mirrors the onboarding pipeline pattern)
    await prisma.slaPolicy.create({
      data: {
        organizationId,
        name: 'Default SLA Policy',
        description: `Default SLA for ${name}`,
        criticalDays: 7,
        highDays: 30,
        mediumDays: 90,
        lowDays: 180,
        kevCriticalDays: 3,
        isDefault: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorId: session.userId,
        action: 'CREATE',
        entityType: 'Client',
        entityId: client.id,
        details: { name: client.name, slug: client.slug },
        hash: `create-client-${client.id}-${Date.now()}`,
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/clients error:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 },
    );
  }
}
