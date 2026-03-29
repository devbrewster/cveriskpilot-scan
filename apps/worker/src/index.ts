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

// Stub handlers — each logs the job and returns success.
// These will be replaced with real implementations that call into
// @cveriskpilot/parsers, @cveriskpilot/enrichment, etc.

async function handleParseScan(payload: Record<string, unknown>): Promise<string> {
  console.log('[PARSE_SCAN] Processing scan upload', payload);
  return 'Scan parse job accepted';
}

async function handleEnrichFindings(payload: Record<string, unknown>): Promise<string> {
  console.log('[ENRICH_FINDINGS] Enriching findings via NVD/EPSS/KEV', payload);
  return 'Enrichment job accepted';
}

async function handleBuildCases(payload: Record<string, unknown>): Promise<string> {
  console.log('[BUILD_CASES] Building cases from findings', payload);
  return 'Case build job accepted';
}

async function handleSendNotification(payload: Record<string, unknown>): Promise<string> {
  console.log('[SEND_NOTIFICATION] Sending notification', payload);
  return 'Notification job accepted';
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
