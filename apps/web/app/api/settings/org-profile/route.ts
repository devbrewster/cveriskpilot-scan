import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, ADMIN_ROLES } from '@cveriskpilot/auth';
import { logAudit } from '@/lib/audit';

// ---------------------------------------------------------------------------
// In-memory org profile store (per org)
// In production, this would read/write to the Organization model via Prisma.
// ---------------------------------------------------------------------------

interface OrgProfileData {
  name: string;
  contactEmail: string;
  slug: string;
  usage: {
    uploads: number;
    aiCalls: number;
    assets: number;
    teamMembers: number;
  };
}

const profileStore: Record<string, OrgProfileData> = {};

function getOrCreateProfile(organizationId: string): OrgProfileData {
  if (!profileStore[organizationId]) {
    profileStore[organizationId] = {
      name: 'My Organization',
      contactEmail: 'admin@example.com',
      slug: organizationId,
      usage: {
        uploads: 0,
        aiCalls: 0,
        assets: 0,
        teamMembers: 1,
      },
    };
  }
  return profileStore[organizationId];
}

// ---------------------------------------------------------------------------
// GET /api/settings/org-profile — fetch organization profile
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const organizationId = session.organizationId;
    const profile = getOrCreateProfile(organizationId);

    return NextResponse.json({
      organizationId,
      name: profile.name,
      contactEmail: profile.contactEmail,
      slug: profile.slug,
      usage: profile.usage,
    });
  } catch (error) {
    console.error('Org profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization profile' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/settings/org-profile — update organization profile
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const roleError = requireRole(session.role, ADMIN_ROLES);
    if (roleError) return roleError;

    const organizationId = session.organizationId;
    const body = await request.json();

    const { name, contactEmail } = body as {
      name?: string;
      contactEmail?: string;
    };

    if (!name && !contactEmail) {
      return NextResponse.json(
        { error: 'At least one of name or contactEmail is required' },
        { status: 400 },
      );
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'name must be a non-empty string' },
        { status: 400 },
      );
    }

    if (contactEmail !== undefined && typeof contactEmail !== 'string') {
      return NextResponse.json(
        { error: 'contactEmail must be a string' },
        { status: 400 },
      );
    }

    // Basic email format check
    if (contactEmail && !contactEmail.includes('@')) {
      return NextResponse.json(
        { error: 'contactEmail must be a valid email address' },
        { status: 400 },
      );
    }

    const profile = getOrCreateProfile(organizationId);
    if (name !== undefined) profile.name = name.trim();
    if (contactEmail !== undefined) profile.contactEmail = contactEmail.trim();

    logAudit({
      organizationId,
      actorId: session.userId,
      action: 'UPDATE',
      entityType: 'Organization',
      entityId: organizationId,
      details: { ...(name !== undefined ? { name } : {}), ...(contactEmail !== undefined ? { contactEmail } : {}) },
    });

    return NextResponse.json({
      organizationId,
      name: profile.name,
      contactEmail: profile.contactEmail,
      slug: profile.slug,
      message: 'Organization profile updated successfully',
    });
  } catch (error) {
    console.error('Org profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update organization profile' },
      { status: 500 },
    );
  }
}
