import type { PrismaClient } from '@prisma/client';
import type { JobStatus } from '../types.js';

// ---------------------------------------------------------------------------
// Job status queries
// ---------------------------------------------------------------------------

function toJobStatus(job: any): JobStatus {
  return {
    id: job.id,
    status: job.status,
    progress: {
      total: job.totalFindings,
      parsed: job.parsedFindings,
      enriched: job.uniqueCvesEnriched,
      created: job.casesCreated,
    },
    ...(job.errorMessage ? { error: job.errorMessage } : {}),
    timestamps: {
      created: job.createdAt,
      updated: job.updatedAt,
      completed: job.completedAt ?? null,
    },
  };
}

export async function getJobStatus(
  prisma: PrismaClient,
  jobId: string,
): Promise<JobStatus> {
  const job = await prisma.uploadJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error(`UploadJob not found: ${jobId}`);
  }

  return toJobStatus(job);
}

export interface ListOrgJobsOptions {
  limit?: number;
  offset?: number;
  status?: string;
}

export async function listOrgJobs(
  prisma: PrismaClient,
  organizationId: string,
  options: ListOrgJobsOptions = {},
): Promise<JobStatus[]> {
  const { limit = 20, offset = 0, status } = options;

  const where: any = { organizationId };
  if (status) {
    where.status = status;
  }

  const jobs = await prisma.uploadJob.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return jobs.map(toJobStatus);
}
