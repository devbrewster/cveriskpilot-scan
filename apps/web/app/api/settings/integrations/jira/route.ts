import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// In-memory Jira configuration store (per org)
// In production, this would be stored in an IntegrationConfig table via Prisma
// with the apiToken encrypted at rest.
// ---------------------------------------------------------------------------

interface JiraConfig {
  cloudUrl: string;
  apiToken: string;
  userEmail: string;
  defaultProjectKey: string;
  defaultIssueType: string;
  autoSync: boolean;
  syncDirection: string;
  priorityMapping: Record<string, string>;
}

const jiraConfigStore: Record<string, JiraConfig> = {};

// ---------------------------------------------------------------------------
// GET /api/settings/integrations/jira — fetch Jira config for an org
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.organizationId;
    const config = jiraConfigStore[organizationId] ?? null;

    if (!config) {
      return NextResponse.json({
        organizationId,
        configured: false,
        config: null,
      });
    }

    // Mask the API token for security
    return NextResponse.json({
      organizationId,
      configured: true,
      config: {
        ...config,
        apiToken: config.apiToken ? '****' + config.apiToken.slice(-4) : '',
      },
    });
  } catch (error) {
    console.error('Jira config fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Jira configuration' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/settings/integrations/jira — save Jira configuration
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.organizationId;
    const body = await request.json();

    const {
      cloudUrl,
      apiToken,
      userEmail,
      defaultProjectKey,
      defaultIssueType,
      autoSync,
      syncDirection,
      priorityMapping,
    } = body as Partial<JiraConfig>;

    // Validate required fields
    if (!cloudUrl || !apiToken || !userEmail || !defaultProjectKey) {
      return NextResponse.json(
        { error: 'cloudUrl, apiToken, userEmail, and defaultProjectKey are required' },
        { status: 400 },
      );
    }

    // Basic URL validation
    try {
      new URL(cloudUrl);
    } catch {
      return NextResponse.json(
        { error: 'cloudUrl must be a valid URL' },
        { status: 400 },
      );
    }

    jiraConfigStore[organizationId] = {
      cloudUrl,
      apiToken,
      userEmail,
      defaultProjectKey,
      defaultIssueType: defaultIssueType ?? 'Bug',
      autoSync: autoSync ?? false,
      syncDirection: syncDirection ?? 'outbound',
      priorityMapping: priorityMapping ?? {
        Critical: 'Highest',
        High: 'High',
        Medium: 'Medium',
        Low: 'Low',
        Info: 'Lowest',
      },
    };

    return NextResponse.json({
      organizationId,
      message: 'Jira configuration saved successfully',
    });
  } catch (error) {
    console.error('Jira config save error:', error);
    return NextResponse.json(
      { error: 'Failed to save Jira configuration' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/settings/integrations/jira — alias for POST (update config)
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  return POST(request);
}
