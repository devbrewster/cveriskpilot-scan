import type { PrismaClient } from '@prisma/client';
import type { EnqueueParams } from '../types.js';

// ---------------------------------------------------------------------------
// Cloud Tasks client (lazy, production only)
// ---------------------------------------------------------------------------

let _tasksClient: any = null;

async function getTasksClient() {
  if (!_tasksClient) {
    const { CloudTasksClient } = await import('@google-cloud/tasks');
    _tasksClient = new CloudTasksClient();
  }
  return _tasksClient;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function getWorkerUrl(): string {
  return process.env.WORKER_URL ?? 'http://localhost:3001';
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

// ---------------------------------------------------------------------------
// Enqueue an upload job
// ---------------------------------------------------------------------------

export async function enqueueUploadJob(
  prisma: PrismaClient,
  params: EnqueueParams,
): Promise<string> {
  const { organizationId, clientId, artifactId, uploadedById } = params;

  // Create the UploadJob record with QUEUED status
  const job = await prisma.uploadJob.create({
    data: {
      organizationId,
      clientId,
      artifactId,
      status: 'QUEUED',
    },
  });

  const payload = {
    jobId: job.id,
    artifactId,
    organizationId,
    clientId,
  };

  if (isProduction()) {
    await createCloudTask(payload);
  } else {
    // In development, import and call the consumer directly
    // Use dynamic import to avoid circular dependency at module level
    const { processUploadJob } = await import('./job-consumer.js');
    // Fire and forget — do not await so the caller gets the jobId immediately
    processUploadJob(job.id, prisma).catch((err) => {
      console.error(`[dev] Upload job ${job.id} failed:`, err);
    });
  }

  return job.id;
}

// ---------------------------------------------------------------------------
// Cloud Tasks integration (production)
// ---------------------------------------------------------------------------

async function createCloudTask(payload: Record<string, string>): Promise<void> {
  const projectId = process.env.GCS_PROJECT_ID;
  const location = process.env.CLOUD_TASKS_LOCATION ?? 'us-central1';
  const queue = process.env.CLOUD_TASKS_QUEUE ?? 'upload-processing';

  if (!projectId) {
    throw new Error('GCS_PROJECT_ID environment variable is not set');
  }

  const client = await getTasksClient();
  const parent = client.queuePath(projectId, location, queue);

  const workerUrl = getWorkerUrl();
  const body = Buffer.from(JSON.stringify(payload)).toString('base64');

  await client.createTask({
    parent,
    task: {
      httpRequest: {
        httpMethod: 'POST',
        url: `${workerUrl}/api/jobs/process`,
        headers: { 'Content-Type': 'application/json' },
        body,
      },
    },
  });
}
