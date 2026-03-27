import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// GET /api/upload/[jobId] — Poll job status
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    const job = await prisma.uploadJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      progress: {
        totalFindings: job.totalFindings,
        parsedFindings: job.parsedFindings,
        uniqueCvesFound: job.uniqueCvesFound,
        uniqueCvesEnriched: job.uniqueCvesEnriched,
        findingsCreated: job.findingsCreated,
        casesCreated: job.casesCreated,
      },
      error: job.errorMessage ?? undefined,
      timestamps: {
        created: job.createdAt,
        updated: job.updatedAt,
        completed: job.completedAt ?? null,
      },
    });
  } catch (error) {
    console.error('[API] GET /api/upload/[jobId] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 },
    );
  }
}
