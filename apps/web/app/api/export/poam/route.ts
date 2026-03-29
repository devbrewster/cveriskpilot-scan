import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePOAM } from '@cveriskpilot/compliance';
import type { POAMItem } from '@cveriskpilot/compliance';
import { requireAuth } from '@cveriskpilot/auth';
import ExcelJS from 'exceljs';

// ---------------------------------------------------------------------------
// GET /api/export/poam — Export POAM as FedRAMP Appendix A XLSX
// Query params: clientId, severity, status
// ---------------------------------------------------------------------------

/**
 * FedRAMP POAM Appendix A column definitions.
 * Order and naming follows the FedRAMP POAM Template Rev 5.
 */
const FEDRAMP_COLUMNS: { header: string; key: string; width: number }[] = [
  { header: 'POAM ID', key: 'poamId', width: 14 },
  { header: 'Controls / CCI(s)', key: 'securityControl', width: 22 },
  { header: 'Weakness Name', key: 'weaknessName', width: 30 },
  { header: 'Weakness Description', key: 'weaknessDescription', width: 50 },
  { header: 'Weakness Detector / Source', key: 'weaknessSource', width: 24 },
  { header: 'Asset Identifier', key: 'assetIdentifier', width: 22 },
  { header: 'Point of Contact', key: 'pointOfContact', width: 22 },
  { header: 'Resources Required', key: 'resourcesRequired', width: 22 },
  { header: 'Overall Remediation Plan', key: 'remediationPlan', width: 36 },
  { header: 'Scheduled Completion Date', key: 'scheduledCompletionDate', width: 24 },
  { header: 'Milestones with Dates', key: 'milestones', width: 44 },
  { header: 'Milestone Changes', key: 'milestoneChanges', width: 22 },
  { header: 'Status', key: 'status', width: 14 },
  { header: 'Comments', key: 'comments', width: 36 },
  { header: 'CVE ID(s)', key: 'cveIds', width: 22 },
  { header: 'Severity', key: 'severity', width: 12 },
  { header: 'CVSS Score', key: 'cvssScore', width: 12 },
  { header: 'Risk Adjustment', key: 'riskAdjustment', width: 18 },
  { header: 'Vendor Dependency', key: 'vendorDependency', width: 18 },
  { header: 'Original Detection Date', key: 'originalDetectionDate', width: 24 },
  { header: 'Deviation Request', key: 'deviationRequest', width: 22 },
];

// FedRAMP blue for header row
const FEDRAMP_HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF002060' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 10,
  name: 'Calibri',
};

const BODY_FONT: Partial<ExcelJS.Font> = {
  size: 10,
  name: 'Calibri',
};

const SEVERITY_FILL: Record<string, ExcelJS.FillPattern> = {
  CRITICAL: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } },
  HIGH: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6600' } },
  MEDIUM: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } },
  LOW: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } },
  INFO: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } },
};

// ---------------------------------------------------------------------------
// Map POAMItem to FedRAMP row
// ---------------------------------------------------------------------------

interface FedRAMPRow {
  poamId: string;
  securityControl: string;
  weaknessName: string;
  weaknessDescription: string;
  weaknessSource: string;
  assetIdentifier: string;
  pointOfContact: string;
  resourcesRequired: string;
  remediationPlan: string;
  scheduledCompletionDate: string;
  milestones: string;
  milestoneChanges: string;
  status: string;
  comments: string;
  cveIds: string;
  severity: string;
  cvssScore: string;
  riskAdjustment: string;
  vendorDependency: string;
  originalDetectionDate: string;
  deviationRequest: string;
}

