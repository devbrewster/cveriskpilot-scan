import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { PrismaClient } from '@cveriskpilot/domain';

// ---------------------------------------------------------------------------
// Prisma singleton — the domain package exports the class, not an instance.
// ---------------------------------------------------------------------------

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
});

// ---------------------------------------------------------------------------
// Job types and handler stubs
// ---------------------------------------------------------------------------

const JOB_TYPES = [
  'PARSE_SCAN',
  'ENRICH_FINDINGS',
  'BUILD_CASES',
  'SEND_NOTIFICATION',
  'SYNC_CONNECTOR',
  'CONNECTOR_TICK',
] as const;

type JobType = (typeof JOB_TYPES)[number];

interface JobRequest {
  type: JobType;
  payload: Record<string, unknown>;
}

interface JobResult {
  ok: boolean;
  type: JobType;
  durationMs: number;
  message: string;
}

// Job handlers — each processes a specific job type using the appropriate
// @cveriskpilot package and updates state via the module-level Prisma client.

async function handleParseScan(payload: Record<string, unknown>): Promise<string> {
  const jobId = payload.jobId as string | undefined;
  if (!jobId) {
    throw new Error('PARSE_SCAN requires jobId in payload');
  }

  console.log(`[PARSE_SCAN] Processing scan upload for job ${jobId}`);

  // Load the UploadJob to get artifact reference and org/client context
  const uploadJob = await prisma.uploadJob.findUnique({
    where: { id: jobId },
    include: { artifact: true },
  });

  if (!uploadJob) {
    throw new Error(`UploadJob not found: ${jobId}`);
  }

  // Mark job as PARSING
  await prisma.uploadJob.update({
    where: { id: jobId },
    data: { status: 'PARSING' },
  });

  try {
    // Lazy imports to avoid loading heavy dependencies at startup
    const { detectFormat, parse } = await import('@cveriskpilot/parsers');
    const { getArtifactBuffer } = await import('@cveriskpilot/storage');

    // Download the scan file from storage
    const fileBuffer = await getArtifactBuffer(prisma, uploadJob.artifactId);
    const content = fileBuffer.toString('utf-8');

    // Detect format (use the stored format as hint, fall back to auto-detect)
    const format = uploadJob.artifact.parserFormat ?? detectFormat(content, uploadJob.artifact.filename);

    console.log(`[PARSE_SCAN] job=${jobId} format=${format} fileSize=${fileBuffer.length}`);

    // Parse the scan file
    const result = await parse(format, content);

    // Store parsed findings in the database
    let findingsCreated = 0;
    for (const finding of result.findings) {
      const dedupKey = [
        finding.cveIds[0] ?? finding.title,
        finding.assetName,
        finding.scannerName,
        finding.packageName ?? '',
      ].join('::');

      // Resolve or create asset for this finding
      let asset = await prisma.asset.findFirst({
        where: {
          organizationId: uploadJob.organizationId,
          clientId: uploadJob.clientId,
          name: finding.assetName,
        },
      });

      if (!asset) {
        asset = await prisma.asset.create({
          data: {
            organizationId: uploadJob.organizationId,
            clientId: uploadJob.clientId,
            name: finding.assetName,
            type: finding.assetType === 'REPOSITORY' ? 'REPOSITORY'
              : finding.assetType === 'CONTAINER_IMAGE' ? 'CONTAINER_IMAGE'
              : 'HOST',
            tags: [],
          },
        });
      }

      // Check for duplicate findings by dedup key
      const existing = await prisma.finding.findFirst({
        where: { dedupKey, organizationId: uploadJob.organizationId },
      });

      if (!existing) {
        await prisma.finding.create({
          data: {
            organizationId: uploadJob.organizationId,
            clientId: uploadJob.clientId,
            assetId: asset.id,
            scannerType: finding.scannerType as any,
            scannerName: finding.scannerName,
            runId: finding.runId ?? null,
            observations: {
              ...finding.rawObservations,
              severity: finding.severity,
              cvssScore: finding.cvssScore,
              cvssVector: finding.cvssVector,
              cveIds: finding.cveIds,
              cweIds: finding.cweIds,
              title: finding.title,
              description: finding.description,
            },
            dedupKey,
            artifactId: uploadJob.artifactId,
            discoveredAt: finding.discoveredAt,
          },
        });
        findingsCreated++;
      }
    }

    // Update job progress
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        parsedFindings: result.findings.length,
        totalFindings: result.findings.length,
        findingsCreated,
        uniqueCvesFound: new Set(result.findings.flatMap((f) => f.cveIds)).size,
      },
    });

    const msg = `Parsed ${result.findings.length} findings (${findingsCreated} new) from ${format} scan in ${Math.round(result.metadata.parseTimeMs)}ms`;
    console.log(`[PARSE_SCAN] job=${jobId} ${msg}`);
    return msg;
  } catch (err) {
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}

