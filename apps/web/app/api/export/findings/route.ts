import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import type { Prisma } from '@cveriskpilot/domain';
import { prisma } from '@/lib/prisma';
import { requireAuth, getExportLimiter } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// GET /api/export/findings — Export findings as CSV
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    // Rate limiting — 5 req/min per user
    try {
      const limiter = getExportLimiter();
      const rl = await limiter.check(`export_findings:${session.userId}`);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: 'Too many export requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
        );
      }
    } catch {
      // Redis not available — skip rate limiting
    }

    const { searchParams } = new URL(request.url);

    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const scannerType = searchParams.get('scannerType');
    const kevOnly = searchParams.get('kevOnly');
    const epssMin = searchParams.get('epssMin');
    const search = searchParams.get('search');

    // Build where clause (same logic as findings list route)
    const where: Prisma.FindingWhereInput = {
      organizationId: session.organizationId,
    };

    if (scannerType) {
      where.scannerType = scannerType as any;
    }

    const caseFilters: Prisma.VulnerabilityCaseWhereInput = {};
    let hasCaseFilter = false;

    if (severity) {
      caseFilters.severity = severity as any;
      hasCaseFilter = true;
    }

    if (status) {
      caseFilters.status = status as any;
      hasCaseFilter = true;
    }

    if (kevOnly === 'true') {
      caseFilters.kevListed = true;
      hasCaseFilter = true;
    }

    if (epssMin) {
      const minScore = parseFloat(epssMin);
      if (!isNaN(minScore)) {
        caseFilters.epssScore = { gte: minScore };
        hasCaseFilter = true;
      }
    }

    if (search) {
      caseFilters.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { cveIds: { has: search.toUpperCase() } },
      ];
      hasCaseFilter = true;
    }

    if (hasCaseFilter) {
      where.vulnerabilityCase = caseFilters;
    }

    // Fetch all matching findings (no pagination for export)
    const findings = await prisma.finding.findMany({
      where,
      include: {
        asset: {
          select: { name: true, type: true, environment: true, criticality: true },
        },
        vulnerabilityCase: {
          select: {
            title: true,
            severity: true,
            status: true,
            cveIds: true,
            cvssScore: true,
            epssScore: true,
            kevListed: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50000, // Safety cap
    });

    // CSV formula injection protection — prefix formula-triggering characters
    function sanitizeCsvCell(value: string): string {
      if (/^[=+\-@\t\r]/.test(value)) {
        return `'${value}`;
      }
      return value;
    }

    // Build CSV
    const headers = [
      'Finding ID',
      'Scanner Type',
      'Scanner Name',
      'Asset Name',
      'Asset Type',
      'Environment',
      'Criticality',
      'Case Title',
      'Severity',
      'Status',
      'CVE IDs',
      'CVSS Score',
      'EPSS Score',
      'KEV Listed',
      'Discovered At',
      'Created At',
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = findings.map((f: any) => [
      f.id,
      f.scannerType,
      sanitizeCsvCell(f.scannerName ?? ''),
      sanitizeCsvCell(f.asset?.name ?? ''),
      f.asset?.type ?? '',
      sanitizeCsvCell(f.asset?.environment ?? ''),
      f.asset?.criticality ?? '',
      sanitizeCsvCell(f.vulnerabilityCase?.title ?? ''),
      f.vulnerabilityCase?.severity ?? '',
      f.vulnerabilityCase?.status ?? '',
      sanitizeCsvCell((f.vulnerabilityCase?.cveIds ?? []).join('; ')),
      f.vulnerabilityCase?.cvssScore?.toString() ?? '',
      f.vulnerabilityCase?.epssScore?.toString() ?? '',
      f.vulnerabilityCase?.kevListed ? 'Yes' : 'No',
      f.discoveredAt.toISOString(),
      f.createdAt.toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) =>
        row
          .map((cell: string) => {
            const value = String(cell);
            // Escape cells that contain commas, quotes, or newlines
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(','),
      ),
    ].join('\n');

    const timestamp = new Date().toISOString().slice(0, 10);

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="findings-export-${timestamp}.csv"`,
      },
    });
  } catch (error) {
    console.error('[API] GET /api/export/findings error:', error);
    return new Response(JSON.stringify({ error: 'Failed to export findings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
