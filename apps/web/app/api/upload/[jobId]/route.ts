import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// GET /api/upload/[jobId] — Poll job status
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;

    const job = await prisma.uploadJob.findFirst({
      where: { id: jobId, organizationId: session.organizationId },
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
