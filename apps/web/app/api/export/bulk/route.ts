import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, WRITE_ROLES, checkCsrf, getRedisClient, getBulkExportLimiter } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// Redis-backed export job tracking.
// Jobs are stored as JSON strings under `crp:export_job:<jobId>` with a
// 1-hour TTL so they auto-expire and don't grow unbounded.
// ---------------------------------------------------------------------------

export interface ExportJob {
  id: string;
  type: 'findings' | 'cases' | 'assets';
  format: 'csv' | 'json';
  filters: Record<string, unknown>;
  organizationId: string;
  clientId: string | null;
  limit: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  totalRecords: number;
  processedRecords: number;
  result: string | null; // The generated export content
  filename: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

const EXPORT_JOB_TTL = 3600; // 1 hour

function redisKey(jobId: string): string {
  return `crp:export_job:${jobId}`;
}

async function getExportJob(jobId: string): Promise<ExportJob | null> {
  const redis = getRedisClient();
  const raw = await redis.get(redisKey(jobId));
  if (!raw) return null;
  return JSON.parse(raw) as ExportJob;
}

async function setExportJob(job: ExportJob): Promise<void> {
  const redis = getRedisClient();
  await redis.set(redisKey(job.id), JSON.stringify(job), 'EX', EXPORT_JOB_TTL);
}

export { getExportJob };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateJobId(): string {
  return `exp_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

/** Prefix formula-triggering characters with a single quote to prevent Excel formula injection */
function sanitizeCsvCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

function escapeCSV(value: string): string {
  const safe = sanitizeCsvCell(value);
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n') || safe.includes('\r')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

// ---------------------------------------------------------------------------
// Background Processing
// ---------------------------------------------------------------------------

// Maximum number of records allowed per export to prevent excessive memory usage and DB load
const MAX_EXPORT_RECORDS = 10000;

async function processExportJob(jobId: string): Promise<void> {
  const job = await getExportJob(jobId);
  if (!job) return;

  try {
    job.status = 'processing';
    job.progress = 10;
    await setExportJob(job);

    const where: Record<string, unknown> = { organizationId: job.organizationId };
    if (job.clientId) where.clientId = job.clientId;

    // Apply filters
    if (job.filters.severity) {
      if (job.type === 'cases') {
        where.severity = job.filters.severity;
      } else if (job.type === 'findings') {
        where.vulnerabilityCase = { severity: job.filters.severity };
      }
    }
    if (job.filters.status && job.type === 'cases') {
      where.status = job.filters.status;
    }

    let result: string;
    let filename: string;
    const timestamp = new Date().toISOString().slice(0, 10);

    switch (job.type) {
      case 'findings': {
        const findings = await (prisma.finding as any).findMany({
          where,
          include: {
            asset: { select: { name: true, type: true, environment: true } },
            vulnerabilityCase: {
              select: { title: true, severity: true, status: true, cveIds: true, cvssScore: true, epssScore: true, kevListed: true },
            },
          },
          orderBy: { createdAt: 'desc' as const },
          take: job.limit,
        });

        job.totalRecords = findings.length;
        job.progress = 50;
        await setExportJob(job);

        if (job.format === 'csv') {
          const headers = ['Finding ID', 'Scanner Type', 'Scanner Name', 'Asset', 'Severity', 'Status', 'CVE IDs', 'CVSS', 'EPSS', 'KEV', 'Discovered At'];
          const rows = findings.map((f: any) => [
            f.id, f.scannerType, f.scannerName,
            f.asset?.name ?? '', f.vulnerabilityCase?.severity ?? '', f.vulnerabilityCase?.status ?? '',
            (f.vulnerabilityCase?.cveIds ?? []).join('; '),
            f.vulnerabilityCase?.cvssScore?.toString() ?? '', f.vulnerabilityCase?.epssScore?.toString() ?? '',
            f.vulnerabilityCase?.kevListed ? 'Yes' : 'No',
            f.discoveredAt?.toISOString() ?? '',
          ]);
          result = [headers.map(escapeCSV).join(','), ...rows.map((r: string[]) => r.map(escapeCSV).join(','))].join('\r\n');
          filename = `findings-export-${timestamp}.csv`;
        } else {
          result = JSON.stringify(findings, null, 2);
          filename = `findings-export-${timestamp}.json`;
        }
        break;
      }

      case 'cases': {
        const cases = await (prisma.vulnerabilityCase as any).findMany({
          where,
          include: {
            assignedTo: { select: { name: true, email: true } },
            slaPolicy: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' as const },
          take: job.limit,
        });

        job.totalRecords = cases.length;
        job.progress = 50;
        await setExportJob(job);

        if (job.format === 'csv') {
          const headers = ['Case ID', 'Title', 'Severity', 'Status', 'CVE IDs', 'CVSS', 'EPSS', 'KEV', 'Assigned To', 'Due At', 'Finding Count', 'First Seen', 'Last Seen'];
          const rows = cases.map((c: any) => [
            c.id, c.title, c.severity, c.status,
            (c.cveIds ?? []).join('; '),
            c.cvssScore?.toString() ?? '', c.epssScore?.toString() ?? '',
            c.kevListed ? 'Yes' : 'No',
            c.assignedTo?.name ?? '',
            c.dueAt?.toISOString()?.slice(0, 10) ?? '',
            c.findingCount?.toString() ?? '0',
            c.firstSeenAt?.toISOString()?.slice(0, 10) ?? '',
            c.lastSeenAt?.toISOString()?.slice(0, 10) ?? '',
          ]);
          result = [headers.map(escapeCSV).join(','), ...rows.map((r: string[]) => r.map(escapeCSV).join(','))].join('\r\n');
          filename = `cases-export-${timestamp}.csv`;
        } else {
          result = JSON.stringify(cases, null, 2);
          filename = `cases-export-${timestamp}.json`;
        }
        break;
      }

      case 'assets': {
        const assets = await (prisma.asset as any).findMany({
          where,
          orderBy: { createdAt: 'desc' as const },
          take: job.limit,
        });

        job.totalRecords = assets.length;
        job.progress = 50;
        await setExportJob(job);

        if (job.format === 'csv') {
          const headers = ['Asset ID', 'Name', 'Type', 'Environment', 'Criticality', 'Internet Exposed', 'Tags', 'Created At'];
          const rows = assets.map((a: any) => [
            a.id, a.name, a.type, a.environment, a.criticality,
            a.internetExposed ? 'Yes' : 'No',
            (a.tags ?? []).join('; '),
            a.createdAt?.toISOString()?.slice(0, 10) ?? '',
          ]);
          result = [headers.map(escapeCSV).join(','), ...rows.map((r: string[]) => r.map(escapeCSV).join(','))].join('\r\n');
          filename = `assets-export-${timestamp}.csv`;
        } else {
          result = JSON.stringify(assets, null, 2);
          filename = `assets-export-${timestamp}.json`;
        }
        break;
      }

      default:
        throw new Error(`Unknown export type: ${job.type}`);
    }

    job.status = 'completed';
    job.progress = 100;
    job.processedRecords = job.totalRecords;
    job.result = result;
    job.filename = filename;
    job.completedAt = new Date().toISOString();
    await setExportJob(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[export-bulk] Job ${jobId} failed:`, message);
    job.status = 'failed';
    job.error = 'Export failed. Please try again or contact support.';
    await setExportJob(job);
  }
}

