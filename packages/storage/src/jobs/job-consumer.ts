import type { PrismaClient } from '@prisma/client';
import { downloadFromGCS } from '../gcs/upload.js';

// ---------------------------------------------------------------------------
// Upload job processor — called by the worker (Cloud Run or local dev)
// ---------------------------------------------------------------------------

export async function processUploadJob(
  jobId: string,
  prisma: PrismaClient,
): Promise<void> {
  // 1. Fetch job and validate
  const job = await prisma.uploadJob.findUnique({
    where: { id: jobId },
    include: { artifact: true },
  });

  if (!job) {
    throw new Error(`UploadJob not found: ${jobId}`);
  }

  if (job.status !== 'QUEUED') {
    throw new Error(
      `UploadJob ${jobId} is in status ${job.status}, expected QUEUED`,
    );
  }

  try {
    // 2. PARSING
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: { status: 'PARSING' },
    });

    // Download artifact from GCS
    const buffer = await downloadFromGCS(
      job.artifact.gcsBucket,
      job.artifact.gcsPath,
    );

    // Detect format and parse
    const { detectFormat, parse } = await import('@cveriskpilot/parsers');
    const format = detectFormat(buffer, job.artifact.filename);
    const result = await parse(format, buffer);

    // Collect unique CVEs
    const uniqueCves = new Set<string>();
    for (const finding of result.findings) {
      for (const cve of finding.cveIds) {
        uniqueCves.add(cve);
      }
    }

    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        totalFindings: result.metadata.totalFindings,
        parsedFindings: result.findings.length,
        uniqueCvesFound: uniqueCves.size,
      },
    });

    // 3. ENRICHING
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: { status: 'ENRICHING' },
    });

    // Enrichment placeholder — will be implemented by the enrichment agent
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: { uniqueCvesEnriched: uniqueCves.size },
    });

    // 4. BUILDING_CASES
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: { status: 'BUILDING_CASES' },
    });

    // Case building placeholder — will be implemented later

    // 5. COMPLETED
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage,
      },
    });

    throw error;
  }
}