function poamItemToRow(item: POAMItem, index: number): FedRAMPRow {
  const milestonesText = item.milestones
    .map(
      (m, i) =>
        `M${i + 1}: ${m.description} — ${m.status} (due ${m.scheduledDate.slice(0, 10)})`,
    )
    .join('\n');

  return {
    poamId: `V-${String(index + 1).padStart(5, '0')}`,
    securityControl: `${item.securityControl} (${item.controlFamily})`,
    weaknessName: item.weaknessId,
    weaknessDescription: item.weaknessDescription,
    weaknessSource: item.sourceOfWeakness,
    assetIdentifier: item.resources, // finding count maps to asset context
    pointOfContact: item.responsibleEntity,
    resourcesRequired: 'Staff time; patch management tools',
    remediationPlan: item.milestones.length > 0
      ? item.milestones.map((m) => m.description).join('; ')
      : 'Remediation pending assessment',
    scheduledCompletionDate: item.scheduledCompletionDate.slice(0, 10),
    milestones: milestonesText,
    milestoneChanges: '',
    status: item.status,
    comments: item.comments,
    cveIds: item.cveIds.join('; '),
    severity: item.severity,
    cvssScore: item.cveIds.length > 0 ? '' : '', // filled from case data below
    riskAdjustment: '',
    vendorDependency: '',
    originalDetectionDate: item.originalDetectionDate.slice(0, 10),
    deviationRequest: item.status === 'DELAYED' ? 'Yes — deviation pending review' : '',
  };
}

// ---------------------------------------------------------------------------
// Build XLSX workbook
// ---------------------------------------------------------------------------

