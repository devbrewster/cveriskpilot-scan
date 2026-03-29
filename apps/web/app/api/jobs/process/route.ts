import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/jobs/process
 *
 * Called by Google Cloud Tasks (production) to process an upload job.
 * The request body is JSON with { jobId, artifactId, organizationId, clientId }.
 */
export async function POST(request: NextRequest) {
  // Verify the request comes from Cloud Tasks or an authenticated PLATFORM_ADMIN
  const taskHeader = request.headers.get('x-cloudtasks-taskname');
  const queueHeader = request.headers.get('x-cloudtasks-queuename');

  if (!taskHeader || !queueHeader) {
    // Not a Cloud Tasks request — require PLATFORM_ADMIN session
    const { requireAuth } = await import('@cveriskpilot/auth');
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;
    if (session.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const payload = await request.json();
    const { jobId } = payload;

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid jobId' },
        { status: 400 },
      );
    }

    const { processUploadJob } = await import(
      '@cveriskpilot/storage/jobs/job-consumer'
    );

    await processUploadJob(jobId, prisma);

    return NextResponse.json({ status: 'completed', jobId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[worker] Job processing failed:', message);

    // Return 200 so Cloud Tasks doesn't retry on application-level errors.
    // The job status is already set to FAILED inside processUploadJob.
    return NextResponse.json({ status: 'failed', error: message });
  }
}
