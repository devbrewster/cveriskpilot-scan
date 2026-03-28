import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import type { UploadParams, UploadResult } from '../types';

// ---------------------------------------------------------------------------
// Local filesystem upload fallback (used when GCS_BUCKET_ARTIFACTS is not set)
// ---------------------------------------------------------------------------

const UPLOADS_ROOT = join(process.cwd(), 'uploads');

// ---------------------------------------------------------------------------
// Ensure upload directory exists
// ---------------------------------------------------------------------------

export async function ensureUploadDir(
  orgId: string,
  clientId: string,
): Promise<string> {
  const dir = join(UPLOADS_ROOT, 'orgs', orgId, 'clients', clientId);
  await mkdir(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Upload to local filesystem
// ---------------------------------------------------------------------------

export async function uploadToLocal(
  params: UploadParams,
): Promise<UploadResult> {
  const { buffer, filename, organizationId, clientId, jobId } = params;

  const checksumSha256 = createHash('sha256').update(buffer).digest('hex');
  const sizeBytes = buffer.length;

  let gcsPath: string;
  let localPath: string;

  if (jobId) {
    // Use scan-based path: {orgId}/scans/{jobId}/{filename}
    const dir = join(UPLOADS_ROOT, organizationId, 'scans', jobId);
    await mkdir(dir, { recursive: true });
    localPath = join(dir, filename);
    gcsPath = `${organizationId}/scans/${jobId}/${filename}`;
  } else {
    const dir = await ensureUploadDir(organizationId, clientId);
    const timestamp = Date.now();
    const localFilename = `${timestamp}-${filename}`;
    localPath = join(dir, localFilename);
    gcsPath = `orgs/${organizationId}/clients/${clientId}/${localFilename}`;
  }

  await writeFile(localPath, buffer);

  return {
    gcsBucket: 'local',
    gcsPath,
    checksumSha256,
    sizeBytes,
  };
}

// ---------------------------------------------------------------------------
// Download from local filesystem
// ---------------------------------------------------------------------------

export async function downloadFromLocal(path: string): Promise<Buffer> {
  const fullPath = resolve(UPLOADS_ROOT, path);
  if (!fullPath.startsWith(UPLOADS_ROOT)) {
    throw new Error('Invalid path: directory traversal detected');
  }
  return readFile(fullPath);
}
