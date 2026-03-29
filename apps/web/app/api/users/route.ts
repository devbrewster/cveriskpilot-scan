import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, requireRole, MANAGE_ROLES } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase();
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status');

    // Build Prisma where clause, scoped to organization
    const where: Record<string, unknown> = {
      organizationId: session.organizationId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleFilter) {
      where.role = roleFilter;
    }

    if (statusFilter === 'active') {
      where.status = 'ACTIVE';
    } else if (statusFilter === 'inactive') {
      where.status = 'DEACTIVATED';
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    // Map to response shape matching what the frontend expects
    const mapped = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.status === 'ACTIVE',
      mfaEnabled: u.mfaEnabled,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json({
      users: mapped,
      total: mapped.length,
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
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    // Only admins can invite users
    const roleError = requireRole(session.role, MANAGE_ROLES);
    if (roleError) return roleError;

    const body = await request.json();
    const { email, role, name } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 },
      );
    }

    // Org-level roles that tenant admins can assign
    const ASSIGNABLE_ROLES = [
      'SECURITY_ADMIN',
      'ANALYST',
      'DEVELOPER',
      'VIEWER',
      'SERVICE_ACCOUNT',
      'CLIENT_ADMIN',
      'CLIENT_VIEWER',
    ];

    // Only PLATFORM_ADMIN can assign platform-level or owner roles
    const PLATFORM_ONLY_ROLES = ['PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'ORG_OWNER'];
    if (PLATFORM_ONLY_ROLES.includes(role) && session.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: `Only platform administrators can assign the ${role} role` },
        { status: 403 },
      );
    }

    const validRoles = [...ASSIGNABLE_ROLES, ...PLATFORM_ONLY_ROLES];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(', ')}` },
        { status: 400 },
      );
    }

    // Check for existing user with this email in the org
    const existing = await prisma.user.findUnique({
      where: {
        organizationId_email: {
          organizationId: session.organizationId,
          email,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists in your organization' },
        { status: 409 },
      );
    }

    // Create user with PENDING_INVITE status
    const newUser = await prisma.user.create({
      data: {
        organizationId: session.organizationId,
        email,
        name: name || email.split('@')[0],
        role,
        status: 'PENDING_INVITE',
      },
    });

    logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: 'CREATE',
      entityType: 'User',
      entityId: newUser.id,
      details: { email, role, invitedBy: session.email },
    });

    const invite = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      status: 'pending',
      invitedAt: newUser.createdAt.toISOString(),
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
