import type { PrismaClient } from '@cveriskpilot/domain';
import { downloadFromGCS } from '../gcs/upload';
import { downloadFromLocal } from '../gcs/local-upload';
import { buildCases } from '../case-builder/case-builder';
import { createLogger } from '@cveriskpilot/shared';

const logger = createLogger('storage:job-consumer');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Process findings in batches of this size to limit memory pressure */
const BATCH_SIZE = 500;

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

    // Download artifact — use local fallback when stored locally
    const buffer =
      job.artifact.gcsBucket === 'local'
        ? await downloadFromLocal(job.artifact.gcsPath)
        : await downloadFromGCS(job.artifact.gcsBucket, job.artifact.gcsPath);

    // Detect format and parse
    const { detectFormat, parse, normalizeFindings, deduplicateFindings } =
      await import('@cveriskpilot/parsers');

    const format =
      (job.artifact.parserFormat as string) ||
      detectFormat(buffer, job.artifact.filename);
    const result = await parse(format, buffer);

    // Normalize and deduplicate
    const normalized = normalizeFindings(result.findings);
    const deduplicated = deduplicateFindings(normalized);

    // Collect unique CVEs
    const uniqueCves = new Set<string>();
    for (const finding of deduplicated) {
      for (const cve of finding.cveIds) {
        uniqueCves.add(cve);
      }
    }

    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        totalFindings: result.metadata.totalFindings,
        parsedFindings: deduplicated.length,
        uniqueCvesFound: uniqueCves.size,
      },
    });

    // 3. ENRICHING — process in batches for large files
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: { status: 'ENRICHING' },
    });

    const { enrichFindings } = await import('@cveriskpilot/enrichment');

    const allEnriched: Awaited<ReturnType<typeof enrichFindings>> = [];

    for (let i = 0; i < deduplicated.length; i += BATCH_SIZE) {
      const batch = deduplicated.slice(i, i + BATCH_SIZE);
      const enrichedBatch = await enrichFindings(batch);
      allEnriched.push(...enrichedBatch);
    }

    await prisma.uploadJob.update({
      where: { id: jobId },
      data: { uniqueCvesEnriched: uniqueCves.size },
    });

    // 4. BUILDING_CASES — save findings to DB in batches
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: { status: 'BUILDING_CASES' },
    });

    let totalCasesCreated = 0;
    let totalCasesUpdated = 0;
    let totalFindingsLinked = 0;

    for (let i = 0; i < allEnriched.length; i += BATCH_SIZE) {
      const batch = allEnriched.slice(i, i + BATCH_SIZE);
      const casesResult = await buildCases({
        organizationId: job.organizationId,
        clientId: job.clientId,
        findings: batch,
        prisma,
      });

      totalCasesCreated += casesResult.casesCreated;
      totalCasesUpdated += casesResult.casesUpdated;
      totalFindingsLinked += casesResult.findingsLinked;
    }

    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        findingsCreated: totalFindingsLinked,
        casesCreated: totalCasesCreated,
      },
    });

    // 5. COMPLETED
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    logger.info(`Job ${jobId} completed`, {
      findingsParsed: deduplicated.length,
      cvesEnriched: uniqueCves.size,
      casesCreated: totalCasesCreated,
      casesUpdated: totalCasesUpdated,
      findingsLinked: totalFindingsLinked,
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
