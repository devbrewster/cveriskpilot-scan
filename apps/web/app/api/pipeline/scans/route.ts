import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));
    const verdict = searchParams.get('verdict');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build Prisma where clause, scoped to organization
    const where: Record<string, unknown> = {
      organizationId: session.organizationId,
    };

    // Map verdict filter to UploadJob status
    if (verdict && verdict !== 'all') {
      if (verdict === 'pass') {
        where.status = 'COMPLETED';
      } else if (verdict === 'fail') {
        where.status = 'FAILED';
      }
      // 'warn' has no direct mapping — skip filter
    }

    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (!isNaN(from.getTime())) createdAt.gte = from;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        if (!isNaN(to.getTime())) createdAt.lte = to;
      }
      if (Object.keys(createdAt).length > 0) {
        where.createdAt = createdAt;
      }
    }

    const [jobs, total] = await Promise.all([
      prisma.uploadJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          artifact: {
            select: {
              filename: true,
              parserFormat: true,
            },
          },
        },
      }),
      prisma.uploadJob.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Map UploadJob records to the scan response shape the frontend expects
    const scans = jobs.map((job) => {
      const hasFailures = job.status === 'FAILED';
      const verdict = hasFailures
        ? 'fail'
        : job.totalFindings > 0
          ? 'warn'
          : 'pass';

      return {
        scanId: job.id,
        repository: job.artifact?.filename ?? 'Unknown',
        branch: null,
        commitSha: null,
        prNumber: null,
        verdict,
        totalFindings: job.totalFindings,
        critical: 0, // detailed severity breakdown not stored on UploadJob
        high: 0,
        medium: 0,
        low: 0,
        controlsAffected: 0,
        frameworks: [],
        poamEntriesCreated: 0,
        casesCreated: job.casesCreated,
        findingsCreated: job.findingsCreated,
        status: job.status,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({
      scans,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error('Pipeline scans API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