async function handleEnrichFindings(payload: Record<string, unknown>): Promise<string> {
  const jobId = payload.jobId as string | undefined;
  const organizationId = payload.organizationId as string | undefined;
  const clientId = payload.clientId as string | undefined;

  if (!jobId && !organizationId) {
    throw new Error('ENRICH_FINDINGS requires jobId or organizationId in payload');
  }

  console.log(`[ENRICH_FINDINGS] Starting enrichment job=${jobId ?? 'bulk'} org=${organizationId}`);

  try {
    const { enrichFindings } = await import('@cveriskpilot/enrichment');

    // If jobId is provided, enrich findings for that specific upload job
    // Otherwise, enrich all un-enriched findings for the organization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: Record<string, any> = {};

    if (jobId) {
      // Get the upload job to find its artifact
      const uploadJob = await prisma.uploadJob.findUnique({ where: { id: jobId } });
      if (!uploadJob) throw new Error(`UploadJob not found: ${jobId}`);

      // Mark job as ENRICHING
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: { status: 'ENRICHING' },
      });

      whereClause.organizationId = uploadJob.organizationId;
      whereClause.clientId = uploadJob.clientId;
      whereClause.artifactId = uploadJob.artifactId;
    } else {
      whereClause.organizationId = organizationId;
      if (clientId) whereClause.clientId = clientId;
    }

    // Fetch findings from DB
    const dbFindings = await prisma.finding.findMany({
      where: whereClause,
      include: { asset: true },
    });

    if (dbFindings.length === 0) {
      console.log(`[ENRICH_FINDINGS] No findings to enrich`);
      return 'No findings to enrich';
    }

    // Convert DB findings to CanonicalFinding format for the enrichment pipeline
    const canonicalFindings = dbFindings.map((f: any) => {
      const obs = (f.observations ?? {}) as Record<string, unknown>;
      return {
        title: (obs.title as string) ?? 'Unknown',
        description: (obs.description as string) ?? '',
        cveIds: (obs.cveIds as string[]) ?? [],
        cweIds: (obs.cweIds as string[]) ?? [],
        severity: ((obs.severity as string) ?? 'INFO') as any,
        cvssScore: obs.cvssScore as number | undefined,
        cvssVector: obs.cvssVector as string | undefined,
        scannerType: f.scannerType,
        scannerName: f.scannerName,
        runId: f.runId ?? undefined,
        assetName: f.asset?.name ?? 'unknown',
        discoveredAt: f.discoveredAt,
        rawObservations: obs,
        // Carry the DB finding ID so we can update it afterward
        _findingId: f.id,
      };
    });

    // Run the enrichment pipeline (NVD, EPSS, KEV)
    const enriched = await enrichFindings(canonicalFindings);

    // Update findings in DB with enrichment data
    let enrichedCount = 0;
    for (let i = 0; i < enriched.length; i++) {
      const ef = enriched[i];
      const findingId = (canonicalFindings[i] as any)._findingId as string;

      const updatedObs: Record<string, unknown> = {
        ...(dbFindings[i].observations as Record<string, unknown>),
      };

      if (ef.epssData) {
        updatedObs.epssScore = ef.epssData.score;
        updatedObs.epssPercentile = ef.epssData.percentile;
      }
      if (ef.kevData) {
        updatedObs.kevListed = true;
        updatedObs.kevDueDate = ef.kevData.dueDate;
      }
      if (ef.nvdData) {
        updatedObs.nvdCvssV3Score = ef.nvdData.cvssV3?.score;
        updatedObs.nvdCvssV3Vector = ef.nvdData.cvssV3?.vector;
        updatedObs.nvdDescription = ef.nvdData.description;
      }
      if (ef.riskScore) {
        updatedObs.riskScore = ef.riskScore.score;
        updatedObs.riskLevel = ef.riskScore.riskLevel;
      }

      await prisma.finding.update({
        where: { id: findingId },
        data: { observations: updatedObs as any },
      });
      enrichedCount++;
    }

    // Also update linked VulnerabilityCase records if they exist
    const caseIds = new Set(
      dbFindings
        .filter((f: any) => f.vulnerabilityCaseId)
        .map((f: any) => f.vulnerabilityCaseId as string),
    );

    for (const caseId of caseIds) {
      // Find the best enrichment data from findings linked to this case
      const caseFindings = enriched.filter((_ef, i) => dbFindings[i].vulnerabilityCaseId === caseId);
      const bestEpss = caseFindings.find((ef) => ef.epssData);
      const bestKev = caseFindings.find((ef) => ef.kevData);
      const bestCvss = caseFindings.reduce<number | null>((max, ef) => {
        const score = ef.nvdData?.cvssV3?.score ?? ef.nvdData?.cvssV2?.score ?? ef.cvssScore;
        return score != null && (max == null || score > max) ? score : max;
      }, null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caseUpdate: Record<string, any> = {};
      if (bestEpss?.epssData) {
        caseUpdate.epssScore = bestEpss.epssData.score;
        caseUpdate.epssPercentile = bestEpss.epssData.percentile;
      }
      if (bestKev?.kevData) {
        caseUpdate.kevListed = true;
        caseUpdate.kevDueDate = new Date(bestKev.kevData.dueDate);
      }
      if (bestCvss != null) {
        caseUpdate.cvssScore = bestCvss;
      }

      if (Object.keys(caseUpdate).length > 0) {
        await prisma.vulnerabilityCase.update({
          where: { id: caseId },
          data: caseUpdate,
        });
      }
    }

    // Update upload job stats if applicable
    if (jobId) {
      const uniqueCves = new Set(enriched.flatMap((ef) => ef.cveIds));
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: { uniqueCvesEnriched: uniqueCves.size },
      });
    }

    const msg = `Enriched ${enrichedCount} findings, updated ${caseIds.size} cases`;
    console.log(`[ENRICH_FINDINGS] job=${jobId ?? 'bulk'} ${msg}`);
    return msg;
  } catch (err) {
    if (jobId) {
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });
    }
    throw err;
  }
}

