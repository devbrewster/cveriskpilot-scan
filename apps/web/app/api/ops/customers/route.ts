import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search')?.toLowerCase() ?? '';
    const tierFilter = searchParams.get('tier')?.toUpperCase() ?? '';
    const sortBy = searchParams.get('sortBy') ?? 'name';
    const sortOrder = (searchParams.get('sortOrder') ?? 'asc') as 'asc' | 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));

    // Build where clause
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tierFilter && ['FREE', 'FOUNDERS_BETA', 'PRO', 'ENTERPRISE', 'MSSP'].includes(tierFilter)) {
      where.tier = tierFilter;
    }

    // Determine sort field mapping
    const sortFieldMap: Record<string, string> = {
      name: 'name',
      tier: 'tier',
      signupDate: 'createdAt',
      lastActiveAt: 'updatedAt',
    };
    const orderField = sortFieldMap[sortBy] ?? 'name';

    const [orgs, totalCount] = await Promise.all([
      prisma.organization.findMany({
        where,
        orderBy: { [orderField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              users: true,
              uploadJobs: true,
            },
          },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    // Map to response shape the frontend expects
    const customers = orgs.map((org) => ({
      id: org.id,
      name: org.name,
      tier: org.tier,
      status: 'active', // No status field on Organization — derive from deletedAt
      signupDate: org.createdAt.toISOString(),
      mrr: 0, // Would need Stripe lookup for real MRR
      userCount: org._count.users,
      scanCount: org._count.uploadJobs,
      lastActiveAt: org.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error('[API] GET /api/ops/customers error:', error);
    return NextResponse.json(
      { error: 'Failed to load customer list' },
      { status: 500 },
    );
  }
}
