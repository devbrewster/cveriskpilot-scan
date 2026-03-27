import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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

    return NextResponse.json(finding);
  } catch (error) {
    console.error('[API] GET /api/findings/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to load finding' },
      { status: 500 },
    );
  }
}
