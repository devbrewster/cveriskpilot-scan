import { Storage } from '@google-cloud/storage';
import { createHash } from 'node:crypto';
import type { UploadParams, UploadResult } from '../types.js';

// ---------------------------------------------------------------------------
// Lazy-initialised GCS client (uses ADC in production)
// ---------------------------------------------------------------------------

let _storage: Storage | null = null;

function getStorage(): Storage {
  if (!_storage) {
    _storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
    });
  }
  return _storage;
}

function getBucketName(): string {
  const bucket = process.env.GCS_BUCKET_ARTIFACTS;
  if (!bucket) {
    throw new Error(
      'GCS_BUCKET_ARTIFACTS environment variable is not set',
    );
  }
  return bucket;
}

// ---------------------------------------------------------------------------
// Checksum helper
// ---------------------------------------------------------------------------

export function computeSha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

// ---------------------------------------------------------------------------
// GCS path builder
// ---------------------------------------------------------------------------

export function buildGcsPath(
  organizationId: string,
  clientId: string,
  filename: string,
): string {
  const timestamp = Date.now();
  return `orgs/${organizationId}/clients/${clientId}/${timestamp}-${filename}`;
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

const RESUMABLE_THRESHOLD = 5 * 1024 * 1024; // 5 MB

export async function uploadToGCS(params: UploadParams): Promise<UploadResult> {
  const { buffer, filename, organizationId, clientId, mimeType } = params;

  const bucketName = getBucketName();
  const gcsPath = buildGcsPath(organizationId, clientId, filename);
  const checksumSha256 = computeSha256(buffer);
  const sizeBytes = buffer.length;

  const storage = getStorage();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(gcsPath);

  const resumable = sizeBytes > RESUMABLE_THRESHOLD;

  await file.save(buffer, {
    resumable,
    contentType: mimeType,
    metadata: {
      metadata: {
        checksum: checksumSha256,
        organizationId,
        clientId,
        uploadedAt: new Date().toISOString(),
      },
    },
  });

  return { gcsBucket: bucketName, gcsPath, checksumSha256, sizeBytes };
}

// ---------------------------------------------------------------------------
// Download (for re-processing)
// ---------------------------------------------------------------------------

export async function downloadFromGCS(
  bucket: string,
  path: string,
): Promise<Buffer> {
  const storage = getStorage();
  const [contents] = await storage.bucket(bucket).file(path).download();
  return contents;
}

// ---------------------------------------------------------------------------
// Signed URL (for download links)
// ---------------------------------------------------------------------------

export async function generateSignedUrl(
  bucket: string,
  path: string,
  expiresMinutes = 60,
): Promise<string> {
  const storage = getStorage();
  const [url] = await storage
    .bucket(bucket)
    .file(path)
    .getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresMinutes * 60 * 1000,
    });
  return url;
}
