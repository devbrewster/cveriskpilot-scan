import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, WRITE_ROLES, checkCsrf } from '@cveriskpilot/auth';
import { logAudit } from '@/lib/audit';

// ---------------------------------------------------------------------------
// POST /api/cases/[id]/feedback — Submit triage feedback (human review)
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const roleCheck = requireRole(session.role, WRITE_ROLES);
    if (roleCheck) return roleCheck;

    const { id } = await params;

    // Validate case exists and belongs to org
    const vuln = await prisma.vulnerabilityCase.findFirst({
      where: { id, organizationId: session.organizationId },
      select: {
        id: true,
        severity: true,
        triageVerdict: true,
        triageConfidence: true,
      },
    });

    if (!vuln) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const body = await request.json();
    const { outcome, correctedVerdict, correctedSeverity, reason } = body as {
      outcome: string;
      correctedVerdict?: string;
      correctedSeverity?: string;
      reason?: string;
    };

    // Validate outcome
    const validOutcomes = ['APPROVED', 'REJECTED', 'MODIFIED'];
    if (!outcome || !validOutcomes.includes(outcome)) {
      return NextResponse.json(
        { error: 'outcome must be APPROVED, REJECTED, or MODIFIED' },
        { status: 400 },
      );
    }

    if (outcome === 'MODIFIED' && !correctedVerdict && !correctedSeverity) {
      return NextResponse.json(
        { error: 'MODIFIED outcome requires correctedVerdict or correctedSeverity' },
        { status: 400 },
      );
    }

    // Create feedback record
    const feedback = await prisma.triageFeedback.create({
      data: {
        organizationId: session.organizationId,
        vulnerabilityCaseId: id,
        reviewerId: session.userId,
        originalVerdict: vuln.triageVerdict ?? 'UNKNOWN',
        originalSeverity: vuln.severity,
        originalConfidence: vuln.triageConfidence ?? 0,
        correctedVerdict: correctedVerdict ?? null,
        correctedSeverity: correctedSeverity as
          | 'CRITICAL'
          | 'HIGH'
          | 'MEDIUM'
          | 'LOW'
          | 'INFO'
          | undefined ?? null,
        outcome,
        reason: reason ?? null,
      },
    });

    // If modified, update the case with the corrected values
    if (outcome === 'MODIFIED') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {};
      if (correctedSeverity) updateData.severityOverride = correctedSeverity;
      if (correctedVerdict) updateData.triageVerdict = correctedVerdict;
      if (Object.keys(updateData).length > 0) {
        await prisma.vulnerabilityCase.update({
          where: { id },
          data: updateData,
        });
      }
    }

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: 'UPDATE',
      entityType: 'case',
      entityId: id,
      details: { event: 'triage.feedback', outcome, correctedVerdict, correctedSeverity },
    });

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error('[Triage Feedback] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit triage feedback' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/cases/[id]/feedback — List feedback for a case
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { id } = await params;

    const feedbacks = await prisma.triageFeedback.findMany({
      where: {
        vulnerabilityCaseId: id,
        organizationId: session.organizationId,
      },
      include: {
        reviewer: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ feedbacks });
  } catch (error) {
    console.error('[Triage Feedback] Error:', error);
    return NextResponse.json(
      { error: 'Failed to list triage feedback' },
      { status: 500 },
    );
  }
}
