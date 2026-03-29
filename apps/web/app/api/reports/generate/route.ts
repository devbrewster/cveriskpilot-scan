import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@cveriskpilot/auth';
import {
  generateFindingsReport,
  generateExecutiveReport,
  generateSlaReport,
  slaReportToCSV,
} from '@/lib/report-generator';

// ---------------------------------------------------------------------------
// POST /api/reports/generate — Generate a report on-demand
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { organizationId } = session;

    const body = await request.json();
    const { clientId, reportType, format, dateRange } = body;

    if (!reportType || !['executive', 'findings', 'sla'].includes(reportType)) {
      return NextResponse.json(
        { error: 'reportType must be executive, findings, or sla' },
        { status: 400 },
      );
    }

    // Parse date range if provided
    let parsedDateRange: { from: Date; to: Date } | undefined;
    if (dateRange?.from && dateRange?.to) {
      parsedDateRange = {
        from: new Date(dateRange.from),
        to: new Date(dateRange.to),
      };
    }

    const timestamp = new Date().toISOString().slice(0, 10);

    switch (reportType) {
      case 'findings': {
        const csv = await generateFindingsReport(
          prisma,
          organizationId,
          clientId ?? null,
          parsedDateRange,
        );

        if (format === 'csv' || !format) {
          return new Response(csv, {
            status: 200,
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': `attachment; filename="findings-report-${timestamp}.csv"`,
            },
          });
        }

        // Return as JSON (parsed CSV rows)
        return NextResponse.json({
          reportType: 'findings',
          generatedAt: new Date().toISOString(),
          format: 'csv',
          data: csv,
          filename: `findings-report-${timestamp}.csv`,
        });
      }

      case 'executive': {
        const data = await generateExecutiveReport(
          prisma,
          organizationId,
          clientId ?? null,
          parsedDateRange,
        );

        return NextResponse.json({
          reportType: 'executive',
          generatedAt: new Date().toISOString(),
          data,
        });
      }

      case 'sla': {
        const data = await generateSlaReport(
          prisma,
          organizationId,
          clientId ?? null,
        );

        if (format === 'csv') {
          const csv = slaReportToCSV(data);
          return new Response(csv, {
            status: 200,
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': `attachment; filename="sla-report-${timestamp}.csv"`,
            },
          });
        }

        return NextResponse.json({
          reportType: 'sla',
          generatedAt: new Date().toISOString(),
          data,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('[API] POST /api/reports/generate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 },
    );
  }
}
