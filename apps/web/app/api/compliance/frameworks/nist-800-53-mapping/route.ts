import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@cveriskpilot/auth';
import { getControlCoverageByFamily } from '@cveriskpilot/compliance';

// ---------------------------------------------------------------------------
// GET /api/compliance/frameworks/nist-800-53-mapping
//
// Returns NIST 800-53 control coverage/gap data based on CWE identifiers
// extracted from the organization's findings.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.organizationId;

    // CWE identifiers live on VulnerabilityCase (aggregated from findings).
    // Collect all unique CWE IDs across the organization's cases.
    const cases = await prisma.vulnerabilityCase.findMany({
      where: {
        organizationId,
        cweIds: { isEmpty: false },
      },
      select: { cweIds: true },
    });

    const cweIdSet = new Set<string>();
    for (const c of cases) {
      for (const id of c.cweIds) {
        if (id) cweIdSet.add(id);
      }
    }
    const cweIds = Array.from(cweIdSet);

    const families = getControlCoverageByFamily(cweIds);

    return NextResponse.json({
      organizationId,
      cweCount: cweIds.length,
      families,
    });
  } catch (error) {
    console.error('NIST 800-53 mapping error:', error);
    return NextResponse.json(
      { error: 'Failed to compute NIST 800-53 control mapping' },
      { status: 500 },
    );
  }
}
