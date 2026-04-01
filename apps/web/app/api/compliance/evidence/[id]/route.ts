import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePerm, checkCsrf } from '@cveriskpilot/auth';

/**
 * GET /api/compliance/evidence/[id] — Get single evidence record with full detail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;
    const { id } = await params;

    const record = await prisma.complianceEvidenceRecord.findFirst({
      where: {
        id,
        organizationId: session.organizationId,
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('Evidence detail error:', error);
    return NextResponse.json(
      { error: 'Failed to load evidence record' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/compliance/evidence/[id] — Update an evidence record
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const permError = requirePerm(session.role, 'cases:update');
    if (permError) return permError;

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.complianceEvidenceRecord.findFirst({
      where: { id, organizationId: session.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    const body = await request.json();
    const allowedFields = [
      'title', 'description', 'body', 'status', 'freshnessDays',
      'expiresAt', 'tags', 'verifiedAt',
    ] as const;

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        if (field === 'expiresAt' || field === 'verifiedAt') {
          data[field] = body[field] ? new Date(body[field] as string) : null;
        } else {
          data[field] = body[field];
        }
      }
    }

    const updated = await prisma.complianceEvidenceRecord.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Evidence update error:', error);
    return NextResponse.json(
      { error: 'Failed to update evidence record' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/compliance/evidence/[id] — Remove an evidence record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError2 = checkCsrf(request);
    if (csrfError2) return csrfError2;

    const permError2 = requirePerm(session.role, 'cases:update');
    if (permError2) return permError2;

    const { id } = await params;

    const existing = await prisma.complianceEvidenceRecord.findFirst({
      where: { id, organizationId: session.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    await prisma.complianceEvidenceRecord.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Evidence delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete evidence record' },
      { status: 500 },
    );
  }
}
