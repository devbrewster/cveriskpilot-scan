import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@cveriskpilot/auth';
import { isValidSlackWebhookUrl } from '@cveriskpilot/integrations';
import { isValidTeamsWebhookUrl } from '@cveriskpilot/integrations';

// ---------------------------------------------------------------------------
// In-memory pipeline notification channel store (per org)
// In production, this would be stored in a PipelineNotificationChannel table.
// ---------------------------------------------------------------------------

interface StoredChannel {
  id: string;
  channel: 'slack' | 'teams' | 'webhook';
  webhookUrl: string;
  label?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const channelStore: Record<string, StoredChannel[]> = {};

function generateId(): string {
  return `pnc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateWebhookUrl(
  channel: string,
  url: string,
): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return 'Webhook URL must use HTTPS';
    }
  } catch {
    return 'Invalid URL format';
  }

  if (channel === 'slack' && !isValidSlackWebhookUrl(url)) {
    return 'Slack webhook URL must start with https://hooks.slack.com/';
  }

  if (channel === 'teams' && !isValidTeamsWebhookUrl(url)) {
    return 'Teams webhook URL must match https://*.webhook.office.com/';
  }

  return null;
}

const VALID_CHANNELS = ['slack', 'teams', 'webhook'] as const;

// ---------------------------------------------------------------------------
// GET /api/settings/integrations/pipeline-notifications
// Fetch all pipeline notification channels for the org
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const organizationId = session.organizationId;
    const channels = channelStore[organizationId] ?? [];

    return NextResponse.json({ organizationId, channels });
  } catch (error) {
    console.error('Pipeline notification channels fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline notification channels' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/settings/integrations/pipeline-notifications
// Create or update pipeline notification channels for the org
// Expects: { channels: Array<{ id?, channel, webhookUrl, label?, enabled }> }
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    // Require admin role
    const adminRoles = ['PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'ORG_OWNER', 'SECURITY_ADMIN'];
    if (!adminRoles.includes(session.role)) {
      return NextResponse.json(
        { error: 'Forbidden: admin role required' },
        { status: 403 },
      );
    }

    const organizationId = session.organizationId;
    const body = await request.json();

    if (!Array.isArray(body.channels)) {
      return NextResponse.json(
        { error: '`channels` array is required' },
        { status: 400 },
      );
    }

    const errors: string[] = [];
    const validated: StoredChannel[] = [];

    for (let i = 0; i < body.channels.length; i++) {
      const entry = body.channels[i];

      // Validate channel type
      if (!entry.channel || !VALID_CHANNELS.includes(entry.channel)) {
        errors.push(
          `channels[${i}]: channel must be one of: ${VALID_CHANNELS.join(', ')}`,
        );
        continue;
      }

      // Validate webhook URL
      if (!entry.webhookUrl || typeof entry.webhookUrl !== 'string') {
        errors.push(`channels[${i}]: webhookUrl is required`);
        continue;
      }

      const urlError = validateWebhookUrl(entry.channel, entry.webhookUrl);
      if (urlError) {
        errors.push(`channels[${i}]: ${urlError}`);
        continue;
      }

      const now = new Date().toISOString();
      validated.push({
        id: entry.id || generateId(),
        channel: entry.channel,
        webhookUrl: entry.webhookUrl,
        label: entry.label || undefined,
        enabled: entry.enabled !== false,
        createdAt: entry.createdAt || now,
        updatedAt: now,
      });
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    channelStore[organizationId] = validated;

    return NextResponse.json({
      organizationId,
      channels: validated,
      message: 'Pipeline notification channels saved successfully',
    });
  } catch (error) {
    console.error('Pipeline notification channels save error:', error);
    return NextResponse.json(
      { error: 'Failed to save pipeline notification channels' },
      { status: 500 },
    );
  }
}
