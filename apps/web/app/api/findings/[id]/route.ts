import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { id } = await params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid ID parameter' }, { status: 400 });
    }

    const finding = await prisma.finding.findUnique({
      where: { id },
      include: {
        asset: true,
        vulnerabilityCase: {
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        artifact: {
          select: {
            id: true,
            filename: true,
            parserFormat: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
          },
        },
      },
    });

    if (!finding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    // Verify the finding belongs to the user's organization
    if (finding.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    return NextResponse.json(finding);
  } catch (error) {
    console.error('[API] GET /api/findings/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to load finding' },
      { status: 500 },
    );
  }
}
