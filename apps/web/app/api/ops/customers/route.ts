import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@cveriskpilot/auth';

// ---------- Types ----------

type Tier = 'FREE' | 'PRO' | 'ENTERPRISE' | 'MSSP';
type OrgStatus = 'active' | 'churned' | 'trial';

interface CustomerOrg {
  id: string;
  name: string;
  tier: Tier;
  status: OrgStatus;
  signupDate: string;
  mrr: number; // cents
  userCount: number;
  scanCount: number;
  lastActiveAt: string;
}

// ---------- Mock data ----------

const MOCK_CUSTOMERS: CustomerOrg[] = [
  {
    id: 'org_01',
    name: 'Apex Federal Systems',
    tier: 'ENTERPRISE',
    status: 'active',
    signupDate: '2025-06-15T00:00:00Z',
    mrr: 249900,
    userCount: 42,
    scanCount: 1284,
    lastActiveAt: '2026-03-27T18:32:00Z',
  },
  {
    id: 'org_02',
    name: 'Redline Cyber Labs',
    tier: 'PRO',
    status: 'active',
    signupDate: '2025-09-03T00:00:00Z',
    mrr: 9900,
    userCount: 8,
    scanCount: 312,
    lastActiveAt: '2026-03-28T09:14:00Z',
  },
  {
    id: 'org_03',
    name: 'NovaTech Solutions',
    tier: 'FREE',
    status: 'trial',
    signupDate: '2026-03-10T00:00:00Z',
    mrr: 0,
    userCount: 2,
    scanCount: 5,
    lastActiveAt: '2026-03-26T14:05:00Z',
  },
  {
    id: 'org_04',
    name: 'Sentinel MSSP Group',
    tier: 'MSSP',
    status: 'active',
    signupDate: '2025-04-22T00:00:00Z',
    mrr: 499900,
    userCount: 120,
    scanCount: 8741,
    lastActiveAt: '2026-03-28T07:45:00Z',
  },
  {
    id: 'org_05',
    name: 'CloudBridge Inc.',
    tier: 'PRO',
    status: 'churned',
    signupDate: '2025-07-11T00:00:00Z',
    mrr: 0,
    userCount: 5,
    scanCount: 189,
    lastActiveAt: '2026-01-14T22:10:00Z',
  },
  {
    id: 'org_06',
    name: 'Patriot Defense Tech',
    tier: 'ENTERPRISE',
    status: 'active',
    signupDate: '2025-08-01T00:00:00Z',
    mrr: 249900,
    userCount: 35,
    scanCount: 920,
    lastActiveAt: '2026-03-27T16:50:00Z',
  },
  {
    id: 'org_07',
    name: 'ByteShield Security',
    tier: 'PRO',
    status: 'active',
    signupDate: '2025-11-20T00:00:00Z',
    mrr: 9900,
    userCount: 12,
    scanCount: 478,
    lastActiveAt: '2026-03-28T11:02:00Z',
  },
  {
    id: 'org_08',
    name: 'GreenField Analytics',
    tier: 'FREE',
    status: 'active',
    signupDate: '2026-01-05T00:00:00Z',
    mrr: 0,
    userCount: 3,
    scanCount: 27,
    lastActiveAt: '2026-03-25T08:30:00Z',
  },
  {
    id: 'org_09',
    name: 'IronClad MSSP',
    tier: 'MSSP',
    status: 'active',
    signupDate: '2025-03-18T00:00:00Z',
    mrr: 499900,
    userCount: 95,
    scanCount: 6320,
    lastActiveAt: '2026-03-28T06:18:00Z',
  },
  {
    id: 'org_10',
    name: 'TrustLayer Compliance',
    tier: 'ENTERPRISE',
    status: 'trial',
    signupDate: '2026-03-01T00:00:00Z',
    mrr: 0,
    userCount: 10,
    scanCount: 44,
    lastActiveAt: '2026-03-27T20:15:00Z',
  },
  {
    id: 'org_11',
    name: 'QuickSec Startups',
    tier: 'FREE',
    status: 'churned',
    signupDate: '2025-12-12T00:00:00Z',
    mrr: 0,
    userCount: 1,
    scanCount: 3,
    lastActiveAt: '2026-02-02T10:40:00Z',
  },
  {
    id: 'org_12',
    name: 'Vanguard Risk Partners',
    tier: 'PRO',
    status: 'active',
    signupDate: '2025-10-08T00:00:00Z',
    mrr: 9900,
    userCount: 6,
    scanCount: 215,
    lastActiveAt: '2026-03-28T12:30:00Z',
  },
];

// ---------- Helpers ----------

type SortableField = keyof Pick<
  CustomerOrg,
  'name' | 'tier' | 'status' | 'signupDate' | 'mrr' | 'userCount' | 'scanCount' | 'lastActiveAt'
>;

const SORTABLE_FIELDS: SortableField[] = [
  'name',
  'tier',
  'status',
  'signupDate',
  'mrr',
  'userCount',
  'scanCount',
  'lastActiveAt',
];

function isSortableField(field: string): field is SortableField {
  return (SORTABLE_FIELDS as string[]).includes(field);
}

// ---------- Handler ----------

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search')?.toLowerCase() ?? '';
    const tierFilter = searchParams.get('tier')?.toUpperCase() ?? '';
    const statusFilter = searchParams.get('status')?.toLowerCase() ?? '';
    const sortBy = searchParams.get('sortBy') ?? 'name';
    const sortOrder = (searchParams.get('sortOrder') ?? 'asc') as 'asc' | 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));

    // Filter
    let filtered = [...MOCK_CUSTOMERS];

    if (search) {
      filtered = filtered.filter(
        (org) =>
          org.name.toLowerCase().includes(search) ||
          org.id.toLowerCase().includes(search),
      );
    }

    if (tierFilter && ['FREE', 'PRO', 'ENTERPRISE', 'MSSP'].includes(tierFilter)) {
      filtered = filtered.filter((org) => org.tier === tierFilter);
    }

    if (statusFilter && ['active', 'churned', 'trial'].includes(statusFilter)) {
      filtered = filtered.filter((org) => org.status === statusFilter);
    }

    // Sort
    const field = isSortableField(sortBy) ? sortBy : 'name';
    filtered.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    // Paginate
    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const offset = (page - 1) * limit;
    const customers = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error('[API] GET /api/ops/customers error:', error);
    return NextResponse.json(
      { error: 'Failed to load customer list' },
      { status: 500 },
    );
  }
}
