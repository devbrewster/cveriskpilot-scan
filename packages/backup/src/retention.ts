// @cveriskpilot/backup — retention policy manager

import type { BackupJob, RetentionPolicy, StorageClass } from './types';
import type { BackupStore } from './backup';
import { InMemoryBackupStore, BackupService } from './backup';

// ---------------------------------------------------------------------------
// RetentionManager
// ---------------------------------------------------------------------------

/** Result of a retention enforcement run for a single tenant. */
export interface RetentionRunResult {
  tenantId: string;
  /** Jobs transitioned to a colder storage class */
  transitioned: Array<{ jobId: string; from: StorageClass; to: StorageClass }>;
  /** Jobs marked as expired and queued for deletion */
  expired: string[];
  /** Jobs that encountered errors during processing */
  errors: Array<{ jobId: string; error: string }>;
}

/**
 * Enforces retention policies for tenant backups.
 *
 * GCS lifecycle tiers:
 * - 0–30 days:  STANDARD (hot)
 * - 30–90 days: NEARLINE
 * - 90–365 days: COLDLINE
 * - >365 days:  deleted (or ARCHIVE if configured)
 */
export class RetentionManager {
  private store: BackupStore;
  private backupService: BackupService;

  constructor(store?: BackupStore, backupService?: BackupService) {
    this.store = store ?? new InMemoryBackupStore();
    this.backupService = backupService ?? new BackupService(this.store);
  }

  /**
   * Enforce retention policies for a specific tenant.
   * Should be called on a schedule (e.g., daily via Cloud Scheduler).
   */
  async enforceRetention(tenantId: string): Promise<RetentionRunResult> {
    const config = await this.backupService.getConfig(tenantId);
    if (!config) {
      return { tenantId, transitioned: [], expired: [], errors: [] };
    }

    const jobs = await this.backupService.listJobs(tenantId);
    const result: RetentionRunResult = {
      tenantId,
      transitioned: [],
      expired: [],
      errors: [],
    };

    const now = Date.now();

    for (const job of jobs) {
      if (job.status !== 'completed') continue;

      try {
        const ageMs = now - new Date(job.createdAt).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);

        // Check if backup has exceeded maximum retention
        if (ageDays > config.retention.maxRetentionDays) {
          await this.backupService.updateJobStatus(job.id, 'expired');
          result.expired.push(job.id);
          continue;
        }

        // Determine target storage class based on age
        const targetClass = this.determineStorageClass(ageDays, config.retention);

        if (targetClass !== job.storageClass) {
          await this.transitionStorageClass(job, targetClass);
          result.transitioned.push({
            jobId: job.id,
            from: job.storageClass,
            to: targetClass,
          });
        }
      } catch (err) {
        result.errors.push({
          jobId: job.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return result;
  }

  /**
   * Delete all expired backups for a tenant.
   * In production, this removes the GCS objects.
   */
  async deleteExpiredBackups(tenantId: string): Promise<string[]> {
    const jobs = await this.backupService.listJobs(tenantId);
    const deleted: string[] = [];

    for (const job of jobs) {
      if (job.status === 'expired') {
        await this.backupService.updateJobStatus(job.id, 'deleting');
        // In production: delete from GCS via Storage API
        // await gcs.bucket(bucket).file(job.gcsUri).delete();
        deleted.push(job.id);
      }
    }

    return deleted;
  }

  /**
   * Get a summary of storage usage by class for a tenant.
   */
  async getStorageSummary(
    tenantId: string,
  ): Promise<Record<StorageClass, { count: number; totalBytes: number }>> {
    const jobs = await this.backupService.listJobs(tenantId);

    const summary: Record<StorageClass, { count: number; totalBytes: number }> = {
      STANDARD: { count: 0, totalBytes: 0 },
      NEARLINE: { count: 0, totalBytes: 0 },
      COLDLINE: { count: 0, totalBytes: 0 },
      ARCHIVE: { count: 0, totalBytes: 0 },
    };

    for (const job of jobs) {
      if (job.status !== 'completed' || !job.sizeBytes) continue;
      summary[job.storageClass].count++;
      summary[job.storageClass].totalBytes += job.sizeBytes;
    }

    return summary;
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private determineStorageClass(ageDays: number, retention: RetentionPolicy): StorageClass {
    if (ageDays <= retention.hotRetentionDays) return 'STANDARD';
    if (ageDays <= retention.nearlineRetentionDays) return 'NEARLINE';
    if (ageDays <= retention.coldlineRetentionDays) return 'COLDLINE';
    return 'COLDLINE'; // Stay in coldline until max retention triggers deletion
  }

  /**
   * Transition a backup to a different storage class.
   * In production, this calls the GCS rewrite API to change storage class.
   */
  private async transitionStorageClass(
    job: BackupJob,
    targetClass: StorageClass,
  ): Promise<void> {
    // In production:
    // await gcs.bucket(bucket).file(job.gcsUri).setStorageClass(targetClass);

    // Update the job record
    const updated: BackupJob = { ...job, storageClass: targetClass };
    const JOB_PREFIX = 'backup:job:';
    await this.store.set(`${JOB_PREFIX}${job.id}`, JSON.stringify(updated));
  }
}
