import type { PrismaClient } from '@prisma/client';
import type { ComplianceEvidence, ComplianceFramework } from '@cveriskpilot/compliance';
import { createHash } from 'node:crypto';

/**
 * Sync auto-assessed compliance evidence into the ComplianceEvidenceRecord table.
 *
 * For each control in the assessment:
 *   - If a record already exists for (org, framework, control, source=AUTO_ASSESSMENT):
 *     update status, evidence text, verifiedAt, and contentHash
 *   - If no record exists: create one
 *
 * This makes evidence a first-class persisted entity with provenance,
 * rather than a computed-inline-and-discarded value.
 */
export async function syncAssessmentEvidence(
  prisma: PrismaClient,
  organizationId: string,
  framework: ComplianceFramework,
  evidences: ComplianceEvidence[],
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  // Fetch all existing auto-assessment evidence for this org + framework in one query
  const existing = await (prisma as any).complianceEvidenceRecord.findMany({
    where: {
      organizationId,
      frameworkId: framework.id,
      source: 'AUTO_ASSESSMENT',
    },
    select: {
      id: true,
      controlId: true,
      contentHash: true,
    },
  });

  const existingMap = new Map<string, { id: string; contentHash: string | null }>();
  for (const row of existing) {
    existingMap.set(row.controlId, { id: row.id, contentHash: row.contentHash });
  }

  // Build a map of control metadata from the framework definition
  const controlMeta = new Map<string, { title: string; category: string }>();
  for (const ctrl of framework.controls) {
    controlMeta.set(ctrl.id, { title: ctrl.title, category: ctrl.category });
  }

  const now = new Date();

  // Process each evidence result — batch into creates and updates
  const creates: Parameters<typeof prisma.complianceEvidenceRecord.create>[0]['data'][] = [];
  const updates: { id: string; data: Record<string, unknown> }[] = [];

  for (const ev of evidences) {
    const meta = controlMeta.get(ev.controlId);
    const hash = createHash('sha256')
      .update(`${ev.controlId}:${ev.status}:${ev.evidence}`)
      .digest('hex');

    const existingRecord = existingMap.get(ev.controlId);

    if (existingRecord) {
      // Only update if content actually changed
      if (existingRecord.contentHash !== hash) {
        updates.push({
          id: existingRecord.id,
          data: {
            status: mapStatus(ev.status),
            title: `Auto-assessment: ${meta?.title ?? ev.controlId}`,
            description: ev.evidence,
            body: ev.evidence,
            contentHash: hash,
            verifiedAt: now,
          },
        });
        updated++;
      }
    } else {
      creates.push({
        organizationId,
        frameworkId: framework.id,
        controlId: ev.controlId,
        controlTitle: meta?.title ?? ev.controlId,
        title: `Auto-assessment: ${meta?.title ?? ev.controlId}`,
        description: ev.evidence,
        body: ev.evidence,
        status: mapStatus(ev.status),
        source: 'AUTO_ASSESSMENT' as const,
        collectorName: 'CVERiskPilot Auto-Assessment',
        sourceSystem: 'cveriskpilot',
        freshnessDays: 30,
        verifiedAt: now,
        contentHash: hash,
        tags: ['auto-assessed', framework.id, meta?.category ?? ''].filter(Boolean),
      } as any);
      created++;
    }
  }

  // Execute creates in batch
  if (creates.length > 0) {
    await (prisma as any).complianceEvidenceRecord.createMany({
      data: creates,
      skipDuplicates: true,
    });
  }

  // Execute updates (Prisma doesn't support bulk updateMany with different data per row)
  if (updates.length > 0) {
    await Promise.all(
      updates.map((u) =>
        (prisma as any).complianceEvidenceRecord.update({
          where: { id: u.id },
          data: u.data,
        }),
      ),
    );
  }

  return { created, updated };
}

/**
 * Map the ComplianceEvidence status ('met' | 'partial' | 'not_met' | 'na')
 * to the EvidenceStatus enum ('CURRENT' | 'STALE' | 'MISSING' | 'EXPIRED').
 *
 * - met → CURRENT (evidence exists and is valid)
 * - partial → CURRENT (evidence exists but incomplete — still current)
 * - not_met → MISSING (no adequate evidence)
 * - na → CURRENT (not applicable is a valid evidence state)
 */
function mapStatus(complianceStatus: string): string {
  switch (complianceStatus) {
    case 'met':
      return 'CURRENT';
    case 'partial':
      return 'CURRENT';
    case 'not_met':
      return 'MISSING';
    case 'na':
      return 'CURRENT';
    default:
      return 'MISSING';
  }
}
