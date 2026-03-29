import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';
import { isValidTransition } from '@/lib/workflow';

// ---------------------------------------------------------------------------
// PATCH /api/cases/bulk — Bulk update case statuses
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const body = await request.json();
    const { caseIds, status, reason } = body;

    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      return NextResponse.json(
        { error: 'caseIds must be a non-empty array' },
        { status: 400 },
      );
    }

    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 },
      );
    }

    // Cap the bulk operation at a sane limit
    if (caseIds.length > 500) {
      return NextResponse.json(
        { error: 'Cannot bulk-update more than 500 cases at once' },
        { status: 400 },
      );
    }

    // Fetch all target cases scoped to the user's organization
    const cases = await prisma.vulnerabilityCase.findMany({
      where: { id: { in: caseIds }, organizationId: session.organizationId },
      select: { id: true, status: true },
    });

    if (cases.length === 0) {
      return NextResponse.json(
        { error: 'No matching cases found' },
        { status: 404 },
      );
    }

    // Filter to only cases with valid transitions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validCases = cases.filter((c: any) => isValidTransition(c.status, status));
    const skippedIds = cases
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((c: any) => !isValidTransition(c.status, status))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => c.id);

    if (validCases.length === 0) {
      return NextResponse.json(
        {
          error: 'No cases have a valid transition to the requested status',
          skippedIds,
        },
        { status: 400 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validIds = validCases.map((c: any) => c.id);

    // Run update + lineage creation in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await prisma.$transaction(async (tx: any) => {
      // Bulk update statuses
      const result = await tx.vulnerabilityCase.updateMany({
        where: { id: { in: validIds } },
        data: { status: status as any },
      });

      // Create WorkflowLineage records for each case
      await tx.workflowLineage.createMany({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: validCases.map((c: any) => ({
          organizationId: session.organizationId,
          vulnerabilityCaseId: c.id,
          fromStatus: c.status,
          toStatus: status as any,
          reason: reason ?? null,
        })),
      });

      return result.count;
    });

    return NextResponse.json({
      updated,
      skippedIds,
      skippedCount: skippedIds.length,
    });
  } catch (error) {
    console.error('[API] PATCH /api/cases/bulk error:', error);
    return NextResponse.json(
      { error: 'Failed to bulk-update cases' },
      { status: 500 },
    );
  }
}
