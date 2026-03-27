import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

// ---------------------------------------------------------------------------
// Next.js route segment config — allow up to 100 MB uploads
// ---------------------------------------------------------------------------

export const runtime = 'nodejs';

export const maxDuration = 60; // seconds

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100 MB

const ACCEPTED_EXTENSIONS = new Set([
  '.nessus', '.sarif', '.json', '.csv', '.cdx.json', '.xml',
]);

const VALID_PARSER_FORMATS = new Set([
  'NESSUS', 'SARIF', 'CSV', 'JSON_FORMAT', 'CYCLONEDX', 'OSV', 'SPDX', 'CSAF', 'QUALYS', 'OPENVAS',
]);

function getFileExtension(name: string): string {
  if (name.toLowerCase().endsWith('.cdx.json')) return '.cdx.json';
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

// ---------------------------------------------------------------------------
// Local filesystem fallback (uses scan-based path when jobId is provided)
// ---------------------------------------------------------------------------

async function saveToLocal(
  buffer: Buffer,
  filename: string,
  organizationId: string,
  jobId: string,
): Promise<{ gcsBucket: string; gcsPath: string }> {
  const uploadsDir = path.resolve(
    process.cwd(), 'uploads', organizationId, 'scans', jobId,
  );
  await fs.mkdir(uploadsDir, { recursive: true });

  const localPath = path.join(uploadsDir, filename);
  await fs.writeFile(localPath, buffer);

  return {
    gcsBucket: 'local',
    gcsPath: `${organizationId}/scans/${jobId}/${filename}`,
  };
}

// ---------------------------------------------------------------------------
// POST /api/upload — Handle scan file upload
//
// Flow:
// 1. Validate inputs
// 2. Create UploadJob record (QUEUED) to get a jobId
// 3. Upload raw file to GCS at {orgId}/scans/{jobId}/{originalFilename}
//    (or local fallback if GCS is not configured)
// 4. Create ScanArtifact record with GCS path, SHA-256 checksum, file size
// 5. Link artifact to the job
// 6. Fire-and-forget the processing pipeline (parse -> normalize -> dedup
//    -> enrich -> save findings -> build cases)
// 7. Return jobId immediately for status polling via GET /api/upload/[jobId]
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const organizationId = (formData.get('organizationId') as string | null) ?? 'default-org';
    const clientId = (formData.get('clientId') as string | null) ?? 'default-client';
    const uploadedById = (formData.get('uploadedById') as string | null) ?? 'default-user';
    const parserFormat = formData.get('parserFormat') as string | null;

    // Validation
    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: 'File exceeds maximum size of 100 MB' }, { status: 400 });
    }

    const ext = getFileExtension(file.name);
    if (!ACCEPTED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type "${ext}". Accepted: ${[...ACCEPTED_EXTENSIONS].join(', ')}` },
        { status: 400 },
      );
    }

    if (parserFormat && !VALID_PARSER_FORMATS.has(parserFormat)) {
      return NextResponse.json({ error: `Invalid parser format: ${parserFormat}` }, { status: 400 });
    }

    const resolvedFormat = parserFormat ?? 'JSON_FORMAT';

    const buffer = Buffer.from(await file.arrayBuffer());
    const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const mimeType = file.type || 'application/octet-stream';

    // Step 1: Create the UploadJob record first so we have a jobId for
    // the GCS path pattern {orgId}/scans/{jobId}/{filename}
    const job = await prisma.uploadJob.create({
      data: {
        organizationId,
        clientId,
        // Temporary — will be updated after artifact creation
        artifactId: 'pending',
        status: 'QUEUED',
      },
    });

    const jobId = job.id;
    let artifactId: string;

    // Step 2: Store the raw file in GCS (or local fallback)
    try {
      const { createArtifact } = await import('@cveriskpilot/storage');

      const artifact = await createArtifact(prisma, {
        file: buffer,
        filename: file.name,
        mimeType,
        organizationId,
        clientId,
        uploadedById,
        parserFormat: resolvedFormat,
        jobId,
      });

      artifactId = artifact.id;
    } catch (storageErr) {
      // GCS unavailable — fall back to local filesystem
      console.warn('[API] Storage package upload failed, falling back to local:', storageErr);

      const localResult = await saveToLocal(buffer, file.name, organizationId, jobId);

      const artifact = await prisma.scanArtifact.create({
        data: {
          organizationId,
          clientId,
          filename: file.name,
          mimeType,
          sizeBytes: buffer.length,
          gcsBucket: localResult.gcsBucket,
          gcsPath: localResult.gcsPath,
          checksumSha256,
          parserFormat: resolvedFormat as any,
          uploadedById,
        },
      });

      artifactId = artifact.id;
    }

    // Step 3: Link artifact to the job
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: { artifactId },
    });

    // Step 4: Fire-and-forget processing pipeline
    // (parse -> normalize -> dedup -> enrich -> build cases)
    // The processUploadJob function updates job status through its lifecycle:
    // QUEUED -> PARSING -> ENRICHING -> BUILDING_CASES -> COMPLETED (or FAILED)
    try {
      const { processUploadJob } = await import('@cveriskpilot/storage');
      (processUploadJob as any)(jobId, prisma).catch((err: Error) => {
        console.error(`[API] Upload job ${jobId} processing failed:`, err);
      });
    } catch {
      console.info(`[API] Upload job ${jobId} created but consumer not available`);
    }

    return NextResponse.json({
      artifactId,
      jobId,
      status: 'QUEUED',
      checksumSha256,
    });
  } catch (error) {
    console.error('[API] POST /api/upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 },
    );
  }
}