async function handleBuildCases(payload: Record<string, unknown>): Promise<string> {
  const jobId = payload.jobId as string | undefined;
  const organizationId = payload.organizationId as string | undefined;
  const clientId = payload.clientId as string | undefined;

  if (!jobId && !organizationId) {
    throw new Error('BUILD_CASES requires jobId or organizationId in payload');
  }

  console.log(`[BUILD_CASES] Starting case build job=${jobId ?? 'bulk'} org=${organizationId}`);

  try {
    const { buildCasesFromUnlinked } = await import('@cveriskpilot/storage');

    let resolvedOrgId = organizationId;
    let resolvedClientId = clientId;

    if (jobId) {
      const uploadJob = await prisma.uploadJob.findUnique({ where: { id: jobId } });
      if (!uploadJob) throw new Error(`UploadJob not found: ${jobId}`);

      // Mark job as BUILDING_CASES
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: { status: 'BUILDING_CASES' },
      });

      resolvedOrgId = uploadJob.organizationId;
      resolvedClientId = uploadJob.clientId;
    }

    if (!resolvedOrgId) {
      throw new Error('BUILD_CASES could not determine organizationId');
    }

    // Build cases from all unlinked findings for this org/client
    const result = await buildCasesFromUnlinked({
      organizationId: resolvedOrgId,
      clientId: resolvedClientId,
      prisma,
    });

    // Update upload job if applicable
    if (jobId) {
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: {
          casesCreated: result.casesCreated,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }

    const msg = `Built cases: ${result.casesCreated} created, ${result.casesUpdated} updated, ${result.findingsLinked} findings linked`;
    console.log(`[BUILD_CASES] job=${jobId ?? 'bulk'} ${msg}`);
    return msg;
  } catch (err) {
    if (jobId) {
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });
    }
    throw err;
  }
}

