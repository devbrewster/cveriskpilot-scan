import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession, generateApiKey } from '@cveriskpilot/auth';
import { UserRole, UserStatus } from '@cveriskpilot/domain';

/**
 * GET /api/service-accounts — List service accounts for the org.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceAccounts = await (prisma as any).user.findMany({
      where: {
        organizationId: session.organizationId,
        role: UserRole.SERVICE_ACCOUNT,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    // For each service account, get their API keys
    const accountsWithKeys = await Promise.all(
      serviceAccounts.map(async (sa: any) => {
        const keys = await (prisma as any).apiKey.findMany({
          where: {
            organizationId: session.organizationId,
            name: { startsWith: `sa:${sa.id}:` },
          },
          select: {
            id: true,
            name: true,
            scope: true,
            expiresAt: true,
            lastUsedAt: true,
            createdAt: true,
            keyHash: true,
          },
        });

        return {
          ...sa,
          apiKeys: keys.map((k: any) => ({
            ...k,
            keyPreview: `crp_****${k.keyHash.slice(-4)}`,
            keyHash: undefined,
          })),
        };
      }),
    );

    return NextResponse.json({ serviceAccounts: accountsWithKeys });
  } catch (error) {
    console.error('[API] GET /api/service-accounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/service-accounts — Create a new service account.
 *
 * Body: { name: string, scopes: string }
 * Scopes: "upload", "read", "admin" (comma-separated)
 *
 * Creates a User with role SERVICE_ACCOUNT and generates an API key.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { name, scopes } = body as { name?: string; scopes?: string };

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const scopeStr = scopes ?? 'read,upload';

    // Get org slug
    const org = await (prisma as any).organization.findUnique({
      where: { id: session.organizationId },
      select: { slug: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Create user + API key in a transaction
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // Create service account user
      const saEmail = `sa-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}@${org.slug}.svc.cveriskpilot`;
      const saUser = await tx.user.create({
        data: {
          organizationId: session.organizationId,
          email: saEmail,
          name: `SA: ${name}`,
          role: UserRole.SERVICE_ACCOUNT,
          status: UserStatus.ACTIVE,
        },
      });

      // Generate API key
      const generated = generateApiKey(org.slug);

      const apiKey = await tx.apiKey.create({
        data: {
          organizationId: session.organizationId,
          name: `sa:${saUser.id}:${name}`,
          keyHash: generated.keyHash,
          scope: scopeStr,
          assignedClients: [],
        },
      });

      return {
        serviceAccount: {
          id: saUser.id,
          name: saUser.name,
          email: saUser.email,
          status: saUser.status,
          createdAt: saUser.createdAt,
        },
        apiKey: {
          id: apiKey.id,
          key: generated.key, // Full key — returned ONCE
          keyPreview: generated.keyPrefix,
          scope: apiKey.scope,
          createdAt: apiKey.createdAt,
        },
      };
    });

    return NextResponse.json(
      {
        ...result,
        warning: 'The API key is shown only once. Store it securely.',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[API] POST /api/service-accounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
