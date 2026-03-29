import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@cveriskpilot/auth';
import { getExportJob } from '../route';

// ---------------------------------------------------------------------------
// GET /api/export/bulk/[jobId] — Check export status and download
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { jobId } = await params;
    const job = await getExportJob(jobId);

    if (!job || job.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Export job not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';

    // If download requested and job is completed, return the file
    if (download && job.status === 'completed' && job.result) {
      const contentType = job.format === 'csv'
        ? 'text/csv; charset=utf-8'
        : 'application/json; charset=utf-8';

      return new Response(job.result, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${job.filename}"`,
        },
      });
    }

    // Return job status
    return NextResponse.json({
      jobId: job.id,
      type: job.type,
      format: job.format,
      status: job.status,
      progress: job.progress,
      totalRecords: job.totalRecords,
      processedRecords: job.processedRecords,
      filename: job.filename,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      downloadUrl: job.status === 'completed'
        ? `/api/export/bulk/${job.id}?download=true`
        : null,
    });
  } catch (error) {
    console.error('[API] GET /api/export/bulk/[jobId] error:', error);
    return NextResponse.json({ error: 'Failed to check export status' }, { status: 500 });
  }
}
