import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@cveriskpilot/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface OrgOverride {
  orgId: string;
  orgName: string;
  enabled: boolean;
}

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  scope: 'global' | 'org';
  orgOverrides: OrgOverride[];
  updatedAt: string;
  updatedBy: string;
}

// In-memory mock store (resets on restart)
const flags: FeatureFlag[] = [
  {
    id: 'flag_ai_triage',
    name: 'ai_triage',
    description: 'AI-powered vulnerability triage using Claude for severity assessment and prioritization',
    enabled: true,
    scope: 'global',
    orgOverrides: [],
    updatedAt: '2026-03-27T14:30:00Z',
    updatedBy: 'admin@cveriskpilot.com',
  },
  {
    id: 'flag_passkey_auth',
    name: 'passkey_auth',
    description: 'WebAuthn/Passkey authentication as an alternative to password-based login',
    enabled: false,
    scope: 'global',
    orgOverrides: [
      { orgId: 'org_acme', orgName: 'Acme Corp', enabled: true },
      { orgId: 'org_globex', orgName: 'Globex Inc', enabled: true },
    ],
    updatedAt: '2026-03-26T09:15:00Z',
    updatedBy: 'ops@cveriskpilot.com',
  },
  {
    id: 'flag_pdf_export',
    name: 'pdf_export',
    description: 'Generate PDF reports for executive summaries and POAM documents',
    enabled: true,
    scope: 'global',
    orgOverrides: [],
    updatedAt: '2026-03-25T11:00:00Z',
    updatedBy: 'admin@cveriskpilot.com',
  },
  {
    id: 'flag_advanced_reporting',
    name: 'advanced_reporting',
    description: 'Advanced analytics dashboards with custom date ranges, pivot tables, and trend analysis',
    enabled: false,
    scope: 'org',
    orgOverrides: [
      { orgId: 'org_acme', orgName: 'Acme Corp', enabled: true },
      { orgId: 'org_initech', orgName: 'Initech', enabled: true },
      { orgId: 'org_umbrella', orgName: 'Umbrella Corp', enabled: false },
    ],
    updatedAt: '2026-03-24T16:45:00Z',
    updatedBy: 'ops@cveriskpilot.com',
  },
  {
    id: 'flag_custom_dashboards',
    name: 'custom_dashboards',
    description: 'Allow organizations to build and save custom dashboard layouts with drag-and-drop widgets',
    enabled: false,
    scope: 'org',
    orgOverrides: [
      { orgId: 'org_globex', orgName: 'Globex Inc', enabled: true },
    ],
    updatedAt: '2026-03-23T08:20:00Z',
    updatedBy: 'admin@cveriskpilot.com',
  },
  {
    id: 'flag_sso_enforcement',
    name: 'sso_enforcement',
    description: 'Require SSO (SAML/OIDC) for all organization members, disabling password login',
    enabled: true,
    scope: 'org',
    orgOverrides: [
      { orgId: 'org_acme', orgName: 'Acme Corp', enabled: true },
      { orgId: 'org_globex', orgName: 'Globex Inc', enabled: true },
      { orgId: 'org_initech', orgName: 'Initech', enabled: false },
    ],
    updatedAt: '2026-03-22T13:10:00Z',
    updatedBy: 'admin@cveriskpilot.com',
  },
  {
    id: 'flag_api_v2',
    name: 'api_v2',
    description: 'Enable v2 REST API endpoints with improved pagination, filtering, and batch operations',
    enabled: false,
    scope: 'global',
    orgOverrides: [
      { orgId: 'org_acme', orgName: 'Acme Corp', enabled: true },
    ],
    updatedAt: '2026-03-21T10:00:00Z',
    updatedBy: 'ops@cveriskpilot.com',
  },
  {
    id: 'flag_dark_mode',
    name: 'dark_mode',
    description: 'Dark mode theme support across all application pages and components',
    enabled: true,
    scope: 'global',
    orgOverrides: [],
    updatedAt: '2026-03-20T15:30:00Z',
    updatedBy: 'admin@cveriskpilot.com',
  },
  {
    id: 'flag_sbom_ingestion',
    name: 'sbom_ingestion',
    description: 'Ingest and correlate SBOM (CycloneDX/SPDX) with vulnerability findings for software supply chain visibility',
    enabled: true,
    scope: 'global',
    orgOverrides: [],
    updatedAt: '2026-03-19T09:45:00Z',
    updatedBy: 'ops@cveriskpilot.com',
  },
  {
    id: 'flag_slack_integration',
    name: 'slack_integration',
    description: 'Real-time Slack notifications for new critical findings, SLA breaches, and case assignments',
    enabled: false,
    scope: 'org',
    orgOverrides: [
      { orgId: 'org_acme', orgName: 'Acme Corp', enabled: true },
      { orgId: 'org_globex', orgName: 'Globex Inc', enabled: true },
    ],
    updatedAt: '2026-03-18T12:00:00Z',
    updatedBy: 'admin@cveriskpilot.com',
  },
];

export async function GET(request: NextRequest) {
  const session = await getServerSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.role !== 'PLATFORM_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ flags });
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { flagId, enabled, orgId } = body as {
      flagId: string;
      enabled: boolean;
      orgId?: string;
    };

    if (!flagId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'flagId and enabled are required' },
        { status: 400 },
      );
    }

    const flag = flags.find((f) => f.id === flagId);
    if (!flag) {
      return NextResponse.json(
        { error: 'Flag not found' },
        { status: 404 },
      );
    }

    if (orgId) {
      // Update or create org override
      const existing = flag.orgOverrides.find((o) => o.orgId === orgId);
      if (existing) {
        existing.enabled = enabled;
      } else {
        flag.orgOverrides.push({
          orgId,
          orgName: orgId.replace('org_', '').replace(/^\w/, (c) => c.toUpperCase()),
          enabled,
        });
      }
    } else {
      // Update global toggle
      flag.enabled = enabled;
    }

    flag.updatedAt = new Date().toISOString();
    flag.updatedBy = session.email;

    return NextResponse.json({ flag });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
