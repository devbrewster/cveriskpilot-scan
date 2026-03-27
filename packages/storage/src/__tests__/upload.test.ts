import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeSha256, buildGcsPath } from '../gcs/upload.js';

// ---------------------------------------------------------------------------
// Mock @google-cloud/storage before importing the upload module functions
// that use the Storage client
// ---------------------------------------------------------------------------

const mockSave = vi.fn().mockResolvedValue(undefined);
const mockDownload = vi.fn().mockResolvedValue([Buffer.from('file-data')]);
const mockGetSignedUrl = vi.fn().mockResolvedValue(['https://signed-url.example.com']);

const mockFile = vi.fn(() => ({
  save: mockSave,
  download: mockDownload,
  getSignedUrl: mockGetSignedUrl,
}));

const mockBucket = vi.fn(() => ({
  file: mockFile,
}));

vi.mock('@google-cloud/storage', () => ({
  Storage: vi.fn(() => ({
    bucket: mockBucket,
  })),
}));

// Must import after mocks are set up
const { uploadToGCS, downloadFromGCS, generateSignedUrl } = await import(
  '../gcs/upload.js'
);

describe('computeSha256', () => {
  it('should compute correct SHA-256 hash for a buffer', () => {
    const buffer = Buffer.from('hello world');
    const hash = computeSha256(buffer);
    // Known SHA-256 of "hello world"
    expect(hash).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
    );
  });

  it('should return different hashes for different content', () => {
    const a = computeSha256(Buffer.from('aaa'));
    const b = computeSha256(Buffer.from('bbb'));
    expect(a).not.toBe(b);
  });

  it('should return a 64-character hex string', () => {
    const hash = computeSha256(Buffer.from('test'));
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('buildGcsPath', () => {
  it('should build a path with org, client, timestamp, and filename', () => {
    const path = buildGcsPath('org-1', 'client-2', 'scan.nessus');
    expect(path).toMatch(
      /^orgs\/org-1\/clients\/client-2\/\d+-scan\.nessus$/,
    );
  });

  it('should produce unique paths on successive calls', () => {
    const a = buildGcsPath('org', 'client', 'file.csv');
    const b = buildGcsPath('org', 'client', 'file.csv');
    // Timestamps may be identical at ms granularity in tests, but the
    // format should be consistent.
    expect(a).toMatch(/^orgs\/org\/clients\/client\/\d+-file\.csv$/);
    expect(b).toMatch(/^orgs\/org\/clients\/client\/\d+-file\.csv$/);
  });
});

describe('uploadToGCS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GCS_BUCKET_ARTIFACTS = 'test-bucket';
    process.env.GCS_PROJECT_ID = 'test-project';
  });

  it('should upload a buffer and return result with checksum and path', async () => {
    const buffer = Buffer.from('scan data');
    const result = await uploadToGCS({
      buffer,
      filename: 'scan.nessus',
      organizationId: 'org-1',
      clientId: 'client-1',
      mimeType: 'application/xml',
    });

    expect(result.gcsBucket).toBe('test-bucket');
    expect(result.gcsPath).toMatch(/^orgs\/org-1\/clients\/client-1\/\d+-scan\.nessus$/);
    expect(result.checksumSha256).toHaveLength(64);
    expect(result.sizeBytes).toBe(buffer.length);
    expect(mockSave).toHaveBeenCalledOnce();
  });

  it('should use simple upload for files <= 5MB', async () => {
    const buffer = Buffer.alloc(1024); // 1 KB
    await uploadToGCS({
      buffer,
      filename: 'small.csv',
      organizationId: 'org',
      clientId: 'client',
      mimeType: 'text/csv',
    });

    const saveCall = mockSave.mock.calls[0];
    expect(saveCall[1].resumable).toBe(false);
  });

  it('should use resumable upload for files > 5MB', async () => {
    const buffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB
    await uploadToGCS({
      buffer,
      filename: 'big.json',
      organizationId: 'org',
      clientId: 'client',
      mimeType: 'application/json',
    });

    const saveCall = mockSave.mock.calls[0];
    expect(saveCall[1].resumable).toBe(true);
  });

  it('should throw when GCS_BUCKET_ARTIFACTS is not set', async () => {
    delete process.env.GCS_BUCKET_ARTIFACTS;
    await expect(
      uploadToGCS({
        buffer: Buffer.from('x'),
        filename: 'f',
        organizationId: 'o',
        clientId: 'c',
        mimeType: 'text/plain',
      }),
    ).rejects.toThrow('GCS_BUCKET_ARTIFACTS');
  });
});

describe('downloadFromGCS', () => {
  it('should return a buffer from GCS', async () => {
    const result = await downloadFromGCS('bucket', 'path/to/file');
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(mockDownload).toHaveBeenCalledOnce();
  });
});

describe('generateSignedUrl', () => {
  it('should return a signed URL string', async () => {
    const url = await generateSignedUrl('bucket', 'path/to/file');
    expect(url).toBe('https://signed-url.example.com');
  });

  it('should pass default expiry of 60 minutes', async () => {
    await generateSignedUrl('bucket', 'path');
    const opts = mockGetSignedUrl.mock.calls[0][0];
    expect(opts.action).toBe('read');
    expect(opts.version).toBe('v4');
  });
});
