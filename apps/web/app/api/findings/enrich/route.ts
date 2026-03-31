import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePerm, checkCsrf } from '@cveriskpilot/auth';
import { logAudit } from '@/lib/audit';
import { resolveClientScope } from '@/lib/client-scope';
import { getOrgTier, checkBillingGate, trackAiCall } from '@/lib/billing';
import { enrichFindings } from '@cveriskpilot/enrichment';
import type { CanonicalFinding } from '@cveriskpilot/parsers';

// ---------------------------------------------------------------------------
// POST /api/findings/enrich — Bulk-enrich findings with NVD, EPSS, KEV data
// ---------------------------------------------------------------------------

const MAX_BATCH_SIZE = 500;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const permError = requirePerm(session.role, 'ai:advisory');
    if (permError) return permError;

    // Billing gate — enrichment counts as AI usage
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

    // Parse request body
    let body: { findingIds?: string[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { findingIds } = body ?? {};

    // Validate findingIds if provided
    if (findingIds !== undefined) {
      if (!Array.isArray(findingIds)) {
        return NextResponse.json(
          { error: 'findingIds must be an array of strings' },
          { status: 400 },
        );
      }
      if (findingIds.length > MAX_BATCH_SIZE) {
        return NextResponse.json(
          { error: `Maximum batch size is ${MAX_BATCH_SIZE}` },
          { status: 400 },
        );
      }
      if (findingIds.some((id) => typeof id !== 'string' || id.trim().length === 0)) {
        return NextResponse.json(
          { error: 'All findingIds must be non-empty strings' },
          { status: 400 },
        );
      }
    }

    // Build query — scope to organization + client access
    const clientScope = await resolveClientScope(session);
    const where: Record<string, unknown> = {
      organizationId: session.organizationId,
      ...clientScope.where,
    };

    if (findingIds && findingIds.length > 0) {
      where.id = { in: findingIds };
    } else {
      // When no IDs provided, enrich findings whose case lacks enrichment data
      where.vulnerabilityCase = {
        OR: [
          { epssScore: null },
          { cvssScore: null },
        ],
      };
    }

    // Fetch findings with their case and asset data
    const findings = await prisma.finding.findMany({
      where,
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
      take: MAX_BATCH_SIZE,
    });

    if (findings.length === 0) {
      return NextResponse.json({
        enriched: 0,
        skipped: 0,
        errors: 0,
        message: 'No findings found to enrich',
      });
    }

    // Convert DB findings to CanonicalFinding format for the enrichment pipeline
    const canonicalFindings: CanonicalFinding[] = findings
      .filter((f) => f.vulnerabilityCase && f.vulnerabilityCase.cveIds.length > 0)
      .map((f) => ({
        title: f.vulnerabilityCase!.title,
        description: f.vulnerabilityCase!.description ?? '',
        cveIds: f.vulnerabilityCase!.cveIds,
        cweIds: f.vulnerabilityCase!.cweIds,
        severity: f.vulnerabilityCase!.severity as CanonicalFinding['severity'],
        cvssScore: f.vulnerabilityCase!.cvssScore ?? undefined,
        cvssVector: f.vulnerabilityCase!.cvssVector ?? undefined,
        cvssVersion: f.vulnerabilityCase!.cvssVersion ?? undefined,
        scannerType: f.scannerType,
        scannerName: f.scannerName,
        runId: f.runId ?? undefined,
        assetName: f.asset?.name ?? 'unknown',
        assetType: f.asset?.type ?? undefined,
        rawObservations: (f.observations as Record<string, unknown>) ?? {},
        discoveredAt: f.discoveredAt,
      }));

    const skipped = findings.length - canonicalFindings.length;

    if (canonicalFindings.length === 0) {
      return NextResponse.json({
        enriched: 0,
        skipped,
        errors: 0,
        message: 'No findings with CVE IDs to enrich',
      });
    }

    // Run the enrichment pipeline
    let enrichedResults;
    try {
      enrichedResults = await enrichFindings(canonicalFindings);
    } catch (err) {
      console.error('[API] Enrichment pipeline error:', err);
      return NextResponse.json(
        { error: 'Enrichment pipeline failed. External APIs may be unavailable.' },
        { status: 502 },
      );
    }

    // Map enriched results back to DB updates
    // Build a lookup from cveIds -> enriched data for the vulnerability cases
    const caseUpdates = new Map<
      string,
      {
        cvssScore?: number;
        cvssVector?: string;
        epssScore?: number;
        epssPercentile?: number;
        kevListed?: boolean;
        kevDueDate?: Date;
      }
    >();

    let errorCount = 0;

    for (let i = 0; i < enrichedResults.length; i++) {
      const enriched = enrichedResults[i];
      const original = findings.find(
        (f) =>
          f.vulnerabilityCase &&
          f.vulnerabilityCase.cveIds.length > 0 &&
          f.vulnerabilityCase.cveIds[0] === enriched.cveIds[0],
      );

      if (!original?.vulnerabilityCase) continue;

      const caseId = original.vulnerabilityCase.id;
      if (caseUpdates.has(caseId)) continue; // Already queued

      const update: Record<string, unknown> = {};

      // NVD data
      if (enriched.nvdData) {
        const cvss = enriched.nvdData.cvssV3 ?? enriched.nvdData.cvssV2;
        if (cvss) {
          update.cvssScore = cvss.score;
          update.cvssVector = cvss.vector;
        }
      }

      // EPSS data
      if (enriched.epssData) {
        update.epssScore = enriched.epssData.score;
        update.epssPercentile = enriched.epssData.percentile;
      }

      // KEV data
      if (enriched.kevData) {
        update.kevListed = true;
        if (enriched.kevData.dueDate) {
          update.kevDueDate = new Date(enriched.kevData.dueDate);
        }
      }

      if (Object.keys(update).length > 0) {
        caseUpdates.set(caseId, update as any);
      }
    }

    // Apply DB updates in a transaction
    const updatePromises = [...caseUpdates.entries()].map(([caseId, data]) =>
      prisma.vulnerabilityCase
        .update({
          where: { id: caseId },
          data,
        })
        .catch((err) => {
          console.error(`[API] Failed to update case ${caseId}:`, err);
          errorCount++;
        }),
    );

    await Promise.all(updatePromises);

    const enrichedCount = caseUpdates.size - errorCount;

    // Track AI usage for billing
    if (enrichedCount > 0) {
      const clientId = (session as unknown as Record<string, string>).clientId ?? orgId;
      await trackAiCall(orgId, clientId).catch(() => {});
    }

    // Audit log
    await logAudit({
      action: 'UPDATE',
      actorId: session.userId,
      organizationId: session.organizationId,
      entityType: 'finding',
      entityId: 'bulk-enrich',
      details: {
        findingsProcessed: findings.length,
        casesEnriched: enrichedCount,
        skipped,
        errors: errorCount,
      },
    }).catch(() => {});

    return NextResponse.json({
      enriched: enrichedCount,
      skipped,
      errors: errorCount,
      totalProcessed: findings.length,
      message: `Enriched ${enrichedCount} vulnerability case(s)`,
    });
  } catch (error) {
    console.error('[API] POST /api/findings/enrich error:', error);
    return NextResponse.json(
      { error: 'Failed to enrich findings' },
      { status: 500 },
    );
  }
}
