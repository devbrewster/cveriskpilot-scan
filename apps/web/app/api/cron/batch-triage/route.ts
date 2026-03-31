// ---------------------------------------------------------------------------
// POST /api/cron/batch-triage — Batch-triage untriaged CRITICAL/HIGH cases
//
// Called by: Cloud Scheduler (CRON_SECRET) OR post-upload hook.
// Finds untriaged CRITICAL/HIGH cases, checks billing gates per org,
// then runs the TriageAgent directly (no HTTP round-trip).
// ---------------------------------------------------------------------------

import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for batch processing

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // --- Auth: CRON_SECRET bearer token OR authenticated platform admin ---
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  let authenticated = false;

  if (cronSecret && authHeader) {
    const expected = `Bearer ${cronSecret}`;
    authenticated = constantTimeEqual(authHeader, expected);
  }

  if (!authenticated) {
    // Fall back to regular auth for manual triggers from platform admins
    try {
      const { requireAuth, requirePerm } = await import('@cveriskpilot/auth');
      const auth = await requireAuth(request);
      if (auth instanceof NextResponse) return auth;
      const permError = requirePerm(auth.role, 'platform:admin');
      if (permError) return permError;
      authenticated = true;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { organizationId?: string; limit?: number } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine for scheduled cron
  }

  const limit = Math.min(body.limit ?? 20, 50); // Cap at 50 per batch

  try {
    // Find untriaged CRITICAL/HIGH cases, newest first
    const where: Record<string, unknown> = {
      triageVerdict: null,
      severity: { in: ['CRITICAL', 'HIGH'] },
      status: { in: ['NEW', 'TRIAGE'] },
    };
    if (body.organizationId) {
      where.organizationId = body.organizationId;
    }

    const cases = await prisma.vulnerabilityCase.findMany({
      where,
      select: { id: true, organizationId: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    if (cases.length === 0) {
      return NextResponse.json({ triaged: 0, skipped: 0, total: 0, message: 'No untriaged cases found' });
    }

    // Group by org to respect per-org billing gates
    const byOrg = new Map<string, string[]>();
    for (const c of cases) {
      const arr = byOrg.get(c.organizationId) ?? [];
      arr.push(c.id);
      byOrg.set(c.organizationId, arr);
    }

    let triaged = 0;
    let skipped = 0;
    const errors: string[] = [];

    const { getOrgTier, checkBillingGate } = await import('@/lib/billing');
    const {
      TriageAgent,
      checkAiRateLimit,
      incrementAiUsage,
    } = await import('@cveriskpilot/ai');

    for (const [orgId, caseIds] of byOrg) {
      // Check billing gate — only auto-triage for paid tiers
      const tier = await getOrgTier(orgId);
      if (tier === 'FREE') {
        skipped += caseIds.length;
        continue;
      }

      const gate = await checkBillingGate(orgId, tier, 'ai_remediation');
      if (!gate.allowed) {
        skipped += caseIds.length;
        continue;
      }

      // Triage each case in this org
      for (const caseId of caseIds) {
        try {
          // Check per-org AI rate limit before each call
          const rateLimit = await checkAiRateLimit(orgId, tier);
          if (!rateLimit.allowed) {
            skipped += caseIds.length - caseIds.indexOf(caseId);
            break; // Stop processing this org — limit hit
          }

          const vuln = await prisma.vulnerabilityCase.findFirst({
            where: { id: caseId, organizationId: orgId },
            include: {
              findings: {
                select: {
                  scannerType: true,
                  scannerName: true,
                  asset: {
                    select: {
                      name: true,
                      type: true,
                      environment: true,
                      criticality: true,
                      internetExposed: true,
                    },
                  },
                },
                take: 10,
              },
            },
          });

          if (!vuln) {
            skipped++;
            continue;
          }

          // Deduplicate assets from findings
          const assetMap = new Map<
            string,
            { name: string; type: string; environment: string; criticality: string; internetExposed: boolean }
          >();
          for (const f of vuln.findings) {
            if (f.asset && !assetMap.has(f.asset.name)) {
              assetMap.set(f.asset.name, f.asset);
            }
          }

          const agent = new TriageAgent();
          const decision = await agent.triageCase({
            caseId: vuln.id,
            title: vuln.title,
            description: vuln.description ?? undefined,
            cveIds: vuln.cveIds,
            cweIds: vuln.cweIds,
            severity: vuln.severity,
            cvssScore: vuln.cvssScore ? Number(vuln.cvssScore) : null,
            cvssVector: vuln.cvssVector ?? null,
            epssScore: vuln.epssScore ? Number(vuln.epssScore) : null,
            epssPercentile: vuln.epssPercentile ? Number(vuln.epssPercentile) : null,
            kevListed: vuln.kevListed,
            kevDueDate: vuln.kevDueDate?.toISOString() ?? null,
            assets: [...assetMap.values()].map((a) => ({
              name: a.name,
              type: a.type,
              environment: a.environment,
              criticality: a.criticality,
              internetExposed: a.internetExposed,
            })),
            existingFindings: vuln.findingCount,
          });

          // Persist triage results
          await prisma.vulnerabilityCase.updateMany({
            where: { id: vuln.id, organizationId: orgId },
            data: {
              triageVerdict: decision.recommendedAction,
              triageConfidence: decision.confidenceScore,
              triageModel: decision.model,
              triageAt: decision.triagedAt,
              severityOverride: decision.severityOverride ?? undefined,
              status: 'TRIAGE',
            },
          });

          await incrementAiUsage(orgId);
          triaged++;
        } catch (err) {
          errors.push(`${caseId}: ${err instanceof Error ? err.message : 'unknown'}`);
        }
      }
    }

    console.log(
      `[cron/batch-triage] Completed: triaged=${triaged}, skipped=${skipped}, errors=${errors.length}`,
    );

    return NextResponse.json({
      triaged,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      total: cases.length,
    });
  } catch (err) {
    console.error('[cron/batch-triage] Error:', err);
    return NextResponse.json(
      { error: 'Batch triage failed' },
      { status: 500 },
    );
  }
}