async function buildFedRAMPWorkbook(
  items: POAMItem[],
  orgName: string,
  clientId: string,
  cvssScores: Map<string, number | null>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CVERiskPilot';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ---- Title Sheet ----
  const titleSheet = workbook.addWorksheet('Cover', {
    properties: { defaultColWidth: 30 },
  });

  titleSheet.mergeCells('A1:D1');
  const titleCell = titleSheet.getCell('A1');
  titleCell.value = 'FedRAMP Plan of Action and Milestones (POA&M)';
  titleCell.font = { bold: true, size: 16, name: 'Calibri', color: { argb: 'FF002060' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleSheet.getRow(1).height = 36;

  const metaRows = [
    ['Organization:', orgName],
    ['Client ID:', clientId],
    ['Generated:', new Date().toISOString().slice(0, 10)],
    ['Total POA&M Items:', String(items.length)],
    ['Framework:', 'NIST 800-171 / FedRAMP'],
    ['Generated By:', 'CVERiskPilot'],
  ];

  metaRows.forEach((row, i) => {
    const r = titleSheet.getRow(i + 3);
    r.getCell(1).value = row[0];
    r.getCell(1).font = { bold: true, size: 11, name: 'Calibri' };
    r.getCell(2).value = row[1];
    r.getCell(2).font = { size: 11, name: 'Calibri' };
  });

  // ---- POAM Sheet ----
  const poamSheet = workbook.addWorksheet('POAM', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  poamSheet.columns = FEDRAMP_COLUMNS;

  // Style header row
  const headerRow = poamSheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = FEDRAMP_HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });

  // Add data rows
  items.forEach((item, index) => {
    const rowData = poamItemToRow(item, index);
    // Fill in CVSS from case data
    const cvss = cvssScores.get(item.id);
    rowData.cvssScore = cvss != null ? cvss.toFixed(1) : '';

    const row = poamSheet.addRow(rowData);
    row.eachCell((cell) => {
      cell.font = BODY_FONT;
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      };
    });

    // Severity color coding
    const severityCell = row.getCell('severity');
    const fill = SEVERITY_FILL[item.severity];
    if (fill) {
      severityCell.fill = fill;
      if (item.severity === 'CRITICAL' || item.severity === 'HIGH') {
        severityCell.font = { ...BODY_FONT, bold: true, color: { argb: 'FFFFFFFF' } };
      }
    }

    // Alternate row shading
    if (index % 2 === 1) {
      row.eachCell((cell) => {
        if (!cell.fill || (cell.fill as ExcelJS.FillPattern).fgColor?.argb === undefined) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' },
          };
        }
      });
    }
  });

  // Auto-filter
  poamSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: items.length + 1, column: FEDRAMP_COLUMNS.length },
  };

  // ---- Summary Sheet ----
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Count', key: 'count', width: 14 },
  ];

  const summaryHeaderRow = summarySheet.getRow(1);
  summaryHeaderRow.eachCell((cell) => {
    cell.fill = FEDRAMP_HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const bySeverity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  const byStatus = { PENDING: 0, ONGOING: 0, COMPLETED: 0, DELAYED: 0, CANCELLED: 0 };

  items.forEach((item) => {
    if (item.severity in bySeverity) bySeverity[item.severity as keyof typeof bySeverity]++;
    if (item.status in byStatus) byStatus[item.status as keyof typeof byStatus]++;
  });

  const summaryData = [
    { metric: 'Total POA&M Items', count: items.length },
    { metric: '', count: '' },
    { metric: 'By Severity', count: '' },
    { metric: '  Critical', count: bySeverity.CRITICAL },
    { metric: '  High', count: bySeverity.HIGH },
    { metric: '  Medium', count: bySeverity.MEDIUM },
    { metric: '  Low', count: bySeverity.LOW },
    { metric: '  Informational', count: bySeverity.INFO },
    { metric: '', count: '' },
    { metric: 'By Status', count: '' },
    { metric: '  Pending', count: byStatus.PENDING },
    { metric: '  Ongoing', count: byStatus.ONGOING },
    { metric: '  Completed', count: byStatus.COMPLETED },
    { metric: '  Delayed', count: byStatus.DELAYED },
    { metric: '  Cancelled', count: byStatus.CANCELLED },
  ];

  summaryData.forEach((row) => {
    const r = summarySheet.addRow(row);
    r.eachCell((cell) => {
      cell.font = BODY_FONT;
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const severityFilter = searchParams.get('severity');
    const statusFilter = searchParams.get('status');
    const organizationId = session.organizationId;

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId query parameter is required' },
        { status: 400 },
      );
    }

    // Fetch org name
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    const orgName = org?.name ?? 'Organization';

    // Build case filter
    const statusNotIn = ['VERIFIED_CLOSED', 'FALSE_POSITIVE', 'NOT_APPLICABLE', 'DUPLICATE'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caseWhere: any = {
      organizationId,
      clientId,
      status: { notIn: statusNotIn },
    };

    if (severityFilter) {
      caseWhere.severity = severityFilter;
    }

    // Fetch open vulnerability cases
    const cases = await prisma.vulnerabilityCase.findMany({
      where: caseWhere,
      include: {
        assignedTo: {
          select: { name: true, email: true },
        },
      },
      orderBy: { severity: 'asc' },
      take: 10000, // Safety cap
    });

    // Build CVSS score map for the XLSX
    const cvssScores = new Map<string, number | null>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cases.forEach((c: any) => {
      cvssScores.set(c.id, c.cvssScore ?? null);
    });

    // Map to generator input
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caseInputs = cases.map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      cveIds: c.cveIds,
      cweIds: c.cweIds,
      severity: c.severity,
      cvssScore: c.cvssScore,
      status: c.status,
      assignedToId: c.assignedToId,
      assignedTo: c.assignedTo,
      dueAt: c.dueAt?.toISOString() ?? null,
      firstSeenAt: c.firstSeenAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
      findingCount: c.findingCount,
      remediationNotes: c.remediationNotes,
    }));

    let poamItems = generatePOAM(caseInputs, orgName);

    // Apply POAM-level status filter (maps from case status via generator)
    if (statusFilter) {
      poamItems = poamItems.filter((item) => item.status === statusFilter);
    }

    const xlsxBuffer = await buildFedRAMPWorkbook(poamItems, orgName, clientId, cvssScores);
    const timestamp = new Date().toISOString().slice(0, 10);

    return new Response(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="FedRAMP-POAM-${clientId}-${timestamp}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[API] GET /api/export/poam error:', error);
    return NextResponse.json(
      { error: 'Failed to export FedRAMP POAM' },
      { status: 500 },
    );
  }
}
