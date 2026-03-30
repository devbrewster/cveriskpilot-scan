import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, isFounderEmail } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// GET /api/ops/audit — Staff action audit log
// ---------------------------------------------------------------------------

/** Allowed email domain for staff access */
const STAFF_DOMAIN = 'cveriskpilot.com';

type StaffAction =
  | 'IMPERSONATE'
  | 'VIEW_CUSTOMER'
  | 'TOGGLE_FLAG'
  | 'UPDATE_TIER'
  | 'RESET_PASSWORD'
  | 'DISABLE_ACCOUNT';

interface AuditEntry {
  id: string;
  timestamp: string;
  staffEmail: string;
  action: StaffAction;
  targetOrg: string;
  details: string;
  ip: string;
}

/** Mock audit log data for development */
const MOCK_AUDIT_LOG: AuditEntry[] = [
  {
    id: 'aud-001',
    timestamp: '2026-03-28T09:15:00Z',
    staffEmail: 'admin@cveriskpilot.com',
    action: 'IMPERSONATE',
    targetOrg: 'org-acme-corp',
    details: 'Customer reported missing scan results — investigating dashboard view',
    ip: '203.0.113.10',
  },
  {
    id: 'aud-002',
    timestamp: '2026-03-28T08:42:00Z',
    staffEmail: 'ops@cveriskpilot.com',
    action: 'VIEW_CUSTOMER',
    targetOrg: 'org-globex',
    details: 'Reviewing billing discrepancy on enterprise tier',
    ip: '198.51.100.25',
  },
  {
    id: 'aud-003',
    timestamp: '2026-03-27T16:30:00Z',
    staffEmail: 'admin@cveriskpilot.com',
    action: 'TOGGLE_FLAG',
    targetOrg: 'org-initech',
    details: 'Enabled beta feature: advanced-epss-scoring',
    ip: '203.0.113.10',
  },
  {
    id: 'aud-004',
    timestamp: '2026-03-27T14:10:00Z',
    staffEmail: 'support@cveriskpilot.com',
    action: 'UPDATE_TIER',
    targetOrg: 'org-umbrella',
    details: 'Upgraded from PRO to ENTERPRISE per sales agreement',
    ip: '192.0.2.50',
  },
  {
    id: 'aud-005',
    timestamp: '2026-03-27T11:05:00Z',
    staffEmail: 'admin@cveriskpilot.com',
    action: 'RESET_PASSWORD',
    targetOrg: 'org-acme-corp',
    details: 'User requested password reset via support ticket #4821',
    ip: '203.0.113.10',
  },
  {
    id: 'aud-006',
    timestamp: '2026-03-26T17:22:00Z',
    staffEmail: 'ops@cveriskpilot.com',
    action: 'DISABLE_ACCOUNT',
    targetOrg: 'org-wayne-ent',
    details: 'Account suspended — payment failed 3 consecutive attempts',
    ip: '198.51.100.25',
  },
  {
    id: 'aud-007',
    timestamp: '2026-03-26T10:00:00Z',
    staffEmail: 'support@cveriskpilot.com',
    action: 'IMPERSONATE',
    targetOrg: 'org-globex',
    details: 'Customer unable to generate POAM report — reproducing issue',
    ip: '192.0.2.50',
  },
  {
    id: 'aud-008',
    timestamp: '2026-03-25T15:45:00Z',
    staffEmail: 'admin@cveriskpilot.com',
    action: 'TOGGLE_FLAG',
    targetOrg: 'org-initech',
    details: 'Disabled feature: webhook-v2 (causing duplicate deliveries)',
    ip: '203.0.113.10',
  },
  {
    id: 'aud-009',
    timestamp: '2026-03-25T09:30:00Z',
    staffEmail: 'ops@cveriskpilot.com',
    action: 'VIEW_CUSTOMER',
    targetOrg: 'org-acme-corp',
    details: 'Quarterly account review — usage audit',
    ip: '198.51.100.25',
  },
  {
    id: 'aud-010',
    timestamp: '2026-03-24T14:15:00Z',
    staffEmail: 'admin@cveriskpilot.com',
    action: 'UPDATE_TIER',
    targetOrg: 'org-wayne-ent',
    details: 'Downgraded from ENTERPRISE to PRO — contract expiration',
    ip: '203.0.113.10',
  },
];

function isStaffEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${STAFF_DOMAIN}`) || isFounderEmail(email);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    if (!isStaffEmail(session.email)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Staff-only action' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const staffEmail = searchParams.get('staffEmail');
    const action = searchParams.get('action') as StaffAction | null;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let results = [...MOCK_AUDIT_LOG];

    // Filter by staffEmail
    if (staffEmail) {
      results = results.filter(
        (e) => e.staffEmail.toLowerCase() === staffEmail.toLowerCase(),
      );
    }

    // Filter by action type
    if (action) {
      results = results.filter((e) => e.action === action);
    }

    // Filter by date range
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!isNaN(from.getTime())) {
        results = results.filter((e) => new Date(e.timestamp) >= from);
      }
    }

    if (dateTo) {
      const to = new Date(dateTo);
      if (!isNaN(to.getTime())) {
        results = results.filter((e) => new Date(e.timestamp) <= to);
      }
    }

    // Sort by timestamp descending (most recent first)
    results.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return NextResponse.json({
      entries: results,
      total: results.length,
      filters: {
        staffEmail: staffEmail ?? null,
        action: action ?? null,
        dateFrom: dateFrom ?? null,
        dateTo: dateTo ?? null,
      },
    });
  } catch (error) {
    console.error('[ops/audit] GET error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