async function handleSendNotification(payload: Record<string, unknown>): Promise<string> {
  const notificationType = payload.type as string | undefined;
  const userId = payload.userId as string | undefined;
  const notificationId = payload.notificationId as string | undefined;

  if (!notificationType) {
    throw new Error('SEND_NOTIFICATION requires type in payload');
  }

  console.log(`[SEND_NOTIFICATION] type=${notificationType} userId=${userId} notificationId=${notificationId}`);

  try {
    const {
      sendEmail,
      caseAssignedTemplate,
      commentMentionTemplate,
      slaBreachTemplate,
      digestTemplate,
    } = await import('@cveriskpilot/notifications');

    // Create an in-app notification record if userId is provided and notificationId is not
    if (userId && !notificationId) {
      // Resolve organizationId from payload or user record
      let orgId = payload.organizationId as string | undefined;
      if (!orgId && userId) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } });
        orgId = user?.organizationId;
      }
      if (orgId) {
        await prisma.notification.create({
          data: {
            organizationId: orgId,
            userId,
            type: notificationType,
            title: (payload.title as string) ?? notificationType,
            message: (payload.message as string) ?? '',
            relatedEntityType: payload.entityType as string | undefined,
            relatedEntityId: payload.entityId as string | undefined,
          },
        });
      }
    }

    // Resolve user email for sending
    let recipientEmail: string | undefined;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      recipientEmail = user?.email;
    }

    // Also support direct email targets from payload
    const emailTo = (payload.email as string) ?? (payload.emails as string) ?? recipientEmail;
    if (!emailTo) {
      console.log(`[SEND_NOTIFICATION] No email target — in-app notification only`);
      return 'In-app notification created (no email target)';
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.cveriskpilot.com';
    let subject: string;
    let html: string;

    switch (notificationType) {
      case 'case_assigned': {
        const caseName = (payload.caseName as string) ?? 'Unknown Case';
        const assignerName = (payload.assignerName as string) ?? 'Someone';
        const caseId = payload.caseId as string;
        const caseUrl = `${baseUrl}/cases/${caseId}`;
        subject = `Case Assigned: ${caseName}`;
        html = caseAssignedTemplate(caseName, assignerName, caseUrl);
        break;
      }
      case 'comment_mention': {
        const mentionerName = (payload.mentionerName as string) ?? 'Someone';
        const caseTitle = (payload.caseTitle as string) ?? 'a case';
        const commentPreview = (payload.commentPreview as string) ?? '';
        const caseId = payload.caseId as string;
        const caseUrl = `${baseUrl}/cases/${caseId}`;
        subject = `You were mentioned in ${caseTitle}`;
        html = commentMentionTemplate(mentionerName, caseTitle, commentPreview, caseUrl);
        break;
      }
      case 'sla_breach': {
        const cases = (payload.cases as Array<{
          title: string;
          severity: string;
          dueAt: string;
          caseId: string;
        }>) ?? [];
        const casesWithUrls = cases.map((c) => ({
          ...c,
          caseUrl: `${baseUrl}/cases/${c.caseId}`,
        }));
        subject = `SLA Breach Alert: ${cases.length} case(s) overdue`;
        html = slaBreachTemplate(casesWithUrls);
        break;
      }
      case 'digest': {
        const notifications = (payload.notifications as Array<{
          title: string;
          message: string;
          createdAt: string;
        }>) ?? [];

        // If no notifications payload, fetch unread from DB
        let digestItems = notifications;
        if (digestItems.length === 0 && userId) {
          const unread = await prisma.notification.findMany({
            where: { userId, isRead: false },
            orderBy: { createdAt: 'desc' },
            take: 20,
          });
          digestItems = unread.map((n: any) => ({
            title: n.title,
            message: n.message,
            createdAt: n.createdAt.toISOString(),
          }));
        }

        if (digestItems.length === 0) {
          return 'No unread notifications for digest';
        }

        subject = `CVERiskPilot Daily Digest: ${digestItems.length} notification(s)`;
        html = digestTemplate(digestItems);
        break;
      }
      default: {
        // Generic notification email
        subject = (payload.subject as string) ?? `CVERiskPilot: ${notificationType}`;
        html = `<p>${(payload.message as string) ?? 'You have a new notification.'}</p>`;
        break;
      }
    }

    const sent = await sendEmail({ to: emailTo, subject, html });

    const msg = sent
      ? `Email sent to ${emailTo} (type=${notificationType})`
      : `Email logged (SMTP not configured) to ${emailTo} (type=${notificationType})`;
    console.log(`[SEND_NOTIFICATION] ${msg}`);
    return msg;
  } catch (err) {
    console.error(`[SEND_NOTIFICATION] Failed:`, err);
    throw err;
  }
}

