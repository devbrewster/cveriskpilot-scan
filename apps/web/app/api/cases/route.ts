import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@cveriskpilot/auth';
import { CursorPaginator } from '@cveriskpilot/db-scale';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const kevOnly = searchParams.get('kevOnly');
    const epssMin = searchParams.get('epssMin');
    const search = searchParams.get('search');
    const assignedToId = searchParams.get('assignedToId');
    const clientId = searchParams.get('clientId');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
    const sortBy = searchParams.get('sortBy') ?? 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') ?? 'desc') as 'asc' | 'desc';

    // Cursor-based pagination params
    const cursor = searchParams.get('cursor') ?? undefined;
    const cursorDirection = (searchParams.get('cursorDirection') ?? 'forward') as 'forward' | 'backward';
    const useCursorPagination = !!cursor || searchParams.has('cursor');

    // Build where clause — always scope to the user's organization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      organizationId: session.organizationId,
    };

    if (clientId) {
      where.clientId = clientId;
    }

    if (severity) {
      where.severity = severity as any;
    }

    if (status) {
      where.status = status as any;
    }

    if (kevOnly === 'true') {
      where.kevListed = true;
    }

    if (epssMin) {
      const minScore = parseFloat(epssMin);
      if (!isNaN(minScore)) {
        where.epssScore = { gte: minScore };
      }
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { cveIds: { has: search.toUpperCase() } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Determine sort field — only allow known safe columns
    const allowedSortFields = [
      'createdAt', 'updatedAt', 'severity', 'status', 'epssScore',
      'cvssScore', 'firstSeenAt', 'lastSeenAt', 'dueAt', 'findingCount',
    ];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    // -----------------------------------------------------------------------
    // Cursor-based pagination path
    // -----------------------------------------------------------------------
    if (useCursorPagination) {
      const paginator = new CursorPaginator<Record<string, unknown>>({
        cursorColumns: [
          { field: safeSortBy, order: sortOrder },
          { field: 'id', order: 'desc' }, // tie-breaker for stable sort
        ],
        defaultPageSize: 25,
        maxPageSize: 100,
      });

      const query = paginator.buildQuery({
        cursor,
        direction: cursorDirection,
        take: limit,
      });

      // Merge cursor WHERE with filter WHERE
      const mergedWhere = query.where && Object.keys(query.where).length > 0
        ? { AND: [where, query.where] }
        : where;

      const rows = await prisma.vulnerabilityCase.findMany({
        where: mergedWhere,
        include: {
          _count: { select: { findings: true } },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: query.orderBy,
        take: query.take,
      });

      const cursorPage = paginator.buildPage(rows, limit, cursor, cursorDirection);

      return NextResponse.json({
        cases: cursorPage.items,
        pageInfo: cursorPage.pageInfo,
        pagination: 'cursor',
      });
    }

    // -----------------------------------------------------------------------
    // Offset-based pagination path (legacy / default)
    // -----------------------------------------------------------------------
    const [cases, total] = await Promise.all([
      prisma.vulnerabilityCase.findMany({
        where,
        include: {
          _count: { select: { findings: true } },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { [safeSortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.vulnerabilityCase.count({ where }),
    ]);

    return NextResponse.json({
      cases,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      pagination: 'offset',
    });
  } catch (error) {
    console.error('[API] GET /api/cases error:', error);
    return NextResponse.json(
      { error: 'Failed to load cases' },
      { status: 500 },
    );
  }
}
