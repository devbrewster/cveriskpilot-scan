import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@cveriskpilot/auth';

type AssetType = 'HOST' | 'REPOSITORY' | 'CONTAINER_IMAGE' | 'CLOUD_ACCOUNT' | 'APPLICATION';

interface MockAsset {
  id: string;
  organizationId: string;
  clientId: string;
  name: string;
  type: AssetType;
  environment: string;
  criticality: number;
  internetExposed: boolean;
  tags: string[];
  deploymentRefs: Record<string, unknown>;
  findingCount: number;
  createdAt: string;
  updatedAt: string;
}

const mockAssets: MockAsset[] = [
  {
    id: 'asset-001',
    organizationId: 'org-default',
    clientId: 'client-001',
    name: 'prod-web-server-01',
    type: 'HOST',
    environment: 'production',
    criticality: 5,
    internetExposed: true,
    tags: ['pci-scope', 'dmz', 'linux'],
    deploymentRefs: { ip: '10.0.1.15', hostname: 'web01.prod.internal' },
    findingCount: 12,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-03-25T14:30:00Z',
  },
  {
    id: 'asset-002',
    organizationId: 'org-default',
    clientId: 'client-001',
    name: 'cveriskpilot/api-service',
    type: 'REPOSITORY',
    environment: 'production',
    criticality: 4,
    internetExposed: false,
    tags: ['backend', 'node', 'typescript'],
    deploymentRefs: { repo: 'github.com/cveriskpilot/api-service', branch: 'main' },
    findingCount: 8,
    createdAt: '2026-01-20T08:00:00Z',
    updatedAt: '2026-03-22T09:15:00Z',
  },
  {
    id: 'asset-003',
    organizationId: 'org-default',
    clientId: 'client-001',
    name: 'frontend-app:v2.4.1',
    type: 'CONTAINER_IMAGE',
    environment: 'staging',
    criticality: 3,
    internetExposed: false,
    tags: ['react', 'nginx', 'gcr'],
    deploymentRefs: { registry: 'gcr.io/cveriskpilot/frontend-app', tag: 'v2.4.1' },
    findingCount: 3,
    createdAt: '2026-02-01T12:00:00Z',
    updatedAt: '2026-03-20T16:45:00Z',
  },
  {
    id: 'asset-004',
    organizationId: 'org-default',
    clientId: 'client-002',
    name: 'aws-account-prod (112233445566)',
    type: 'CLOUD_ACCOUNT',
    environment: 'production',
    criticality: 5,
    internetExposed: true,
    tags: ['aws', 'fedramp', 'gov-cloud'],
    deploymentRefs: { provider: 'aws', accountId: '112233445566', region: 'us-gov-west-1' },
    findingCount: 27,
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-03-27T11:00:00Z',
  },
  {
    id: 'asset-005',
    organizationId: 'org-default',
    clientId: 'client-002',
    name: 'Customer Portal',
    type: 'APPLICATION',
    environment: 'production',
    criticality: 5,
    internetExposed: true,
    tags: ['soc2', 'customer-facing', 'pci-scope'],
    deploymentRefs: { url: 'https://portal.cveriskpilot.com', cloudRunService: 'portal-prod' },
    findingCount: 15,
    createdAt: '2026-01-05T07:00:00Z',
    updatedAt: '2026-03-26T18:20:00Z',
  },
  {
    id: 'asset-006',
    organizationId: 'org-default',
    clientId: 'client-001',
    name: 'db-postgres-primary',
    type: 'HOST',
    environment: 'production',
    criticality: 5,
    internetExposed: false,
    tags: ['database', 'postgresql', 'cloud-sql'],
    deploymentRefs: { ip: '10.0.2.5', instance: 'cveriskpilot:us-central1:pg-primary' },
    findingCount: 4,
    createdAt: '2026-01-12T11:00:00Z',
    updatedAt: '2026-03-24T13:10:00Z',
  },
  {
    id: 'asset-007',
    organizationId: 'org-default',
    clientId: 'client-003',
    name: 'cveriskpilot/scanner-parsers',
    type: 'REPOSITORY',
    environment: 'development',
    criticality: 2,
    internetExposed: false,
    tags: ['internal', 'parsers', 'python'],
    deploymentRefs: { repo: 'github.com/cveriskpilot/scanner-parsers', branch: 'develop' },
    findingCount: 19,
    createdAt: '2026-02-10T14:00:00Z',
    updatedAt: '2026-03-18T10:30:00Z',
  },
  {
    id: 'asset-008',
    organizationId: 'org-default',
    clientId: 'client-002',
    name: 'gcp-project-staging',
    type: 'CLOUD_ACCOUNT',
    environment: 'staging',
    criticality: 2,
    internetExposed: false,
    tags: ['gcp', 'non-prod', 'dev-team'],
    deploymentRefs: { provider: 'gcp', projectId: 'cveriskpilot-staging-01' },
    findingCount: 6,
    createdAt: '2026-02-15T08:30:00Z',
    updatedAt: '2026-03-21T15:00:00Z',
  },
  {
    id: 'asset-009',
    organizationId: 'org-default',
    clientId: 'client-001',
    name: 'enrichment-worker:latest',
    type: 'CONTAINER_IMAGE',
    environment: 'production',
    criticality: 3,
    internetExposed: false,
    tags: ['worker', 'cloud-run', 'node'],
    deploymentRefs: { registry: 'gcr.io/cveriskpilot/enrichment-worker', tag: 'latest' },
    findingCount: 2,
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-03-23T12:00:00Z',
  },
  {
    id: 'asset-010',
    organizationId: 'org-default',
    clientId: 'client-003',
    name: 'Internal Admin Dashboard',
    type: 'APPLICATION',
    environment: 'production',
    criticality: 4,
    internetExposed: false,
    tags: ['internal', 'admin', 'react'],
    deploymentRefs: { url: 'https://admin.internal.cveriskpilot.com', cloudRunService: 'admin-prod' },
    findingCount: 7,
    createdAt: '2026-01-25T13:00:00Z',
    updatedAt: '2026-03-19T17:45:00Z',
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const environment = searchParams.get('environment');
    const criticality = searchParams.get('criticality');
    const internetExposed = searchParams.get('internetExposed');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '12', 10);

    let filtered = [...mockAssets];

    if (type) {
      filtered = filtered.filter((a) => a.type === type);
    }
    if (environment) {
      filtered = filtered.filter((a) =>
        a.environment.toLowerCase().includes(environment.toLowerCase()),
      );
    }
    if (criticality) {
      filtered = filtered.filter((a) => a.criticality >= parseInt(criticality, 10));
    }
    if (internetExposed === 'true') {
      filtered = filtered.filter((a) => a.internetExposed);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error('[API] GET /api/assets error:', error);
    return NextResponse.json({ error: 'Failed to load assets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, environment, criticality, internetExposed, tags } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'name and type are required' },
        { status: 400 },
      );
    }

    const validTypes: AssetType[] = ['HOST', 'REPOSITORY', 'CONTAINER_IMAGE', 'CLOUD_ACCOUNT', 'APPLICATION'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 },
      );
    }

    const newAsset: MockAsset = {
      id: `asset-${Date.now()}`,
      organizationId: 'org-default',
      clientId: 'client-001',
      name,
      type,
      environment: environment || 'production',
      criticality: criticality ?? 3,
      internetExposed: internetExposed ?? false,
      tags: tags || [],
      deploymentRefs: {},
      findingCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(newAsset, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/assets error:', error);
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}