// ---------------------------------------------------------------------------
// POST /api/export/bulk — Start an async bulk export
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const roleCheck = requireRole(session.role, WRITE_ROLES);
    if (roleCheck) return roleCheck;

    // Rate limiting — 3 req/min per user
    try {
      const limiter = getBulkExportLimiter();
      const rl = await limiter.check(`bulk_export:${session.userId}`);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: 'Too many export requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
        );
      }
    } catch {
      // Redis not available — skip rate limiting
    }

    const body = await request.json();
    const { type, filters, format, clientId, limit: requestedLimit } = body;
    // Cap export limit to prevent excessive memory usage and DB load
    const limit = Math.min(
      typeof requestedLimit === 'number' && requestedLimit > 0 ? requestedLimit : MAX_EXPORT_RECORDS,
      MAX_EXPORT_RECORDS,
    );

    if (!type || !['findings', 'cases', 'assets'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be findings, cases, or assets' },
        { status: 400 },
      );
    }

    if (format && !['csv', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'format must be csv or json' },
        { status: 400 },
      );
    }

    const job: ExportJob = {
      id: generateJobId(),
      type,
      format: format ?? 'csv',
      filters: filters ?? {},
      organizationId: session.organizationId,
      clientId: clientId ?? null,
      limit,
      status: 'queued',
      progress: 0,
      totalRecords: 0,
      processedRecords: 0,
      result: null,
      filename: null,
      error: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    await setExportJob(job);

    // Fire and forget — process in background
    processExportJob(job.id).catch((err) => {
      console.error(`[export-bulk] Background processing error for ${job.id}:`, err);
    });

    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        message: 'Export job started. Poll GET /api/export/bulk/{jobId} for status.',
      },
      { status: 202 },
    );
  } catch (error) {
    console.error('[API] POST /api/export/bulk error:', error);
    return NextResponse.json({ error: 'Failed to start export' }, { status: 500 });
  }
}
