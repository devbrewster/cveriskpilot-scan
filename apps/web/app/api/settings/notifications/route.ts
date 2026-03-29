import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, ADMIN_ROLES } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// In-memory notification preferences store (per org)
// In production, this would be stored via Prisma in a NotificationPreference
// table or as JSON on the Organization model.
// ---------------------------------------------------------------------------

interface ChannelPreference {
  email: boolean;
  in_app: boolean;
}

type Preferences = Record<string, ChannelPreference>;

const preferencesStore: Record<string, Preferences> = {};

// ---------------------------------------------------------------------------
// GET /api/settings/notifications — fetch notification preferences for an org
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const organizationId = session.organizationId;
    const preferences = preferencesStore[organizationId] ?? null;

    return NextResponse.json({ organizationId, preferences });
  } catch (error) {
    console.error('Notification preferences fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/settings/notifications — save notification preferences
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

    if (!body.preferences || typeof body.preferences !== 'object') {
      return NextResponse.json(
        { error: 'preferences object is required' },
        { status: 400 },
      );
    }

    // Basic validation: each key should have email and in_app booleans
    const preferences: Preferences = {};
    for (const [key, val] of Object.entries(body.preferences)) {
      if (val && typeof val === 'object') {
        const channelPref = val as Record<string, unknown>;
        preferences[key] = {
          email: Boolean(channelPref.email),
          in_app: Boolean(channelPref.in_app),
        };
      }
    }

    preferencesStore[organizationId] = preferences;

    return NextResponse.json({
      organizationId,
      preferences,
      message: 'Notification preferences saved successfully',
    });
  } catch (error) {
    console.error('Notification preferences save error:', error);
    return NextResponse.json(
      { error: 'Failed to save notification preferences' },
      { status: 500 },
    );
  }
}
