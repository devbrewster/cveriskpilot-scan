import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, WRITE_ROLES } from '@cveriskpilot/auth';
import { logAudit } from '@/lib/audit';
import { getOrgTier, checkBillingGate, trackUpload } from '@/lib/billing';
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
  '.nessus', '.sarif', '.json', '.csv', '.cdx.json', '.xml', '.xlsx',
]);

const VALID_PARSER_FORMATS = new Set([
  'NESSUS', 'SARIF', 'CSV', 'JSON_FORMAT', 'CYCLONEDX', 'OSV', 'SPDX', 'CSAF', 'QUALYS', 'OPENVAS', 'XLSX',
]);

function getFileExtension(name: string): string {
  if (name.toLowerCase().endsWith('.cdx.json')) return '.cdx.json';
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

// ---------------------------------------------------------------------------
// Filename sanitization — prevent path traversal
// ---------------------------------------------------------------------------

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/]/g, '_')    // Remove path separators
    .replace(/\.\./g, '_')     // Remove directory traversal
    .replace(/\0/g, '')        // Remove null bytes
    .replace(/^\.+/, '');       // Remove leading dots
}

// ---------------------------------------------------------------------------
// Magic byte validation — verify file content matches expected format
// ---------------------------------------------------------------------------

const MAGIC_BYTES: Record<string, number[][]> = {
  '.nessus': [[0x3C, 0x3F, 0x78, 0x6D, 0x6C]], // <?xml
  '.xml': [[0x3C, 0x3F, 0x78, 0x6D, 0x6C], [0x3C, 0x21]], // <?xml or <!
  '.json': [[0x7B], [0x5B]], // { or [
  '.cdx.json': [[0x7B], [0x5B]], // { or [
  '.sarif': [[0x7B]], // {
  '.csv': [], // No magic bytes for CSV
  '.xlsx': [[0x50, 0x4B]], // PK (ZIP)
};

function validateMagicBytes(buffer: Buffer, ext: string): boolean {
  const expected = MAGIC_BYTES[ext];
  if (!expected || expected.length === 0) return true; // No validation for this type

  // Check first bytes against each valid magic byte sequence
  for (const magic of expected) {
    if (buffer.length >= magic.length) {
      const match = magic.every((byte, i) => buffer[i] === byte);
      if (match) return true;
    }
  }

  // Also allow BOM (UTF-8 BOM: 0xEF, 0xBB, 0xBF) followed by expected bytes
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    const afterBom = buffer.subarray(3);
    for (const magic of expected) {
      if (afterBom.length >= magic.length) {
        const match = magic.every((byte, i) => afterBom[i] === byte);
        if (match) return true;
      }
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// MIME type derivation from extension (don't trust client)
// ---------------------------------------------------------------------------

const EXT_TO_MIME: Record<string, string> = {
  '.nessus': 'application/xml',
  '.xml': 'application/xml',
  '.json': 'application/json',
  '.cdx.json': 'application/json',
  '.sarif': 'application/json',
  '.csv': 'text/csv',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

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
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const roleError = requireRole(session.role, WRITE_ROLES);
    if (roleError) return roleError;

    const organizationId = session.organizationId;
    const uploadedById = session.userId;

    // --- Billing gate: check upload limit ---
    const tier = await getOrgTier(organizationId);
    const gate = await checkBillingGate(organizationId, tier, 'upload');
    if (!gate.allowed) {
      return NextResponse.json(
        { error: gate.reason, upgradeRequired: gate.upgradeRequired },
        { status: 403 },
      );
    }

    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const clientId = formData.get('clientId') as string | null;
    const parserFormat = formData.get('parserFormat') as string | null;

    // Validation
    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Validate that the client belongs to the user's organization
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
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

    // Sanitize filename to prevent path traversal
    const safeFilename = sanitizeFilename(file.name);
    if (!safeFilename || safeFilename.length === 0) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate magic bytes match expected file type
    if (!validateMagicBytes(buffer, ext)) {
      return NextResponse.json(
        { error: `File content does not match expected format for ${ext}` },
        { status: 400 },
      );
    }

    const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    // Derive MIME type from extension — never trust client-provided type
    const mimeType = EXT_TO_MIME[ext] || 'application/octet-stream';

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
        filename: safeFilename,
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

      const localResult = await saveToLocal(buffer, safeFilename, organizationId, jobId);

      const artifact = await prisma.scanArtifact.create({
        data: {
          organizationId,
          clientId,
          filename: safeFilename,
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

    // Step 3.5: Track billing usage (upload counter + MSSP metering)
    await trackUpload(organizationId, clientId);

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

    logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: 'CREATE',
      entityType: 'UploadJob',
      entityId: jobId,
      details: { artifactId, parserFormat: parserFormat ?? 'auto', checksumSha256 },
    });

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
