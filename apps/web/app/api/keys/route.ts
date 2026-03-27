import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getServerSession,
  generateApiKey,
  hashApiKey,
  maskApiKey,
} from '@cveriskpilot/auth';

/**
 * GET /api/keys — List API keys for the authenticated user's organization.
 * Keys are always masked: crp_****{last4}
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keys = await (prisma as any).apiKey.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        scope: true,
        assignedClients: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        keyHash: true,
      },
    });

    // Mask keys — we only show crp_****{hash_prefix} since we don't store the full key
    const maskedKeys = keys.map((key: any) => ({
      id: key.id,
      name: key.name,
      scope: key.scope,
      assignedClients: key.assignedClients,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      keyPreview: `crp_****${key.keyHash.slice(-4)}`,
    }));

    return NextResponse.json({ keys: maskedKeys });
  } catch (error) {
    console.error('[API] GET /api/keys error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/keys — Create a new API key.
 * Returns the full plaintext key ONCE. It cannot be retrieved again.
 *
 * Body: { name: string, scopes: string, expiresAt?: string }
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

    const { name, scopes, expiresAt } = body as {
      name?: string;
      scopes?: string;
      expiresAt?: string;
    };

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const validScopes = ['read', 'upload', 'admin', 'scim'];
    const scopeStr = scopes ?? 'read';
    const scopeParts = scopeStr.split(',').map((s: string) => s.trim());
    for (const scope of scopeParts) {
      if (!validScopes.includes(scope)) {
        return NextResponse.json(
          { error: `Invalid scope: ${scope}. Valid scopes: ${validScopes.join(', ')}` },
          { status: 400 },
        );
      }
    }

    // Get org slug for key format
    const org = await (prisma as any).organization.findUnique({
      where: { id: session.organizationId },
      select: { slug: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Generate the key
    const generated = generateApiKey(org.slug);

    // Store hashed key
    const apiKey = await (prisma as any).apiKey.create({
      data: {
        organizationId: session.organizationId,
        name,
        keyHash: generated.keyHash,
        scope: scopeStr,
        assignedClients: [],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json(
      {
        id: apiKey.id,
        name: apiKey.name,
        key: generated.key, // Full key — returned ONCE
        keyPreview: generated.keyPrefix,
        scope: apiKey.scope,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        warning: 'This is the only time the full API key will be shown. Store it securely.',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[API] POST /api/keys error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
