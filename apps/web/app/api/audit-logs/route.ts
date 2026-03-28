import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@cveriskpilot/auth';

// Mock data matching the Prisma AuditLog model shape
// Fields: id, organizationId, entityType, entityId, action (AuditAction enum),
//         actorId, actorIp, details (Json), hash, previousHash, createdAt

type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATE_CHANGE'
  | 'RISK_EXCEPTION'
  | 'EXPORT'
  | 'LOGIN'
  | 'LOGOUT';

interface MockAuditLog {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  actorId: string;
  actorIp: string | null;
  details: Record<string, unknown>;
  hash: string;
  previousHash: string | null;
  createdAt: string;
}

const MOCK_ACTORS = [
  { id: 'usr_001', name: 'Sarah Chen', email: 'sarah.chen@acme.com' },
  { id: 'usr_002', name: 'Marcus Johnson', email: 'marcus.j@acme.com' },
  { id: 'usr_003', name: 'Emily Torres', email: 'emily.t@acme.com' },
  { id: 'usr_004', name: 'James Wilson', email: 'james.w@acme.com' },
  { id: 'usr_005', name: 'Priya Patel', email: 'priya.p@acme.com' },
];

function generateMockLogs(): MockAuditLog[] {
  const now = Date.now();
  const hour = 3600_000;

  const logs: MockAuditLog[] = [
    {
      id: 'alog_001',
      organizationId: 'org_default',
      entityType: 'VulnerabilityCase',
      entityId: 'case_abc123',
      action: 'CREATE',
      actorId: 'usr_001',
      actorIp: '10.0.1.42',
      details: { description: 'Created case for CVE-2024-21762', actor: MOCK_ACTORS[0] },
      hash: 'a1b2c3d4e5f6',
      previousHash: null,
      createdAt: new Date(now - 1 * hour).toISOString(),
    },
    {
      id: 'alog_002',
      organizationId: 'org_default',
      entityType: 'VulnerabilityCase',
      entityId: 'case_abc123',
      action: 'STATE_CHANGE',
      actorId: 'usr_002',
      actorIp: '10.0.1.55',
      details: { description: 'Status changed from NEW to TRIAGE', fromStatus: 'NEW', toStatus: 'TRIAGE', actor: MOCK_ACTORS[1] },
      hash: 'b2c3d4e5f6a1',
      previousHash: 'a1b2c3d4e5f6',
      createdAt: new Date(now - 2 * hour).toISOString(),
    },
    {
      id: 'alog_003',
      organizationId: 'org_default',
      entityType: 'User',
      entityId: 'usr_003',
      action: 'LOGIN',
      actorId: 'usr_003',
      actorIp: '192.168.1.100',
      details: { description: 'User logged in via SSO', method: 'SAML', actor: MOCK_ACTORS[2] },
      hash: 'c3d4e5f6a1b2',
      previousHash: 'b2c3d4e5f6a1',
      createdAt: new Date(now - 3 * hour).toISOString(),
    },
    {
      id: 'alog_004',
      organizationId: 'org_default',
      entityType: 'ScanArtifact',
      entityId: 'artifact_xyz',
      action: 'CREATE',
      actorId: 'usr_001',
      actorIp: '10.0.1.42',
      details: { description: 'Uploaded Nessus scan (quarterly_scan.nessus)', filename: 'quarterly_scan.nessus', format: 'NESSUS', actor: MOCK_ACTORS[0] },
      hash: 'd4e5f6a1b2c3',
      previousHash: 'c3d4e5f6a1b2',
      createdAt: new Date(now - 4 * hour).toISOString(),
    },
    {
      id: 'alog_005',
      organizationId: 'org_default',
      entityType: 'Finding',
      entityId: 'find_bulk_001',
      action: 'UPDATE',
      actorId: 'usr_002',
      actorIp: '10.0.1.55',
      details: { description: 'Bulk updated severity for 12 findings', count: 12, field: 'severity', actor: MOCK_ACTORS[1] },
      hash: 'e5f6a1b2c3d4',
      previousHash: 'd4e5f6a1b2c3',
      createdAt: new Date(now - 5 * hour).toISOString(),
    },
    {
      id: 'alog_006',
      organizationId: 'org_default',
      entityType: 'RiskException',
      entityId: 'exc_001',
      action: 'RISK_EXCEPTION',
      actorId: 'usr_004',
      actorIp: '10.0.2.10',
      details: { description: 'Accepted risk for CVE-2023-44487 on staging', cveId: 'CVE-2023-44487', type: 'ACCEPTED_RISK', actor: MOCK_ACTORS[3] },
      hash: 'f6a1b2c3d4e5',
      previousHash: 'e5f6a1b2c3d4',
      createdAt: new Date(now - 8 * hour).toISOString(),
    },
    {
      id: 'alog_007',
      organizationId: 'org_default',
      entityType: 'Report',
      entityId: 'rpt_exec_001',
      action: 'EXPORT',
      actorId: 'usr_005',
      actorIp: '10.0.1.80',
      details: { description: 'Exported executive report as PDF', format: 'PDF', reportType: 'executive', actor: MOCK_ACTORS[4] },
      hash: 'a2b3c4d5e6f7',
      previousHash: 'f6a1b2c3d4e5',
      createdAt: new Date(now - 12 * hour).toISOString(),
    },
    {
      id: 'alog_008',
      organizationId: 'org_default',
      entityType: 'VulnerabilityCase',
      entityId: 'case_def456',
      action: 'DELETE',
      actorId: 'usr_004',
      actorIp: '10.0.2.10',
      details: { description: 'Deleted duplicate case for CVE-2024-1234', reason: 'Duplicate entry', actor: MOCK_ACTORS[3] },
      hash: 'b3c4d5e6f7a2',
      previousHash: 'a2b3c4d5e6f7',
      createdAt: new Date(now - 18 * hour).toISOString(),
    },
    {
      id: 'alog_009',
      organizationId: 'org_default',
      entityType: 'User',
      entityId: 'usr_002',
      action: 'LOGOUT',
      actorId: 'usr_002',
      actorIp: '10.0.1.55',
      details: { description: 'User logged out', actor: MOCK_ACTORS[1] },
      hash: 'c4d5e6f7a2b3',
      previousHash: 'b3c4d5e6f7a2',
      createdAt: new Date(now - 20 * hour).toISOString(),
    },
    {
      id: 'alog_010',
      organizationId: 'org_default',
      entityType: 'SlaPolicy',
      entityId: 'sla_001',
      action: 'UPDATE',
      actorId: 'usr_001',
      actorIp: '10.0.1.42',
      details: { description: 'Updated SLA policy critical days from 7 to 5', field: 'criticalDays', oldValue: 7, newValue: 5, actor: MOCK_ACTORS[0] },
      hash: 'd5e6f7a2b3c4',
      previousHash: 'c4d5e6f7a2b3',
      createdAt: new Date(now - 24 * hour).toISOString(),
    },
    {
      id: 'alog_011',
      organizationId: 'org_default',
      entityType: 'VulnerabilityCase',
      entityId: 'case_ghi789',
      action: 'STATE_CHANGE',
      actorId: 'usr_003',
      actorIp: '192.168.1.100',
      details: { description: 'Case resolved: verified fix for CVE-2024-0001', fromStatus: 'FIXED_PENDING_VERIFICATION', toStatus: 'VERIFIED_CLOSED', actor: MOCK_ACTORS[2] },
      hash: 'e6f7a2b3c4d5',
      previousHash: 'd5e6f7a2b3c4',
      createdAt: new Date(now - 30 * hour).toISOString(),
    },
    {
      id: 'alog_012',
      organizationId: 'org_default',
      entityType: 'ApiKey',
      entityId: 'key_001',
      action: 'CREATE',
      actorId: 'usr_004',
      actorIp: '10.0.2.10',
      details: { description: 'Created API key "CI Pipeline Scanner"', keyName: 'CI Pipeline Scanner', scope: 'upload:write', actor: MOCK_ACTORS[3] },
      hash: 'f7a2b3c4d5e6',
      previousHash: 'e6f7a2b3c4d5',
      createdAt: new Date(now - 36 * hour).toISOString(),
    },
    {
      id: 'alog_013',
      organizationId: 'org_default',
      entityType: 'User',
      entityId: 'usr_005',
      action: 'LOGIN',
      actorId: 'usr_005',
      actorIp: '172.16.0.50',
      details: { description: 'User logged in via GitHub OAuth', method: 'GitHub', actor: MOCK_ACTORS[4] },
      hash: 'a3b4c5d6e7f8',
      previousHash: 'f7a2b3c4d5e6',
      createdAt: new Date(now - 42 * hour).toISOString(),
    },
    {
      id: 'alog_014',
      organizationId: 'org_default',
      entityType: 'Report',
      entityId: 'rpt_findings_002',
      action: 'EXPORT',
      actorId: 'usr_001',
      actorIp: '10.0.1.42',
      details: { description: 'Exported findings CSV for client Acme Corp', format: 'CSV', reportType: 'findings', clientName: 'Acme Corp', actor: MOCK_ACTORS[0] },
      hash: 'b4c5d6e7f8a3',
      previousHash: 'a3b4c5d6e7f8',
      createdAt: new Date(now - 48 * hour).toISOString(),
    },
    {
      id: 'alog_015',
      organizationId: 'org_default',
      entityType: 'VulnerabilityCase',
      entityId: 'case_jkl012',
      action: 'UPDATE',
      actorId: 'usr_002',
      actorIp: '10.0.1.55',
      details: { description: 'Assigned case to Emily Torres', field: 'assignedToId', assignee: 'Emily Torres', actor: MOCK_ACTORS[1] },
      hash: 'c5d6e7f8a3b4',
      previousHash: 'b4c5d6e7f8a3',
      createdAt: new Date(now - 52 * hour).toISOString(),
    },
  ];

  return logs;
}

