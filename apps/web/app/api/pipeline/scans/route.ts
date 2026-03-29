import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

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

    // Query PipelineScanResult first (richer data from CLI scans)
    const pipelineWhere: Record<string, unknown> = {
      organizationId: session.organizationId,
    };
    if (verdict && verdict !== 'all') {
      pipelineWhere.verdict = verdict;
    }
    if (where.createdAt) {
      pipelineWhere.createdAt = where.createdAt;
    }

    const [pipelineResults, pipelineTotal, jobs, uploadTotal] = await Promise.all([
      prisma.pipelineScanResult.findMany({
        where: pipelineWhere,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pipelineScanResult.count({ where: pipelineWhere }),
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

    const total = pipelineTotal + uploadTotal;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Map PipelineScanResult records (from CLI/API scans)
    const pipelineScans = pipelineResults.map((r) => ({
      scanId: r.id,
      repository: r.repoUrl ?? r.format,
      branch: r.branch,
      commitSha: r.commitSha,
      prNumber: r.prNumber,
      verdict: r.verdict,
      totalFindings: r.totalFindings,
      critical: r.criticalCount,
      high: r.highCount,
      medium: r.mediumCount,
      low: r.lowCount,
      controlsAffected: Array.isArray(r.complianceImpact) ? (r.complianceImpact as unknown[]).length : 0,
      frameworks: [],
      poamEntriesCreated: r.poamEntriesCreated,
      casesCreated: 0,
      findingsCreated: r.totalFindings,
      status: 'COMPLETED',
      errorMessage: null,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.createdAt.toISOString(),
    }));

    // Map UploadJob records (from file upload UI)
    const uploadScans = jobs.map((job) => {
      const hasFailures = job.status === 'FAILED';
      const v = hasFailures
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
        verdict: v,
        totalFindings: job.totalFindings,
        critical: 0,
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

    // Merge and sort by createdAt descending
    const scans = [...pipelineScans, ...uploadScans]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

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
