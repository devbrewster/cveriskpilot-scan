import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession, generateApiKey } from '@cveriskpilot/auth';

/**
 * PUT /api/keys/[id] — Rotate an API key.
 * Generates a new key, updates the hash, returns the new full key ONCE.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the key belongs to the user's org
    const existing = await (prisma as any).apiKey.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Get org slug for key format
    const org = await (prisma as any).organization.findUnique({
      where: { id: session.organizationId },
      select: { slug: true },
    });

    // Generate new key
    const generated = generateApiKey(org.slug);

    // Update hash in database
    await (prisma as any).apiKey.update({
      where: { id },
      data: {
        keyHash: generated.keyHash,
        lastUsedAt: null, // Reset usage tracking on rotation
      },
    });

    return NextResponse.json({
      id,
      name: existing.name,
      key: generated.key, // New full key — returned ONCE
      keyPreview: generated.keyPrefix,
      scope: existing.scope,
      rotatedAt: new Date().toISOString(),
      warning: 'The previous key is now invalid. Store the new key securely.',
    });
  } catch (error) {
    console.error(`[API] PUT /api/keys/[id] error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/keys/[id] — Revoke (permanently delete) an API key.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the key belongs to the user's org
    const existing = await (prisma as any).apiKey.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    await (prisma as any).apiKey.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    console.error(`[API] DELETE /api/keys/[id] error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