async function handleSyncConnector(payload: Record<string, unknown>): Promise<string> {
  const syncJobId = payload.syncJobId as string | undefined;
  if (!syncJobId) {
    throw new Error('SYNC_CONNECTOR requires syncJobId in payload');
  }

  console.log(`[SYNC_CONNECTOR] Running sync for job ${syncJobId}`);

  // Lazy import to avoid loading heavy dependencies at startup
  const { SyncOrchestrator } = await import('@cveriskpilot/connectors');

  const orchestrator = new SyncOrchestrator(prisma);
  await orchestrator.runSync(syncJobId);

  return `Sync job ${syncJobId} completed`;
}

async function handleConnectorTick(_payload: Record<string, unknown>): Promise<string> {
  console.log('[CONNECTOR_TICK] Processing scheduler tick — fan-out to due connectors');

  const { SyncOrchestrator } = await import('@cveriskpilot/connectors');
  const { enqueueSyncJob } = await import('@cveriskpilot/storage/jobs/job-producer');

  const now = new Date();

  // Query all active API connectors that are due for a sync
  const connectors = await prisma.scannerConnector.findMany({
    where: {
      isApiConnector: true,
      status: 'active',
    },
    select: {
      id: true,
      syncIntervalMinutes: true,
      lastSyncAt: true,
    },
  });

  const orchestrator = new SyncOrchestrator(prisma);
  let enqueued = 0;

  for (const connector of connectors) {
    const isDue =
      !connector.lastSyncAt ||
      connector.lastSyncAt.getTime() + connector.syncIntervalMinutes * 60_000 < now.getTime();

    if (!isDue) continue;

    try {
      const syncJobId = await orchestrator.enqueueSyncJob(connector.id, 'SCHEDULED');
      await enqueueSyncJob(syncJobId);
      enqueued++;
      console.log(`[CONNECTOR_TICK] Enqueued sync job ${syncJobId} for connector ${connector.id}`);
    } catch (err) {
      console.error(`[CONNECTOR_TICK] Failed to enqueue sync for connector ${connector.id}:`, err);
    }
  }

  return `Tick processed: ${enqueued}/${connectors.length} connectors enqueued`;
}

const handlers: Record<JobType, (p: Record<string, unknown>) => Promise<string>> = {
  PARSE_SCAN: handleParseScan,
  ENRICH_FINDINGS: handleEnrichFindings,
  BUILD_CASES: handleBuildCases,
  SEND_NOTIFICATION: handleSendNotification,
  SYNC_CONNECTOR: handleSyncConnector,
  CONNECTOR_TICK: handleConnectorTick,
};

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function json(res: ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT ?? '8080', 10);
const startedAt = Date.now();

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  // Health check — matches the Terraform probe path /api/health used by Cloud Run
  // Also respond on /health for direct worker access.
  if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/api/health')) {
    json(res, 200, {
      status: 'ok',
      service: 'worker',
      uptime: Math.round((Date.now() - startedAt) / 1000),
    });
    return;
  }

  // Job processing endpoint
  if (req.method === 'POST' && url.pathname === '/jobs/process') {
    let body: JobRequest;
    try {
      const raw = await readBody(req);
      body = JSON.parse(raw) as JobRequest;
    } catch {
      json(res, 400, { error: 'Invalid JSON body' });
      return;
    }

    if (!body.type || !JOB_TYPES.includes(body.type)) {
      json(res, 422, {
        error: `Unknown job type. Valid types: ${JOB_TYPES.join(', ')}`,
      });
      return;
    }

    const start = Date.now();
    try {
      const message = await handlers[body.type](body.payload ?? {});
      const result: JobResult = {
        ok: true,
        type: body.type,
        durationMs: Date.now() - start,
        message,
      };
      json(res, 200, result);
    } catch (err) {
      console.error(`[${body.type}] Handler error:`, err);
      json(res, 500, {
        ok: false,
        type: body.type,
        durationMs: Date.now() - start,
        message: err instanceof Error ? err.message : 'Internal error',
      });
    }
    return;
  }

  // 404 for everything else
  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[worker] listening on port ${PORT}`);
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown(signal: string) {
  console.log(`[worker] ${signal} received — shutting down`);
  server.close(async () => {
    console.log('[worker] HTTP server closed');
    await prisma.$disconnect();
    process.exit(0);
  });
  // Force exit after 10 seconds if connections are hanging
  setTimeout(() => {
    console.warn('[worker] Forcing exit after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
