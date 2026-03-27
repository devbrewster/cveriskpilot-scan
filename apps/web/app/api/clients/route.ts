import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 },
      );
    }

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
    const body = await request.json();
    const { organizationId, name, industry, contactEmail, contactName } = body;

    if (!organizationId || !name) {
      return NextResponse.json(
        { error: 'organizationId and name are required' },
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
        // Store additional fields in the future or via schema extension
        // For now we persist what the schema supports
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
