// @cveriskpilot/backup — shared type definitions

/** Type of backup operation. */
export type BackupType = 'full' | 'incremental';

/** Stamp type determines the backup strategy. */
export type StampType = 'dedicated' | 'pooled';

/** Current status of a backup job. */
export type BackupStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'deleting';

/** Current status of a restore job. */
export type RestoreStatus =
  | 'pending'
  | 'validating'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'dry_run_complete';

/** GCS storage class for tiered lifecycle. */
export type StorageClass = 'STANDARD' | 'NEARLINE' | 'COLDLINE' | 'ARCHIVE';

/** Retention policy controlling backup lifecycle. */
export interface RetentionPolicy {
  /** Days to keep in hot storage (STANDARD) */
  hotRetentionDays: number;
  /** Days to keep in nearline storage */
  nearlineRetentionDays: number;
  /** Days to keep in coldline storage */
  coldlineRetentionDays: number;
  /** Total maximum retention before deletion */
  maxRetentionDays: number;
}

/** Configuration for a tenant's backup schedule. */
export interface BackupConfig {
  tenantId: string;
  stampType: StampType;
  /** Cron expression for scheduled backups */
  schedule: string;
  /** Default backup type for scheduled runs */
  defaultType: BackupType;
  retention: RetentionPolicy;
  /** GCS bucket for storing backups */
  gcsBucket: string;
  /** GCS path prefix for this tenant */
  gcsPrefix: string;
  /** Whether backup is enabled */
  enabled: boolean;
}

/** A single backup job record. */
export interface BackupJob {
  id: string;
  tenantId: string;
  type: BackupType;
  stampType: StampType;
  status: BackupStatus;
  /** GCS URI where backup is stored */
  gcsUri: string | null;
  /** Size of the backup in bytes */
  sizeBytes: number | null;
  /** ISO timestamp when the job was created */
  createdAt: string;
  /** ISO timestamp when the job started executing */
  startedAt: string | null;
  /** ISO timestamp when the job completed or failed */
  completedAt: string | null;
  /** Current storage class */
  storageClass: StorageClass;
  /** Error message if failed */
  error: string | null;
  /** Checksum for integrity verification */
  checksum: string | null;
  /** Metadata (e.g., pg_dump version, Cloud SQL instance) */
  metadata: Record<string, string>;
}

/** A restore job record. */
export interface RestoreJob {
  id: string;
  tenantId: string;
  backupId: string;
  status: RestoreStatus;
  /** Target stamp/instance for the restore */
  targetStamp: string;
  /** Whether this is a dry-run (validation only) */
  dryRun: boolean;
  /** ISO timestamp when the job was created */
  createdAt: string;
  /** ISO timestamp when the job started */
  startedAt: string | null;
  /** ISO timestamp when the job completed or failed */
  completedAt: string | null;
  /** Error message if failed */
  error: string | null;
  /** Validation results from pre-restore checks */
  validationResults: ValidationResult[];
}

/** Result of a pre-restore validation check. */
export interface ValidationResult {
  check: string;
  passed: boolean;
  message: string;
}
