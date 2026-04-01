import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';
import { mapCweToAllFrameworks } from '@cveriskpilot/compliance';

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

    const finding = await prisma.finding.findFirst({
      where: { id, organizationId: session.organizationId },
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

    // Compute compliance impact from CWE IDs on the linked vulnerability case
    const cweIds = finding.vulnerabilityCase?.cweIds ?? [];
    let complianceImpact = null;

    if (cweIds.length > 0) {
      const controlMap = new Map<string, { framework: string; controlId: string; controlTitle: string; cweIds: string[] }>();

      for (const cwe of cweIds) {
        const mappings = mapCweToAllFrameworks(cwe);
        for (const mapping of mappings) {
          for (const ctrl of mapping.mappedControls) {
            const key = `${ctrl.frameworkId}:${ctrl.controlId}`;
            const existing = controlMap.get(key);
            if (existing) {
              if (!existing.cweIds.includes(cwe)) existing.cweIds.push(cwe);
            } else {
              controlMap.set(key, {
                framework: ctrl.frameworkName,
                controlId: ctrl.controlId,
                controlTitle: ctrl.controlTitle,
                cweIds: [cwe],
              });
            }
          }
        }
      }

      const controls = Array.from(controlMap.values());

      // Build per-framework summary
      const frameworkCounts = new Map<string, { name: string; count: number; controlIds: string[] }>();
      for (const ctrl of controls) {
        const existing = frameworkCounts.get(ctrl.framework);
        if (existing) {
          existing.count++;
          existing.controlIds.push(ctrl.controlId);
        } else {
          frameworkCounts.set(ctrl.framework, { name: ctrl.framework, count: 1, controlIds: [ctrl.controlId] });
        }
      }

      complianceImpact = {
        totalAffectedControls: controls.length,
        frameworks: Array.from(frameworkCounts.values()),
        controls,
      };
    }

    return NextResponse.json({ ...finding, complianceImpact });
  } catch (error) {
    console.error('[API] GET /api/findings/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to load finding' },
      { status: 500 },
    );
  }
}
