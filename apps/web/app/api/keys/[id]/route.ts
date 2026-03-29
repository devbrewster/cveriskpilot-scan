import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, generateApiKey, requireRole, MANAGE_ROLES } from '@cveriskpilot/auth';

/**
 * PUT /api/keys/[id] — Rotate an API key.
 * Generates a new key, updates the hash, returns the new full key ONCE.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const roleError = requireRole(session.role, MANAGE_ROLES);
    if (roleError) return roleError;

    const { id } = await params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid ID parameter' }, { status: 400 });
    }

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

    // Audit log for key rotation
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: session.organizationId,
          actorId: session.userId,
          action: 'UPDATE',
          entityType: 'ApiKey',
          entityId: id,
          details: { action: 'rotate', name: existing.name },
          hash: `rotate-apikey-${id}-${Date.now()}`,
        },
      });
    } catch {
      // Non-fatal
    }

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
    const auth2 = await requireAuth(request);
    if (auth2 instanceof NextResponse) return auth2;
    const session = auth2;

    const roleError2 = requireRole(session.role, MANAGE_ROLES);
    if (roleError2) return roleError2;

    const { id } = await params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid ID parameter' }, { status: 400 });
    }

    // Verify the key belongs to the user's org
    const existing = await (prisma as any).apiKey.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    await (prisma as any).apiKey.delete({ where: { id } });

    // Audit log for key deletion
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: session.organizationId,
          actorId: session.userId,
          action: 'DELETE',
          entityType: 'ApiKey',
          entityId: id,
          details: { name: existing.name },
          hash: `delete-apikey-${id}-${Date.now()}`,
        },
      });
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    console.error(`[API] DELETE /api/keys/[id] error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
