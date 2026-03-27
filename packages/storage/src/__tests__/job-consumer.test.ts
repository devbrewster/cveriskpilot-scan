import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../gcs/upload.js', () => ({
  downloadFromGCS: vi.fn().mockResolvedValue(Buffer.from('<NessusClientData></NessusClientData>')),
}));

vi.mock('@cveriskpilot/parsers', () => ({
  detectFormat: vi.fn().mockReturnValue('NESSUS'),
  parse: vi.fn().mockResolvedValue({
    format: 'NESSUS',
    scannerName: 'Nessus',
    findings: [
      {
        title: 'Test Finding',
        cveIds: ['CVE-2024-1234', 'CVE-2024-5678'],
        cweIds: [],
        severity: 'HIGH',
        scannerType: 'VM',
        scannerName: 'Nessus',
        assetName: 'host-1',
        rawObservations: {},
        discoveredAt: new Date(),
        description: 'desc',
      },
    ],
    metadata: {
      totalFindings: 1,
      parseTimeMs: 50,
      errors: [],
    },
  }),
}));

import { processUploadJob } from '../jobs/job-consumer.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockPrisma(jobOverrides: Record<string, any> = {}) {
  const baseJob = {
    id: 'job-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    artifactId: 'artifact-1',
    status: 'QUEUED',
    totalFindings: 0,
    parsedFindings: 0,
    uniqueCvesFound: 0,
    uniqueCvesEnriched: 0,
    findingsCreated: 0,
    casesCreated: 0,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    artifact: {
      id: 'artifact-1',
      gcsBucket: 'test-bucket',
      gcsPath: 'orgs/org-1/clients/client-1/123-scan.nessus',
      filename: 'scan.nessus',
    },
    ...jobOverrides,
  };

  const updates: any[] = [];

  return {
    prisma: {
      uploadJob: {
        findUnique: vi.fn().mockResolvedValue(baseJob),
        update: vi.fn().mockImplementation(({ data }) => {
          updates.push(data);
          return Promise.resolve({ ...baseJob, ...data });
        }),
      },
    } as any,
    updates,
  };
}

describe('processUploadJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should transition through all statuses to COMPLETED', async () => {
    const { prisma, updates } = createMockPrisma();
    await processUploadJob('job-1', prisma);

    const statuses = updates
      .filter((u) => u.status)
      .map((u) => u.status);

    expect(statuses).toEqual([
      'PARSING',
      'ENRICHING',
      'BUILDING_CASES',
      'COMPLETED',
    ]);
  });

  it('should set completedAt when finished', async () => {
    const { prisma, updates } = createMockPrisma();
    await processUploadJob('job-1', prisma);

    const completedUpdate = updates.find((u) => u.status === 'COMPLETED');
    expect(completedUpdate?.completedAt).toBeInstanceOf(Date);
  });

  it('should count parsed findings and unique CVEs', async () => {
    const { prisma, updates } = createMockPrisma();
    await processUploadJob('job-1', prisma);

    const parseUpdate = updates.find((u) => u.parsedFindings !== undefined);
    expect(parseUpdate?.totalFindings).toBe(1);
    expect(parseUpdate?.parsedFindings).toBe(1);
    expect(parseUpdate?.uniqueCvesFound).toBe(2);
  });

  it('should throw and set FAILED status when job not found', async () => {
    const { prisma } = createMockPrisma();
    prisma.uploadJob.findUnique.mockResolvedValue(null);

    await expect(processUploadJob('bad-id', prisma)).rejects.toThrow(
      'UploadJob not found',
    );
  });

  it('should throw when job is not in QUEUED status', async () => {
    const { prisma } = createMockPrisma({ status: 'PARSING' });

    await expect(processUploadJob('job-1', prisma)).rejects.toThrow(
      'expected QUEUED',
    );
  });

  it('should set FAILED status and errorMessage on processing error', async () => {
    const { downloadFromGCS } = await import('../gcs/upload.js');
    (downloadFromGCS as any).mockRejectedValueOnce(new Error('GCS down'));

    const { prisma, updates } = createMockPrisma();
    await expect(processUploadJob('job-1', prisma)).rejects.toThrow('GCS down');

    const failUpdate = updates.find((u) => u.status === 'FAILED');
    expect(failUpdate).toBeDefined();
    expect(failUpdate?.errorMessage).toBe('GCS down');
  });
});
