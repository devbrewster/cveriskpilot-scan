import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, requireRole, WRITE_ROLES, checkCsrf, getExportLimiter } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// POST /api/export/csv — Export audit logs, cases, or findings as CSV
// ---------------------------------------------------------------------------

/** CSV formula injection protection */
function sanitizeCsvCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = sanitizeCsvCell(String(value));
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(values: unknown[]): string {
  return values.map(escapeCsv).join(',');
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    // CSRF check
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    // RBAC — only write-capable roles can export
    const roleError = requireRole(session.role, WRITE_ROLES);
    if (roleError) return roleError;

    // Rate limiting — 5 req/min per user
    try {
      const limiter = getExportLimiter();
      const rl = await limiter.check(`export_csv:${session.userId}`);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: 'Too many export requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
        );
      }
    } catch {
      // Redis not available — skip rate limiting
    }

    let body: { type: string; filters?: Record<string, string> };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const orgId = session.organizationId;
    const type = body.type;

    let csv = '';
    let filename = 'export.csv';

    if (type === 'audit-logs') {
      const logs = await prisma.auditLog.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });

      const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Actor ID', 'Actor IP', 'Details', 'Hash'];
      csv = toCsvRow(headers) + '\n';
      for (const log of logs) {
        csv += toCsvRow([
          log.createdAt.toISOString(),
          log.action,
          log.entityType,
          log.entityId,
          log.actorId,
          log.actorIp,
          typeof log.details === 'object' ? JSON.stringify(log.details) : log.details,
          log.hash,
        ]) + '\n';
      }
      filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;

    } else if (type === 'cases') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, unknown> = { organizationId: orgId };
      if (body.filters?.severity) where.severity = body.filters.severity;
      if (body.filters?.status) where.status = body.filters.status;

      const cases = await prisma.vulnerabilityCase.findMany({
        where,
        orderBy: { severity: 'asc' },
        take: 5000,
      });

      const headers = [
        'ID', 'Title', 'Severity', 'Status', 'CVE IDs', 'CWE IDs',
        'CVSS Score', 'EPSS Score', 'EPSS Percentile', 'KEV Listed', 'KEV Due Date',
        'Finding Count', 'Triage Verdict', 'Triage Confidence',
        'Assigned To', 'Due At', 'First Seen', 'Last Seen', 'Created At',
      ];
      csv = toCsvRow(headers) + '\n';
      for (const c of cases) {
        csv += toCsvRow([
          c.id,
          c.title,
          c.severity,
          c.status,
          c.cveIds.join('; '),
          c.cweIds.join('; '),
          c.cvssScore,
          c.epssScore,
          c.epssPercentile,
          c.kevListed ? 'Yes' : 'No',
          c.kevDueDate?.toISOString() ?? '',
          c.findingCount,
          c.triageVerdict ?? '',
          c.triageConfidence ?? '',
          c.assignedToId ?? '',
          c.dueAt?.toISOString() ?? '',
          c.firstSeenAt.toISOString(),
          c.lastSeenAt.toISOString(),
          c.createdAt.toISOString(),
        ]) + '\n';
      }
      filename = `cases-${new Date().toISOString().slice(0, 10)}.csv`;

    } else if (type === 'findings') {
      const findings = await prisma.finding.findMany({
        where: { organizationId: orgId },
        include: {
          asset: { select: { name: true, type: true } },
          vulnerabilityCase: { select: { title: true, severity: true } },
        },
        orderBy: { discoveredAt: 'desc' },
        take: 10000,
      });

      const headers = [
        'ID', 'Scanner Type', 'Scanner Name', 'Asset', 'Asset Type',
        'Case Title', 'Case Severity', 'Dedup Key', 'Discovered At',
      ];
      csv = toCsvRow(headers) + '\n';
      for (const f of findings) {
        csv += toCsvRow([
          f.id,
          f.scannerType,
          f.scannerName,
          f.asset?.name ?? '',
          f.asset?.type ?? '',
          f.vulnerabilityCase?.title ?? '',
          f.vulnerabilityCase?.severity ?? '',
          f.dedupKey,
          f.discoveredAt.toISOString(),
        ]) + '\n';
      }
      filename = `findings-${new Date().toISOString().slice(0, 10)}.csv`;

    } else {
      return NextResponse.json(
        { error: 'Invalid export type. Use: audit-logs, cases, findings' },
        { status: 400 },
      );
    }

    // Audit log the export
    try {
      await logAudit({
        action: 'EXPORT',
        entityType: type,
        entityId: orgId,
        actorId: session.userId,
        organizationId: orgId,
        details: { type, filters: body.filters, rows: csv.split('\n').length - 1 },
      });
    } catch {
      // best effort — don't fail the export if audit logging fails
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[API] POST /api/export/csv error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
