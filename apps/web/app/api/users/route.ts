import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@cveriskpilot/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Mock org users for development — will be replaced with Prisma queries
const MOCK_USERS = [
  {
    id: 'usr_001',
    email: 'admin@acmesec.com',
    name: 'Sarah Chen',
    role: 'ORG_OWNER',
    isActive: true,
    mfaEnabled: true,
    lastLoginAt: '2026-03-28T08:15:00Z',
    createdAt: '2025-11-01T00:00:00Z',
  },
  {
    id: 'usr_002',
    email: 'mike.r@acmesec.com',
    name: 'Mike Rodriguez',
    role: 'SECURITY_ADMIN',
    isActive: true,
    mfaEnabled: true,
    lastLoginAt: '2026-03-27T16:42:00Z',
    createdAt: '2025-11-15T00:00:00Z',
  },
  {
    id: 'usr_003',
    email: 'priya.k@acmesec.com',
    name: 'Priya Kumar',
    role: 'ANALYST',
    isActive: true,
    mfaEnabled: true,
    lastLoginAt: '2026-03-28T09:01:00Z',
    createdAt: '2025-12-01T00:00:00Z',
  },
  {
    id: 'usr_004',
    email: 'james.w@acmesec.com',
    name: 'James Wilson',
    role: 'ANALYST',
    isActive: true,
    mfaEnabled: false,
    lastLoginAt: '2026-03-26T11:30:00Z',
    createdAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 'usr_005',
    email: 'dev-bot@acmesec.com',
    name: 'CI/CD Service Account',
    role: 'SERVICE_ACCOUNT',
    isActive: true,
    mfaEnabled: false,
    lastLoginAt: '2026-03-28T06:00:00Z',
    createdAt: '2025-12-20T00:00:00Z',
  },
  {
    id: 'usr_006',
    email: 'lisa.t@acmesec.com',
    name: 'Lisa Thompson',
    role: 'DEVELOPER',
    isActive: true,
    mfaEnabled: false,
    lastLoginAt: '2026-03-25T14:20:00Z',
    createdAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'usr_007',
    email: 'raj.p@acmesec.com',
    name: 'Raj Patel',
    role: 'VIEWER',
    isActive: false,
    mfaEnabled: false,
    lastLoginAt: '2026-02-14T09:00:00Z',
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'usr_008',
    email: 'client-admin@partner.com',
    name: 'Dana Ortiz',
    role: 'CLIENT_ADMIN',
    isActive: true,
    mfaEnabled: true,
    lastLoginAt: '2026-03-27T10:45:00Z',
    createdAt: '2026-02-15T00:00:00Z',
  },
  {
    id: 'usr_009',
    email: 'viewer@partner.com',
    name: 'Alex Kim',
    role: 'CLIENT_VIEWER',
    isActive: true,
    mfaEnabled: false,
    lastLoginAt: '2026-03-20T08:30:00Z',
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'usr_010',
    email: 'support@cveriskpilot.com',
    name: 'Platform Support',
    role: 'PLATFORM_SUPPORT',
    isActive: true,
    mfaEnabled: true,
    lastLoginAt: '2026-03-28T07:00:00Z',
    createdAt: '2025-10-01T00:00:00Z',
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase();
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status');

    let users = [...MOCK_USERS];

    // Filter by search term (name or email)
    if (search) {
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search),
      );
    }

    // Filter by role
    if (roleFilter) {
      users = users.filter((u) => u.role === roleFilter);
    }

    // Filter by active status
    if (statusFilter === 'active') {
      users = users.filter((u) => u.isActive);
    } else if (statusFilter === 'inactive') {
      users = users.filter((u) => !u.isActive);
    }

    return NextResponse.json({
      users,
      total: users.length,
    });
  } catch (error) {
    console.error('[API] GET /api/users error:', error);
    return NextResponse.json(
      { error: 'Failed to load users' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, role, name } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 },
      );
    }

    // Validate role against known UserRole values
    const validRoles = [
      'PLATFORM_ADMIN',
      'PLATFORM_SUPPORT',
      'ORG_OWNER',
      'SECURITY_ADMIN',
      'ANALYST',
      'DEVELOPER',
      'VIEWER',
      'SERVICE_ACCOUNT',
      'CLIENT_ADMIN',
      'CLIENT_VIEWER',
    ];

    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 },
      );
    }

    // Mock: return success with a generated invite record
    const invite = {
      id: `inv_${Date.now()}`,
      email,
      name: name || null,
      role,
      status: 'pending',
      invitedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return NextResponse.json({ invite }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/users error:', error);
    return NextResponse.json(
      { error: 'Failed to invite user' },
      { status: 500 },
    );
  }
}
