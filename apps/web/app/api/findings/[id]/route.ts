import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@cveriskpilot/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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
