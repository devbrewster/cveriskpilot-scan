// @cveriskpilot/backup — backup service

import type { BackupConfig, BackupJob, BackupType, RetentionPolicy, StampType } from './types';

// ---------------------------------------------------------------------------
// Storage interface
// ---------------------------------------------------------------------------

export interface BackupStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

/** In-memory store for development and testing. */
export class InMemoryBackupStore implements BackupStore {
  private data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const prefix = pattern.replace('*', '');
    return Array.from(this.data.keys()).filter((k) => k.startsWith(prefix));
  }
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_RETENTION: RetentionPolicy = {
  hotRetentionDays: 30,
  nearlineRetentionDays: 90,
  coldlineRetentionDays: 365,
  maxRetentionDays: 365,
};

// ---------------------------------------------------------------------------
// Key prefixes
// ---------------------------------------------------------------------------

const CONFIG_PREFIX = 'backup:config:';
const JOB_PREFIX = 'backup:job:';
const TENANT_JOBS_PREFIX = 'backup:tenant_jobs:';

// ---------------------------------------------------------------------------
// BackupService
// ---------------------------------------------------------------------------

export class BackupService {
  private store: BackupStore;

  constructor(store?: BackupStore) {
    this.store = store ?? new InMemoryBackupStore();
  }

  // -----------------------------------------------------------------------
  // Config management
  // -----------------------------------------------------------------------

  /** Configure backup settings for a tenant. */
  async configureBackup(
    tenantId: string,
    stampType: StampType,
    overrides?: Partial<Omit<BackupConfig, 'tenantId' | 'stampType'>>,
  ): Promise<BackupConfig> {
    const config: BackupConfig = {
      tenantId,
      stampType,
      schedule: overrides?.schedule ?? '0 2 * * *', // Default: daily at 2 AM
      defaultType: overrides?.defaultType ?? 'full',
      retention: overrides?.retention ?? { ...DEFAULT_RETENTION },
      gcsBucket: overrides?.gcsBucket ?? `cveriskpilot-backups-${tenantId}`,
      gcsPrefix: overrides?.gcsPrefix ?? `tenants/${tenantId}/backups`,
      enabled: overrides?.enabled ?? true,
    };

    await this.store.set(`${CONFIG_PREFIX}${tenantId}`, JSON.stringify(config));
    return config;
  }

  /** Get backup configuration for a tenant. */
  async getConfig(tenantId: string): Promise<BackupConfig | null> {
    const raw = await this.store.get(`${CONFIG_PREFIX}${tenantId}`);
    if (!raw) return null;
    return JSON.parse(raw) as BackupConfig;
  }

  // -----------------------------------------------------------------------
  // Backup creation
  // -----------------------------------------------------------------------

  /**
   * Initiate a tenant-scoped backup.
   *
   * - For **dedicated** stamps: triggers Cloud SQL Point-in-Time Recovery (PITR).
   * - For **pooled** stamps: exports tenant data via pg_dump with tenant filter.
   *
   * Backups are stored in GCS with lifecycle policies:
   * - 30 days STANDARD (hot)
   * - 90 days NEARLINE
   * - 365 days COLDLINE
   */
  async createBackup(tenantId: string, type: BackupType): Promise<BackupJob> {
    const config = await this.getConfig(tenantId);
    if (!config) {
      throw new Error(
        `No backup configuration for tenant ${tenantId}. Call configureBackup() first.`,
      );
    }

    if (!config.enabled) {
      throw new Error(`Backups are disabled for tenant ${tenantId}`);
    }

    const jobId = generateJobId();
    const now = new Date().toISOString();

    const job: BackupJob = {
      id: jobId,
      tenantId,
      type,
      stampType: config.stampType,
      status: 'pending',
      gcsUri: null,
      sizeBytes: null,
      createdAt: now,
      startedAt: null,
      completedAt: null,
      storageClass: 'STANDARD',
      error: null,
      checksum: null,
      metadata: this.buildBackupMetadata(config, type),
    };

    await this.store.set(`${JOB_PREFIX}${jobId}`, JSON.stringify(job));
    await this.addJobToTenantIndex(tenantId, jobId);

    // Simulate starting the backup (in production, this dispatches to Cloud Tasks/Pub/Sub)
    return this.startBackupExecution(job, config);
  }

