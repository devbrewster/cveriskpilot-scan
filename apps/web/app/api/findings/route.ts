import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import type { Prisma } from '@cveriskpilot/domain';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';
import { resolveClientScope } from '@/lib/client-scope';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { searchParams } = new URL(request.url);

    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const scannerType = searchParams.get('scannerType');
    const kevOnly = searchParams.get('kevOnly');
    const epssMin = searchParams.get('epssMin');
    const search = searchParams.get('search');
    const clientId = searchParams.get('clientId');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const sortBy = searchParams.get('sortBy') ?? 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') ?? 'desc') as 'asc' | 'desc';

    // Build where clause — always scope to the user's organization
    const clientScope = await resolveClientScope(session);
    const where: Prisma.FindingWhereInput = {
      organizationId: session.organizationId,
      ...clientScope.where,
    };

    // Allow further filtering by clientId param (if within accessible scope)
    if (clientId) {
      if (clientScope.clientIds && !clientScope.clientIds.includes(clientId)) {
        return NextResponse.json({ items: [], total: 0, page, totalPages: 0 });
      }
      where.clientId = clientId;
    }

    if (scannerType) {
      where.scannerType = scannerType as any;
    }

    // Filters that reference the related vulnerabilityCase
    const caseFilters: Prisma.VulnerabilityCaseWhereInput = {};
    let hasCaseFilter = false;

    if (severity) {
      caseFilters.severity = severity as any;
      hasCaseFilter = true;
    }

    if (status) {
      caseFilters.status = status as any;
      hasCaseFilter = true;
    }

    if (kevOnly === 'true') {
      caseFilters.kevListed = true;
      hasCaseFilter = true;
    }

    if (epssMin) {
      const minScore = parseFloat(epssMin);
      if (!isNaN(minScore)) {
        caseFilters.epssScore = { gte: minScore };
        hasCaseFilter = true;
      }
    }

    if (search) {
      caseFilters.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { cveIds: { has: search.toUpperCase() } },
      ];
      hasCaseFilter = true;
    }

    if (hasCaseFilter) {
      where.vulnerabilityCase = caseFilters;
    }

    // Determine sort field — only allow known safe columns
    const allowedSortFields = ['createdAt', 'discoveredAt', 'scannerType'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [findings, total] = await Promise.all([
      prisma.finding.findMany({
        where,
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              type: true,
              environment: true,
              criticality: true,
            },
          },
          vulnerabilityCase: {
            select: {
              id: true,
              title: true,
              severity: true,
              status: true,
              cveIds: true,
              epssScore: true,
              kevListed: true,
            },
          },
        },
        orderBy: { [safeSortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.finding.count({ where }),
    ]);

    return NextResponse.json({
      findings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[API] GET /api/findings error:', error);
    return NextResponse.json(
      { error: 'Failed to load findings' },
      { status: 500 },
    );
  }
}
