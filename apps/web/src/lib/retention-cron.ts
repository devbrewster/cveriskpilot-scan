/**
 * Data Retention Cleanup — Exportable cron function
 *
 * Deletes/archives data older than the configured retention periods.
 * Designed to be called from a cron job or scheduled task.
 */

import { PrismaClient } from '@cveriskpilot/domain';

interface RetentionPolicy {
  findingsDays: number;
  artifactsDays: number;
  auditLogsDays: number;
  reportsDays: number;
}

interface RetentionResult {
  organizationId: string;
  deletedFindings: number;
  deletedArtifacts: number;
  archivedAuditLogs: number;
  executedAt: string;
  errors: string[];
}

const DEFAULT_POLICY: RetentionPolicy = {
  findingsDays: 365,
  artifactsDays: 180,
  auditLogsDays: 2555, // ~7 years
  reportsDays: 365,
};

/**
 * Run retention cleanup for a given organization.
 * In production, retention policies would be loaded from a settings table.
 */
export async function runRetentionCleanup(
  prisma: PrismaClient,
  organizationId: string,
  policy: RetentionPolicy = DEFAULT_POLICY,
): Promise<RetentionResult> {
  const now = new Date();
  const errors: string[] = [];
  let deletedFindings = 0;
  let deletedArtifacts = 0;
  let archivedAuditLogs = 0;

  // Calculate cutoff dates
  const findingsCutoff = new Date(now.getTime() - policy.findingsDays * 24 * 60 * 60 * 1000);
  const artifactsCutoff = new Date(now.getTime() - policy.artifactsDays * 24 * 60 * 60 * 1000);
  const auditLogsCutoff = new Date(now.getTime() - policy.auditLogsDays * 24 * 60 * 60 * 1000);

  // 1. Delete old findings
  try {
    const result = await prisma.finding.deleteMany({
      where: {
        organizationId,
        createdAt: { lt: findingsCutoff },
      },
    });
    deletedFindings = result.count;
  } catch (err) {
    errors.push(`Failed to delete findings: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Delete old scan artifacts
  //    Note: In production, also delete corresponding GCS objects
  try {
    const result = await prisma.scanArtifact.deleteMany({
      where: {
        organizationId,
        createdAt: { lt: artifactsCutoff },
      },
    });
    deletedArtifacts = result.count;
  } catch (err) {
    errors.push(`Failed to delete artifacts: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. Archive old audit logs
  //    For compliance, we don't delete audit logs — we could move them to cold storage.
  //    Here we count what would be archived (past retention window).
  try {
    const count = await prisma.auditLog.count({
      where: {
        organizationId,
        createdAt: { lt: auditLogsCutoff },
      },
    });
    archivedAuditLogs = count;

    // In production: export to GCS cold storage, then delete from DB
    // For now, we just log the count
  } catch (err) {
    errors.push(`Failed to process audit logs: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 4. Log the cleanup action to audit trail
  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        entityType: 'RetentionPolicy',
        entityId: organizationId,
        action: 'DELETE',
        actorId: 'system-retention-cron',
        details: {
          type: 'RETENTION_CLEANUP',
          deletedFindings,
          deletedArtifacts,
          archivedAuditLogs,
          policy,
          cutoffDates: {
            findings: findingsCutoff.toISOString(),
            artifacts: artifactsCutoff.toISOString(),
            auditLogs: auditLogsCutoff.toISOString(),
          },
          executedAt: now.toISOString(),
          errors,
        } as any,
        hash: `retention-${organizationId}-${now.getTime()}`,
      },
    });
  } catch (err) {
    errors.push(`Failed to create audit log: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    organizationId,
    deletedFindings,
    deletedArtifacts,
    archivedAuditLogs,
    executedAt: now.toISOString(),
    errors,
  };
}
