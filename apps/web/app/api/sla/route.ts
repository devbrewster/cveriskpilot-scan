import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// GET /api/sla — List SLA policies for an organization
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 },
      );
    }

    const policies = await prisma.slaPolicy.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { vulnerabilityCases: true } },
      },
    });

    return NextResponse.json({ policies });
  } catch (error) {
    console.error('[API] GET /api/sla error:', error);
    return NextResponse.json(
      { error: 'Failed to load SLA policies' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/sla — Create a new SLA policy
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      organizationId,
      name,
      description,
      criticalDays,
      highDays,
      mediumDays,
      lowDays,
      kevCriticalDays,
      isDefault,
    } = body as {
      organizationId?: string;
      name?: string;
      description?: string;
      criticalDays?: number;
      highDays?: number;
      mediumDays?: number;
      lowDays?: number;
      kevCriticalDays?: number;
      isDefault?: boolean;
    };

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 },
      );
    }

    // Default values: Critical 7d, High 30d, Medium 90d, Low 180d, KEV Critical 3d
    const policyData = {
      organizationId,
      name,
      description: description ?? null,
      criticalDays: criticalDays ?? 7,
      highDays: highDays ?? 30,
      mediumDays: mediumDays ?? 90,
      lowDays: lowDays ?? 180,
      kevCriticalDays: kevCriticalDays ?? 3,
      isDefault: isDefault ?? false,
    };

    // If setting as default, unset any existing default first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const policy = await prisma.$transaction(async (tx: any) => {
      if (policyData.isDefault) {
        await tx.slaPolicy.updateMany({
          where: { organizationId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.slaPolicy.create({
        data: policyData,
      });
    });

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/sla error:', error);
    return NextResponse.json(
      { error: 'Failed to create SLA policy' },
      { status: 500 },
    );
  }
}
