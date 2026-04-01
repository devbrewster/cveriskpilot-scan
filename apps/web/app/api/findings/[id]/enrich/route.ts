import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePerm, checkCsrf } from '@cveriskpilot/auth';
import { logAudit } from '@/lib/audit';
import { getOrgTier, checkBillingGate, trackAiCall } from '@/lib/billing';
import { enrichFindings } from '@cveriskpilot/enrichment';
import { trackFunnelEvent } from '@cveriskpilot/observability';
import type { CanonicalFinding } from '@cveriskpilot/parsers';

// ---------------------------------------------------------------------------
// POST /api/findings/[id]/enrich — Enrich a single finding
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

    const permError = requirePerm(session.role, 'ai:advisory');
    if (permError) return permError;

    // Billing gate
    const orgId = session.organizationId;
    const tier = await getOrgTier(orgId);
    const gate = await checkBillingGate(orgId, tier, 'ai_remediation');
    if (!gate.allowed) {
      return NextResponse.json(
        {
          error: gate.reason ?? 'AI call limit reached',
          code: 'BILLING_LIMIT_EXCEEDED',
          upgradeRequired: gate.upgradeRequired,
          upgradeUrl: '/settings/billing',
        },
        { status: 402 },
      );
    }

    const { id } = await params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid ID parameter' }, { status: 400 });
    }

    // Fetch the finding scoped to the user's organization
    const finding = await prisma.finding.findFirst({
      where: { id, organizationId: session.organizationId },
      include: {
        asset: {
          select: { id: true, name: true, type: true, criticality: true },
        },
        vulnerabilityCase: {
          select: {
            id: true,
            title: true,
            description: true,
            cveIds: true,
            cweIds: true,
            severity: true,
            cvssScore: true,
            cvssVector: true,
            cvssVersion: true,
          },
        },
      },
    });

    if (!finding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    if (!finding.vulnerabilityCase) {
      return NextResponse.json(
        { error: 'Finding has no associated vulnerability case' },
        { status: 422 },
      );
    }

    if (finding.vulnerabilityCase.cveIds.length === 0) {
      return NextResponse.json(
        { error: 'Finding has no CVE IDs to enrich' },
        { status: 422 },
      );
    }

    // Convert to CanonicalFinding format
    const canonicalFinding: CanonicalFinding = {
      title: finding.vulnerabilityCase.title,
      description: finding.vulnerabilityCase.description ?? '',
      cveIds: finding.vulnerabilityCase.cveIds,
      cweIds: finding.vulnerabilityCase.cweIds,
      severity: finding.vulnerabilityCase.severity as CanonicalFinding['severity'],
      cvssScore: finding.vulnerabilityCase.cvssScore ?? undefined,
      cvssVector: finding.vulnerabilityCase.cvssVector ?? undefined,
      cvssVersion: finding.vulnerabilityCase.cvssVersion ?? undefined,
      scannerType: finding.scannerType,
      scannerName: finding.scannerName,
      runId: finding.runId ?? undefined,
      assetName: finding.asset?.name ?? 'unknown',
      assetType: finding.asset?.type ?? undefined,
      rawObservations: (finding.observations as Record<string, unknown>) ?? {},
      discoveredAt: finding.discoveredAt,
    };

    // Run enrichment pipeline
    let enrichedResults;
    try {
      enrichedResults = await enrichFindings([canonicalFinding]);
    } catch (err) {
      console.error('[API] Enrichment pipeline error:', err);
      return NextResponse.json(
        { error: 'Enrichment pipeline failed. External APIs may be unavailable.' },
        { status: 502 },
      );
    }

    const enriched = enrichedResults[0];
    if (!enriched) {
      return NextResponse.json(
        { error: 'Enrichment returned no results' },
        { status: 500 },
      );
    }

    // Build the update payload for the vulnerability case
    const caseUpdate: Record<string, unknown> = {};

    if (enriched.nvdData) {
      const cvss = enriched.nvdData.cvssV3 ?? enriched.nvdData.cvssV2;
      if (cvss) {
        caseUpdate.cvssScore = cvss.score;
        caseUpdate.cvssVector = cvss.vector;
      }
    }

    if (enriched.epssData) {
      caseUpdate.epssScore = enriched.epssData.score;
      caseUpdate.epssPercentile = enriched.epssData.percentile;
    }

    if (enriched.kevData) {
      caseUpdate.kevListed = true;
      if (enriched.kevData.dueDate) {
        caseUpdate.kevDueDate = new Date(enriched.kevData.dueDate);
      }
    }

    // Apply the update
    if (Object.keys(caseUpdate).length > 0) {
      await prisma.vulnerabilityCase.update({
        where: { id: finding.vulnerabilityCase.id },
        data: caseUpdate,
      });
    }

    // Track AI usage for billing
    const clientId = (session as unknown as Record<string, string>).clientId ?? orgId;
    await trackAiCall(orgId, clientId).catch(() => {});

    // Fire-and-forget funnel event (first_triage)
    trackFunnelEvent({
      step: 'first_triage',
      orgId,
      userId: session.userId,
      metadata: {
        findingId: id,
        caseId: finding.vulnerabilityCase.id,
        riskLevel: enriched.riskScore?.riskLevel ?? 'unknown',
      },
    });

    // Audit log
    await logAudit({
      action: 'UPDATE',
      actorId: session.userId,
      organizationId: session.organizationId,
      entityType: 'finding',
      entityId: id,
      details: {
        caseId: finding.vulnerabilityCase.id,
        cveIds: finding.vulnerabilityCase.cveIds,
        hasNvd: !!enriched.nvdData,
        hasEpss: !!enriched.epssData,
        hasKev: !!enriched.kevData,
        riskScore: enriched.riskScore?.score,
        riskLevel: enriched.riskScore?.riskLevel,
      },
    }).catch(() => {});

    return NextResponse.json({
      findingId: id,
      caseId: finding.vulnerabilityCase.id,
      enrichment: {
        nvd: enriched.nvdData
          ? {
              cvssScore: (enriched.nvdData.cvssV3 ?? enriched.nvdData.cvssV2)?.score,
              cvssVector: (enriched.nvdData.cvssV3 ?? enriched.nvdData.cvssV2)?.vector,
              description: enriched.nvdData.description,
              cweIds: enriched.nvdData.cweIds,
            }
          : null,
        epss: enriched.epssData
          ? {
              score: enriched.epssData.score,
              percentile: enriched.epssData.percentile,
            }
          : null,
        kev: enriched.kevData
          ? {
              listed: true,
              dueDate: enriched.kevData.dueDate,
              requiredAction: enriched.kevData.requiredAction,
              ransomwareUse: enriched.kevData.knownRansomwareCampaignUse,
            }
          : null,
        riskScore: enriched.riskScore,
      },
      updated: Object.keys(caseUpdate).length > 0,
    });
  } catch (error) {
    console.error('[API] POST /api/findings/[id]/enrich error:', error);
    return NextResponse.json(
      { error: 'Failed to enrich finding' },
      { status: 500 },
    );
  }
}
