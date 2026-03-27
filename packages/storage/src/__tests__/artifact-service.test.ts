import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUploadResult = {
  gcsBucket: 'test-bucket',
  gcsPath: 'orgs/org-1/clients/client-1/123-scan.nessus',
  checksumSha256: 'abc123def456',
  sizeBytes: 1024,
};

vi.mock('../gcs/upload.js', () => ({
  uploadToGCS: vi.fn().mockResolvedValue({
    gcsBucket: 'test-bucket',
    gcsPath: 'orgs/org-1/clients/client-1/123-scan.nessus',
    checksumSha256: 'abc123def456',
    sizeBytes: 1024,
  }),
  generateSignedUrl: vi.fn().mockResolvedValue('https://signed.example.com/file'),
  downloadFromGCS: vi.fn().mockResolvedValue(Buffer.from('file-contents')),
}));

import {
  createArtifact,
  getArtifact,
  getArtifactDownloadUrl,
  getArtifactBuffer,
} from '../artifacts/artifact-service.js';

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

function createMockPrisma(overrides: Record<string, any> = {}) {
  const artifactRecord = {
    id: 'artifact-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    filename: 'scan.nessus',
    mimeType: 'application/xml',
    sizeBytes: 1024,
    gcsBucket: 'test-bucket',
    gcsPath: 'orgs/org-1/clients/client-1/123-scan.nessus',
    checksumSha256: 'abc123def456',
    parserFormat: 'NESSUS',
    uploadedById: 'user-1',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };

  return {
    scanArtifact: {
      create: vi.fn().mockResolvedValue(artifactRecord),
      findUnique: vi.fn().mockResolvedValue(artifactRecord),
    },
  } as any;
}

describe('createArtifact', () => {
  it('should upload to GCS and create a DB record', async () => {
    const prisma = createMockPrisma();
    const result = await createArtifact(prisma, {
      file: Buffer.from('scan data'),
      filename: 'scan.nessus',
      mimeType: 'application/xml',
      organizationId: 'org-1',
      clientId: 'client-1',
      uploadedById: 'user-1',
      parserFormat: 'NESSUS',
    });

    expect(result.id).toBe('artifact-1');
    expect(result.gcsBucket).toBe('test-bucket');
    expect(result.checksumSha256).toBe('abc123def456');
    expect(prisma.scanArtifact.create).toHaveBeenCalledOnce();

    const createCall = prisma.scanArtifact.create.mock.calls[0][0];
    expect(createCall.data.organizationId).toBe('org-1');
    expect(createCall.data.clientId).toBe('client-1');
    expect(createCall.data.sizeBytes).toBe(1024);
  });
});

describe('getArtifact', () => {
  it('should return the artifact when found', async () => {
    const prisma = createMockPrisma();
    const result = await getArtifact(prisma, 'artifact-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('artifact-1');
  });

  it('should return null when not found', async () => {
    const prisma = createMockPrisma();
    prisma.scanArtifact.findUnique.mockResolvedValue(null);
    const result = await getArtifact(prisma, 'nonexistent');
    expect(result).toBeNull();
  });
});

describe('getArtifactDownloadUrl', () => {
  it('should return a signed URL for an existing artifact', async () => {
    const prisma = createMockPrisma();
    const url = await getArtifactDownloadUrl(prisma, 'artifact-1');
    expect(url).toBe('https://signed.example.com/file');
  });

  it('should throw when artifact not found', async () => {
    const prisma = createMockPrisma();
    prisma.scanArtifact.findUnique.mockResolvedValue(null);
    await expect(
      getArtifactDownloadUrl(prisma, 'nonexistent'),
    ).rejects.toThrow('Artifact not found');
  });
});

describe('getArtifactBuffer', () => {
  it('should return a buffer for an existing artifact', async () => {
    const prisma = createMockPrisma();
    const buf = await getArtifactBuffer(prisma, 'artifact-1');
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it('should throw when artifact not found', async () => {
    const prisma = createMockPrisma();
    prisma.scanArtifact.findUnique.mockResolvedValue(null);
    await expect(
      getArtifactBuffer(prisma, 'nonexistent'),
    ).rejects.toThrow('Artifact not found');
  });
});
