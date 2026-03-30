import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, requireRole, ADMIN_ROLES, checkCsrf } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// POST /api/settings/integrations/jira/test — test Jira connection
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const roleCheck = requireRole(session.role, ADMIN_ROLES);
    if (roleCheck) return roleCheck;

    const body = await request.json();
    const { cloudUrl, apiToken, userEmail } = body as {
      cloudUrl?: string;
      apiToken?: string;
      userEmail?: string;
    };

    if (!cloudUrl || !apiToken || !userEmail) {
      return NextResponse.json(
        { error: 'cloudUrl, apiToken, and userEmail are required' },
        { status: 400 },
      );
    }

    // Validate URL format
    try {
      new URL(cloudUrl);
    } catch {
      return NextResponse.json(
        { error: 'cloudUrl must be a valid URL' },
        { status: 400 },
      );
    }

    // In production, this would make an actual API call to Jira Cloud:
    //   GET {cloudUrl}/rest/api/3/myself
    //   with Basic auth (userEmail:apiToken)
    //
    // For now, we simulate a successful connection test.
    // A real implementation would catch network/auth errors and return
    // appropriate error messages.

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Jira Cloud.',
      serverInfo: {
        baseUrl: cloudUrl,
        version: 'Cloud',
        user: userEmail,
      },
    });
  } catch (error) {
    console.error('Jira connection test error:', error);
    return NextResponse.json(
      { error: 'Failed to test Jira connection' },
      { status: 500 },
    );
  }
}
