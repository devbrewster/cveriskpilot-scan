import type { PrismaClient } from '@cveriskpilot/domain';
import { uploadToGCS, generateSignedUrl, downloadFromGCS } from '../gcs/upload';
import { downloadFromLocal } from '../gcs/local-upload';
import type { CreateArtifactParams, ArtifactRecord } from '../types';

// ---------------------------------------------------------------------------
// Create an immutable scan artifact (GCS upload + DB record)
// ---------------------------------------------------------------------------

export async function createArtifact(
  prisma: PrismaClient,
  params: CreateArtifactParams,
): Promise<ArtifactRecord> {
  const {
    file,
    filename,
    mimeType,
    organizationId,
    clientId,
    uploadedById,
    parserFormat,
    jobId,
  } = params;

  // 1. Upload to GCS (or local fallback)
  const uploadResult = await uploadToGCS({
    buffer: file,
    filename,
    organizationId,
    clientId,
    mimeType,
    jobId,
  });

  // 2. Create ScanArtifact record in DB
  const artifact = await prisma.scanArtifact.create({
    data: {
      organizationId,
      clientId,
      filename,
      mimeType,
      sizeBytes: uploadResult.sizeBytes,
      gcsBucket: uploadResult.gcsBucket,
      gcsPath: uploadResult.gcsPath,
      checksumSha256: uploadResult.checksumSha256,
      parserFormat: parserFormat as any,
      uploadedById,
    },
  });

  return artifact as ArtifactRecord;
}

// ---------------------------------------------------------------------------
// Read-only accessors (immutable — no update / delete)
// ---------------------------------------------------------------------------

export async function getArtifact(
  prisma: PrismaClient,
  artifactId: string,
): Promise<ArtifactRecord | null> {
  const artifact = await prisma.scanArtifact.findUnique({
    where: { id: artifactId },
  });
  return artifact as ArtifactRecord | null;
}

export async function getArtifactDownloadUrl(
  prisma: PrismaClient,
  artifactId: string,
): Promise<string> {
  const artifact = await prisma.scanArtifact.findUnique({
    where: { id: artifactId },
  });

  if (!artifact) {
    throw new Error(`Artifact not found: ${artifactId}`);
  }

  return generateSignedUrl(artifact.gcsBucket, artifact.gcsPath);
}

export async function getArtifactBuffer(
  prisma: PrismaClient,
  artifactId: string,
): Promise<Buffer> {
  const artifact = await prisma.scanArtifact.findUnique({
    where: { id: artifactId },
  });

  if (!artifact) {
    throw new Error(`Artifact not found: ${artifactId}`);
  }

  // Use local download when the artifact was stored locally
  if (artifact.gcsBucket === 'local') {
    return downloadFromLocal(artifact.gcsPath);
  }

  return downloadFromGCS(artifact.gcsBucket, artifact.gcsPath);
}
