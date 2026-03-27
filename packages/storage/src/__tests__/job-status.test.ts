import { describe, it, expect, vi } from 'vitest';
import { getJobStatus, listOrgJobs } from '../jobs/job-status.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJob(overrides: Record<string, any> = {}) {
  return {
    id: 'job-1',
    status: 'COMPLETED',
    totalFindings: 10,
    parsedFindings: 10,
    uniqueCvesEnriched: 5,
    casesCreated: 3,
    errorMessage: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:05:00Z'),
    completedAt: new Date('2026-01-01T00:05:00Z'),
    ...overrides,
  };
}

function createMockPrisma(jobs: any[] = [makeJob()]) {
  return {
    uploadJob: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        const found = jobs.find((j) => j.id === where.id);
        return Promise.resolve(found ?? null);
      }),
      findMany: vi.fn().mockResolvedValue(jobs),
    },
  } as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getJobStatus', () => {
  it('should return a well-formed JobStatus object', async () => {
    const prisma = createMockPrisma();
    const status = await getJobStatus(prisma, 'job-1');

    expect(status.id).toBe('job-1');
    expect(status.status).toBe('COMPLETED');
    expect(status.progress).toEqual({
      total: 10,
      parsed: 10,
      enriched: 5,
      created: 3,
    });
    expect(status.timestamps.created).toBeInstanceOf(Date);
    expect(status.timestamps.completed).toBeInstanceOf(Date);
  });

  it('should include error field when errorMessage is set', async () => {
    const prisma = createMockPrisma([
      makeJob({ id: 'j2', status: 'FAILED', errorMessage: 'Parse failed' }),
    ]);
    const status = await getJobStatus(prisma, 'j2');
    expect(status.error).toBe('Parse failed');
  });

  it('should not include error field when errorMessage is null', async () => {
    const prisma = createMockPrisma();
    const status = await getJobStatus(prisma, 'job-1');
    expect(status.error).toBeUndefined();
  });

  it('should throw when job not found', async () => {
    const prisma = createMockPrisma([]);
    await expect(getJobStatus(prisma, 'nope')).rejects.toThrow(
      'UploadJob not found',
    );
  });
});

describe('listOrgJobs', () => {
  it('should return an array of JobStatus objects', async () => {
    const prisma = createMockPrisma([
      makeJob({ id: 'j1' }),
      makeJob({ id: 'j2' }),
    ]);
    const results = await listOrgJobs(prisma, 'org-1');
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('j1');
  });

  it('should pass limit and offset to findMany', async () => {
    const prisma = createMockPrisma();
    await listOrgJobs(prisma, 'org-1', { limit: 5, offset: 10 });

    const call = prisma.uploadJob.findMany.mock.calls[0][0];
    expect(call.take).toBe(5);
    expect(call.skip).toBe(10);
  });

  it('should filter by status when provided', async () => {
    const prisma = createMockPrisma();
    await listOrgJobs(prisma, 'org-1', { status: 'FAILED' });

    const call = prisma.uploadJob.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('FAILED');
  });

  it('should default to limit 20 and offset 0', async () => {
    const prisma = createMockPrisma();
    await listOrgJobs(prisma, 'org-1');

    const call = prisma.uploadJob.findMany.mock.calls[0][0];
    expect(call.take).toBe(20);
    expect(call.skip).toBe(0);
  });
});
