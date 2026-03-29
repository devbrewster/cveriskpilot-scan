import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Query parameter validation */
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/connectors/[id]/sync-history
 * List SyncJob records for a connector with pagination.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { id } = await context.params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid connector ID' },
        { status: 400 },
      );
    }

    // Parse and validate query params
    const url = new URL(request.url);
    const parseResult = querySchema.safeParse({
      page: url.searchParams.get('page') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parseResult.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { page, limit } = parseResult.data;

    // Verify connector exists and belongs to this org
    const connector = await prisma.scannerConnector.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });

    if (!connector) {
      return NextResponse.json(
        { error: 'Connector not found' },
        { status: 404 },
      );
    }

    if (connector.organizationId !== session.organizationId) {
      return NextResponse.json(
        { error: 'Connector not found' },
        { status: 404 },
      );
    }

    // Fetch paginated sync jobs
    const skip = (page - 1) * limit;

    const [jobs, total] = await prisma.$transaction([
      prisma.syncJob.findMany({
        where: { connectorId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          status: true,
          trigger: true,
          findingsReceived: true,
          findingsCreated: true,
          casesCreated: true,
          casesUpdated: true,
          totalChunks: true,
          processedChunks: true,
          errorMessage: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
        },
      }),
      prisma.syncJob.count({ where: { connectorId: id } }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[API] GET /api/connectors/[id]/sync-history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync history' },
      { status: 500 },
    );
  }
}
