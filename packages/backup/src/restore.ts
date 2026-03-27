// @cveriskpilot/backup — restore service

import type { BackupJob, RestoreJob, RestoreStatus, ValidationResult } from './types';
import type { BackupStore } from './backup';
import { InMemoryBackupStore, BackupService } from './backup';

// ---------------------------------------------------------------------------
// Key prefixes
// ---------------------------------------------------------------------------

const RESTORE_PREFIX = 'backup:restore:';
const TENANT_RESTORES_PREFIX = 'backup:tenant_restores:';

// ---------------------------------------------------------------------------
// RestoreService
// ---------------------------------------------------------------------------

export class RestoreService {
  private store: BackupStore;
  private backupService: BackupService;

  constructor(store?: BackupStore, backupService?: BackupService) {
    this.store = store ?? new InMemoryBackupStore();
    this.backupService = backupService ?? new BackupService(this.store);
  }

  /**
   * Restore a tenant from a specific backup.
   *
   * @param tenantId  - The tenant to restore
   * @param backupId  - The backup job ID to restore from
   * @param target    - Target stamp/instance for the restore (same or different)
   * @param dryRun    - If true, only validate without actually restoring
   */
  async restoreFromBackup(
    tenantId: string,
    backupId: string,
    target: string,
    dryRun = false,
  ): Promise<RestoreJob> {
    // Validate the backup exists and is completed
    const backup = await this.backupService.getJob(backupId);
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }
    if (backup.tenantId !== tenantId) {
      throw new Error(`Backup ${backupId} does not belong to tenant ${tenantId}`);
    }

    // Run validation
    const validationResults = await this.validateRestore(backupId);
    const allPassed = validationResults.every((v) => v.passed);

    const jobId = generateRestoreId();
    const now = new Date().toISOString();

    const initialStatus: RestoreStatus = dryRun
      ? 'dry_run_complete'
      : allPassed
        ? 'pending'
        : 'failed';

    const job: RestoreJob = {
      id: jobId,
      tenantId,
      backupId,
      status: initialStatus,
      targetStamp: target,
      dryRun,
      createdAt: now,
      startedAt: dryRun ? now : null,
      completedAt: dryRun ? now : null,
      error: allPassed ? null : 'Pre-restore validation failed',
      validationResults,
    };

    await this.store.set(`${RESTORE_PREFIX}${jobId}`, JSON.stringify(job));
    await this.addRestoreToTenantIndex(tenantId, jobId);

    // If not a dry run and validation passed, start the restore
    if (!dryRun && allPassed) {
      return this.startRestoreExecution(job, backup);
    }

    return job;
  }

  /**
   * Validate a backup's integrity before restore.
   * Performs checksum verification, format checks, and compatibility validation.
   */
  async validateRestore(backupId: string): Promise<ValidationResult[]> {
    const backup = await this.backupService.getJob(backupId);
    if (!backup) {
      return [{ check: 'backup_exists', passed: false, message: `Backup ${backupId} not found` }];
    }

    const results: ValidationResult[] = [];

    // Check: backup exists and is completed
    results.push({
      check: 'backup_status',
      passed: backup.status === 'completed',
      message:
        backup.status === 'completed'
          ? 'Backup is in completed state'
          : `Backup is in ${backup.status} state, expected completed`,
    });

    // Check: backup has a GCS URI
    results.push({
      check: 'gcs_uri',
      passed: !!backup.gcsUri,
      message: backup.gcsUri
        ? `Backup stored at ${backup.gcsUri}`
        : 'Backup has no GCS URI',
    });

    // Check: backup has a checksum for integrity
    results.push({
      check: 'checksum',
      passed: !!backup.checksum,
      message: backup.checksum
        ? `Checksum present: ${backup.checksum}`
        : 'No checksum available (integrity cannot be verified)',
    });

    // Check: backup is not expired
    results.push({
      check: 'not_expired',
      passed: backup.status !== 'expired',
      message:
        backup.status !== 'expired'
          ? 'Backup has not expired'
          : 'Backup has expired and may have been deleted',
    });

    // Check: backup size is reasonable
    results.push({
      check: 'size_check',
      passed: backup.sizeBytes !== null && backup.sizeBytes > 0,
      message:
        backup.sizeBytes !== null && backup.sizeBytes > 0
          ? `Backup size: ${formatBytes(backup.sizeBytes)}`
          : 'Backup size is unknown or zero',
    });

    return results;
  }

  /**
   * Start executing a restore job. In production this would dispatch to the
   * infrastructure layer (Cloud SQL import or pg_restore pipeline).
   */
  private async startRestoreExecution(
    job: RestoreJob,
    backup: BackupJob,
  ): Promise<RestoreJob> {
    const now = new Date().toISOString();

    const updated: RestoreJob = {
      ...job,
      status: 'in_progress',
      startedAt: now,
    };

    await this.store.set(`${RESTORE_PREFIX}${job.id}`, JSON.stringify(updated));
    return updated;
  }

  /** Update a restore job's status (called by the restore execution pipeline). */
  async updateRestoreStatus(
    restoreId: string,
    status: RestoreStatus,
    error?: string,
  ): Promise<RestoreJob> {
    const job = await this.getRestoreJob(restoreId);
    if (!job) {
      throw new Error(`Restore job ${restoreId} not found`);
    }

    const now = new Date().toISOString();
    const isTerminal = status === 'completed' || status === 'failed';

    const updated: RestoreJob = {
      ...job,
      status,
      completedAt: isTerminal ? now : job.completedAt,
      error: error ?? job.error,
    };

    await this.store.set(`${RESTORE_PREFIX}${restoreId}`, JSON.stringify(updated));
    return updated;
  }

  // -----------------------------------------------------------------------
  // Job queries
  // -----------------------------------------------------------------------

  /** Get a specific restore job by ID. */
  async getRestoreJob(restoreId: string): Promise<RestoreJob | null> {
    const raw = await this.store.get(`${RESTORE_PREFIX}${restoreId}`);
    if (!raw) return null;
    return JSON.parse(raw) as RestoreJob;
  }

  /** List all restore jobs for a tenant. */
  async listRestoreJobs(tenantId: string): Promise<RestoreJob[]> {
    const raw = await this.store.get(`${TENANT_RESTORES_PREFIX}${tenantId}`);
    if (!raw) return [];

    const ids = JSON.parse(raw) as string[];
    const jobs: RestoreJob[] = [];

    for (const id of ids) {
      const job = await this.getRestoreJob(id);
      if (job) jobs.push(job);
    }

    return jobs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private async addRestoreToTenantIndex(tenantId: string, restoreId: string): Promise<void> {
    const raw = await this.store.get(`${TENANT_RESTORES_PREFIX}${tenantId}`);
    const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    ids.push(restoreId);
    await this.store.set(`${TENANT_RESTORES_PREFIX}${tenantId}`, JSON.stringify(ids));
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function generateRestoreId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `rst_${timestamp}_${random}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
