import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@cveriskpilot/auth';

/**
 * GET /api/ops/customers/:id
 *
 * Returns mock customer detail for the internal ops dashboard.
 * In production this will query the database; for now it returns
 * deterministic mock data keyed off the path-param org id.
 */

interface OpsUser {
  email: string;
  role: string;
  lastLogin: string;
  mfaEnabled: boolean;
}

interface RecentScan {
  id: string;
  date: string;
  format: string;
  findingCount: number;
  status: 'COMPLETED' | 'FAILED' | 'PARSING';
}

interface CustomerDetail {
  org: {
    id: string;
    name: string;
    tier: string;
    status: 'active' | 'churned' | 'trial' | 'suspended';
    signupDate: string;
    stripeCustomerId: string;
  };
  users: OpsUser[];
  usage: {
    scansThisMonth: number;
    totalFindings: number;
    openCases: number;
    storageUsedMB: number;
  };
  billing: {
    plan: string;
    mrr: number;
    nextInvoiceDate: string;
    paymentMethod: string;
  };
  recentScans: RecentScan[];
}

const MOCK_CUSTOMERS: Record<string, CustomerDetail> = {
  'org-acme': {
    org: {
      id: 'org-acme',
      name: 'Acme Corp',
      tier: 'ENTERPRISE',
      status: 'active',
      signupDate: '2025-06-15T00:00:00Z',
      stripeCustomerId: 'cus_Rk8mXzQ1aBcDeF',
    },
    users: [
      { email: 'admin@acme.com', role: 'OWNER', lastLogin: '2026-03-27T14:32:00Z', mfaEnabled: true },
      { email: 'security@acme.com', role: 'SECURITY_LEAD', lastLogin: '2026-03-27T09:15:00Z', mfaEnabled: true },
      { email: 'dev@acme.com', role: 'DEVELOPER', lastLogin: '2026-03-25T18:44:00Z', mfaEnabled: false },
      { email: 'compliance@acme.com', role: 'COMPLIANCE_OFFICER', lastLogin: '2026-03-26T11:00:00Z', mfaEnabled: true },
    ],
    usage: {
      scansThisMonth: 47,
      totalFindings: 1284,
      openCases: 83,
      storageUsedMB: 256,
    },
    billing: {
      plan: 'Enterprise Annual',
      mrr: 2499,
      nextInvoiceDate: '2026-04-15T00:00:00Z',
      paymentMethod: 'Visa ending 4242',
    },
    recentScans: [
      { id: 'scan-001', date: '2026-03-27T14:00:00Z', format: 'NESSUS', findingCount: 142, status: 'COMPLETED' },
      { id: 'scan-002', date: '2026-03-26T10:30:00Z', format: 'SARIF', findingCount: 38, status: 'COMPLETED' },
      { id: 'scan-003', date: '2026-03-25T08:15:00Z', format: 'CYCLONEDX', findingCount: 67, status: 'COMPLETED' },
      { id: 'scan-004', date: '2026-03-24T16:45:00Z', format: 'CSV', findingCount: 0, status: 'FAILED' },
      { id: 'scan-005', date: '2026-03-23T12:00:00Z', format: 'QUALYS', findingCount: 215, status: 'COMPLETED' },
    ],
  },
  'org-globex': {
    org: {
      id: 'org-globex',
      name: 'Globex Industries',
      tier: 'PRO',
      status: 'active',
      signupDate: '2025-11-01T00:00:00Z',
      stripeCustomerId: 'cus_Ql9nYzR2cDeFgH',
    },
    users: [
      { email: 'hank@globex.com', role: 'OWNER', lastLogin: '2026-03-27T16:10:00Z', mfaEnabled: true },
      { email: 'ops@globex.com', role: 'ANALYST', lastLogin: '2026-03-26T22:05:00Z', mfaEnabled: false },
    ],
    usage: {
      scansThisMonth: 12,
      totalFindings: 431,
      openCases: 29,
      storageUsedMB: 78,
    },
    billing: {
      plan: 'Pro Monthly',
      mrr: 299,
      nextInvoiceDate: '2026-04-01T00:00:00Z',
      paymentMethod: 'Mastercard ending 5555',
    },
    recentScans: [
      { id: 'scan-101', date: '2026-03-27T11:00:00Z', format: 'SARIF', findingCount: 22, status: 'COMPLETED' },
      { id: 'scan-102', date: '2026-03-24T09:00:00Z', format: 'NESSUS', findingCount: 56, status: 'COMPLETED' },
      { id: 'scan-103', date: '2026-03-20T15:30:00Z', format: 'OSV', findingCount: 14, status: 'COMPLETED' },
    ],
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const session = auth;
  if (!session.email?.endsWith('@cveriskpilot.com')) {
    return NextResponse.json({ error: 'Internal staff only' }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Look up in mock data; fall back to a generated default
    const customer: CustomerDetail = MOCK_CUSTOMERS[id] ?? {
      org: {
        id,
        name: `Organization ${id}`,
        tier: 'FREE',
        status: 'trial' as const,
        signupDate: '2026-01-10T00:00:00Z',
        stripeCustomerId: `cus_default_${id}`,
      },
      users: [
        { email: `admin@${id}.example.com`, role: 'OWNER', lastLogin: '2026-03-20T10:00:00Z', mfaEnabled: false },
      ],
      usage: {
        scansThisMonth: 3,
        totalFindings: 18,
        openCases: 5,
        storageUsedMB: 4,
      },
      billing: {
        plan: 'Free',
        mrr: 0,
        nextInvoiceDate: '',
        paymentMethod: 'None',
      },
      recentScans: [],
    };

    return NextResponse.json(customer);
  } catch (error) {
    console.error('[API] GET /api/ops/customers/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to load customer detail' },
      { status: 500 },
    );
  }
}
