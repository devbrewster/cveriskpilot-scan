import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleScimRequest } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// Bearer token authentication for SCIM endpoint
// ---------------------------------------------------------------------------

async function authenticateScimRequest(
  request: NextRequest,
): Promise<{ orgId: string } | { error: string; status: number }> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header', status: 401 };
  }

  const token = authHeader.slice(7);

  if (!token) {
    return { error: 'Empty bearer token', status: 401 };
  }

  // Look up the API key to determine the organization
  // SCIM tokens are stored as API keys with scope "scim"
  const crypto = await import('node:crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const apiKey = await (prisma as any).apiKey.findFirst({
    where: {
      keyHash: tokenHash,
      scope: { contains: 'scim' },
    },
    include: {
      organization: {
        select: { id: true, deletedAt: true },
      },
    },
  });

  if (!apiKey) {
    return { error: 'Invalid SCIM bearer token', status: 401 };
  }

  if (apiKey.organization?.deletedAt) {
    return { error: 'Organization is deactivated', status: 403 };
  }

  if (apiKey.expiresAt && new Date(apiKey.expiresAt) <= new Date()) {
    return { error: 'SCIM token has expired', status: 401 };
  }

  // Update last used timestamp (best-effort)
  (prisma as any).apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return { orgId: apiKey.organizationId };
}

// ---------------------------------------------------------------------------
// Route handlers — catch-all for /api/scim/[...path]
// ---------------------------------------------------------------------------

async function handleRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const auth = await authenticateScimRequest(request);

    if ('error' in auth) {
      return NextResponse.json(
        {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          status: String(auth.status),
          detail: auth.error,
        },
        {
          status: auth.status,
          headers: { 'Content-Type': 'application/scim+json' },
        },
      );
    }

    const { path } = await params;
    const scimPath = path.join('/');

    let body: unknown = null;
    if (request.method !== 'GET' && request.method !== 'DELETE') {
      try {
        body = await request.json();
      } catch {
        body = null;
      }
    }

    const result = await handleScimRequest(
      prisma,
      request.method,
      scimPath,
      body,
      auth.orgId,
      request.nextUrl.searchParams,
    );

    if (result.status === 204) {
      return new NextResponse(null, {
        status: 204,
        headers: { 'Content-Type': 'application/scim+json' },
      });
    }

    return NextResponse.json(result.body, {
      status: result.status,
      headers: { 'Content-Type': 'application/scim+json' },
    });
  } catch (error) {
    console.error('[SCIM] Error:', error);
    return NextResponse.json(
      {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        status: '500',
        detail: 'Internal server error',
      },
      {
        status: 500,
        headers: { 'Content-Type': 'application/scim+json' },
      },
    );
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
