import { Storage } from '@google-cloud/storage';
import { createHash } from 'node:crypto';
import type { UploadParams, UploadResult } from '../types';
import { uploadToLocal } from './local-upload';

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
  jobId?: string,
): string {
  if (jobId) {
    return `${organizationId}/scans/${jobId}/${filename}`;
  }
  const timestamp = Date.now();
  return `orgs/${organizationId}/clients/${clientId}/${timestamp}-${filename}`;
}

// ---------------------------------------------------------------------------
// File validation
// ---------------------------------------------------------------------------

const ALLOWED_EXTENSIONS = new Set([
  '.xml', '.json', '.csv', '.xlsx', '.sarif', '.nessus', '.html', '.txt', '.pdf',
]);

/**
 * Validates and sanitizes an upload filename.
 * Returns { valid: true } if OK, or { valid: false, error } with a reason.
 */
export function validateUploadFile(filename: string): { valid: boolean; error?: string } {
  if (!filename || filename.trim().length === 0) {
    return { valid: false, error: 'Filename is empty' };
  }

  // Strip path traversal components
  const sanitized = sanitizeFilename(filename);

  // Check extension
  const dotIndex = sanitized.lastIndexOf('.');
  if (dotIndex === -1) {
    return { valid: false, error: `File has no extension. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}` };
  }
  const ext = sanitized.slice(dotIndex).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Extension "${ext}" is not allowed. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}` };
  }

  return { valid: true };
}

/**
 * Sanitize a filename: strip path separators and traversal sequences,
 * replace non-alphanumeric characters (except -, _, .) with underscores.
 */
export function sanitizeFilename(filename: string): string {
  let name = filename;
  // Remove path traversal sequences
  name = name.replace(/\.\./g, '');
  // Remove path separators
  name = name.replace(/[/\\]/g, '');
  // Replace non-safe characters with underscore
  name = name.replace(/[^a-zA-Z0-9\-_.]/g, '_');
  // Collapse multiple underscores
  name = name.replace(/_{2,}/g, '_');
  // Remove leading/trailing underscores and dots
  name = name.replace(/^[_.]+|[_.]+$/g, '');
  return name || 'unnamed_file';
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

const RESUMABLE_THRESHOLD = 5 * 1024 * 1024; // 5 MB

export async function uploadToGCS(params: UploadParams): Promise<UploadResult> {
  // Fall back to local filesystem when GCS is not configured (local dev)
  if (!process.env.GCS_BUCKET_ARTIFACTS) {
    return uploadToLocal(params);
  }

  const { buffer, filename: rawFilename, organizationId, clientId, mimeType, jobId } = params;

  // Validate and sanitize filename
  const validation = validateUploadFile(rawFilename);
  if (!validation.valid) {
    throw new Error(`Upload rejected: ${validation.error}`);
  }
  const filename = sanitizeFilename(rawFilename);

  const bucketName = getBucketName();
  const gcsPath = buildGcsPath(organizationId, clientId, filename, jobId);
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
  expiresMinutes = 15,
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