  /**
   * Start executing a backup job. In production this would dispatch to the
   * appropriate infrastructure (Cloud SQL PITR or pg_dump pipeline).
   */
  private async startBackupExecution(
    job: BackupJob,
    config: BackupConfig,
  ): Promise<BackupJob> {
    const now = new Date().toISOString();
    const gcsUri = `gs://${config.gcsBucket}/${config.gcsPrefix}/${job.id}.backup`;

    const updated: BackupJob = {
      ...job,
      status: 'in_progress',
      startedAt: now,
      gcsUri,
      metadata: {
        ...job.metadata,
        ...(config.stampType === 'dedicated'
          ? { strategy: 'cloud_sql_pitr', instance: `sql-${job.tenantId}` }
          : { strategy: 'pg_dump_tenant_filter', filter: `tenant_id = '${job.tenantId}'` }),
      },
    };

    await this.store.set(`${JOB_PREFIX}${job.id}`, JSON.stringify(updated));
    return updated;
  }

  /** Update a backup job's status (called by the backup execution pipeline). */
  async updateJobStatus(
    jobId: string,
    status: BackupJob['status'],
    details?: { sizeBytes?: number; checksum?: string; error?: string },
  ): Promise<BackupJob> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Backup job ${jobId} not found`);
    }

    const now = new Date().toISOString();
    const isTerminal = status === 'completed' || status === 'failed';

    const updated: BackupJob = {
      ...job,
      status,
      completedAt: isTerminal ? now : job.completedAt,
      sizeBytes: details?.sizeBytes ?? job.sizeBytes,
      checksum: details?.checksum ?? job.checksum,
      error: details?.error ?? job.error,
    };

    await this.store.set(`${JOB_PREFIX}${jobId}`, JSON.stringify(updated));
    return updated;
  }

  // -----------------------------------------------------------------------
  // Job queries
  // -----------------------------------------------------------------------

  /** Get a specific backup job by ID. */
  async getJob(jobId: string): Promise<BackupJob | null> {
    const raw = await this.store.get(`${JOB_PREFIX}${jobId}`);
    if (!raw) return null;
    return JSON.parse(raw) as BackupJob;
  }

  /** List all backup jobs for a tenant. */
  async listJobs(tenantId: string): Promise<BackupJob[]> {
    const indexRaw = await this.store.get(`${TENANT_JOBS_PREFIX}${tenantId}`);
    if (!indexRaw) return [];

    const jobIds = JSON.parse(indexRaw) as string[];
    const jobs: BackupJob[] = [];

    for (const id of jobIds) {
      const job = await this.getJob(id);
      if (job) jobs.push(job);
    }

    return jobs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /** Get the latest completed backup for a tenant. */
  async getLatestBackup(tenantId: string): Promise<BackupJob | null> {
    const jobs = await this.listJobs(tenantId);
    return jobs.find((j) => j.status === 'completed') ?? null;
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private buildBackupMetadata(
    config: BackupConfig,
    type: BackupType,
  ): Record<string, string> {
    return {
      stampType: config.stampType,
      backupType: type,
      gcsBucket: config.gcsBucket,
      retentionHotDays: String(config.retention.hotRetentionDays),
      retentionNearlineDays: String(config.retention.nearlineRetentionDays),
      retentionColdlineDays: String(config.retention.coldlineRetentionDays),
    };
  }

  private async addJobToTenantIndex(tenantId: string, jobId: string): Promise<void> {
    const raw = await this.store.get(`${TENANT_JOBS_PREFIX}${tenantId}`);
    const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    ids.push(jobId);
    await this.store.set(`${TENANT_JOBS_PREFIX}${tenantId}`, JSON.stringify(ids));
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function generateJobId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `bkp_${timestamp}_${random}`;
}