const VALID_ACTIONS: AuditAction[] = [
  'CREATE', 'UPDATE', 'DELETE', 'STATE_CHANGE',
  'RISK_EXCEPTION', 'EXPORT', 'LOGIN', 'LOGOUT',
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

    // Filters
    const actionFilter = searchParams.get('action') as AuditAction | null;
    const entityTypeFilter = searchParams.get('entityType');
    const fromFilter = searchParams.get('from');
    const toFilter = searchParams.get('to');
    // Validate action filter if provided
    if (actionFilter && !VALID_ACTIONS.includes(actionFilter)) {
      return NextResponse.json(
        { error: `Invalid action filter. Must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 },
      );
    }

    // Generate mock data
    let logs = generateMockLogs();

    // Filter by session's organization
    logs = logs.filter((l) => l.organizationId === session.organizationId);
    if (actionFilter) {
      logs = logs.filter((l) => l.action === actionFilter);
    }
    if (entityTypeFilter) {
      logs = logs.filter((l) =>
        l.entityType.toLowerCase() === entityTypeFilter.toLowerCase(),
      );
    }
    if (fromFilter) {
      const fromDate = new Date(fromFilter);
      if (!isNaN(fromDate.getTime())) {
        logs = logs.filter((l) => new Date(l.createdAt) >= fromDate);
      }
    }
    if (toFilter) {
      const toDate = new Date(toFilter);
      if (!isNaN(toDate.getTime())) {
        logs = logs.filter((l) => new Date(l.createdAt) <= toDate);
      }
    }

    // Sort by createdAt descending (most recent first)
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const total = logs.length;
    const start = (page - 1) * limit;
    const paginatedLogs = logs.slice(start, start + limit);

    return NextResponse.json({
      logs: paginatedLogs,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('[API] GET /api/audit-logs error:', error);
    return NextResponse.json(
      { error: 'Failed to load audit logs' },
      { status: 500 },
    );
  }
}
