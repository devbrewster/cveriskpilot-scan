// ---------------------------------------------------------------------------
// Webhook delivery tracking — logs attempts, status, and retry scheduling
// ---------------------------------------------------------------------------
// Builds on top of webhook-sender.ts; this module adds persistent delivery
// tracking with an in-memory store (swap for Prisma/DB in production).
// ---------------------------------------------------------------------------

import { randomUUID } from 'crypto';

// ─── Types ───

export interface DeliveryAttempt {
  attemptNumber: number;
  timestamp: string;
  statusCode: number | null;
  success: boolean;
  error?: string;
  durationMs: number;
}

export interface DeliveryRecord {
  id: string;
  endpointId: string;
  organizationId: string;
  event: string;
  payload: Record<string, unknown>;
  attempts: DeliveryAttempt[];
  totalAttempts: number;
  success: boolean;
  createdAt: string;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  completedAt: string | null;
}

export interface DeliveryTrackerConfig {
  maxRetries: number;
  /** Backoff delays in milliseconds for each retry (index 0 = first retry delay). */
  retryDelaysMs: number[];
  /** Maximum number of delivery records to retain in memory per org. */
  maxRecordsPerOrg: number;
}

const DEFAULT_CONFIG: DeliveryTrackerConfig = {
  maxRetries: 3,
  retryDelaysMs: [60_000, 300_000, 900_000], // 1min, 5min, 15min
  maxRecordsPerOrg: 500,
};

// ─── Delivery Tracker ───

export class DeliveryTracker {
  private config: DeliveryTrackerConfig;
  /** orgId -> DeliveryRecord[] */
  private records: Map<string, DeliveryRecord[]> = new Map();

  constructor(config: Partial<DeliveryTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── Lifecycle ──

  /**
   * Create a new delivery record before the first send attempt.
   */
  createDelivery(
    organizationId: string,
    endpointId: string,
    event: string,
    payload: Record<string, unknown>,
  ): DeliveryRecord {
    const now = new Date().toISOString();
    const record: DeliveryRecord = {
      id: randomUUID(),
      endpointId,
      organizationId,
      event,
      payload,
      attempts: [],
      totalAttempts: 0,
      success: false,
      createdAt: now,
      lastAttemptAt: null,
      nextRetryAt: null,
      completedAt: null,
    };

    const orgRecords = this.records.get(organizationId) ?? [];
    orgRecords.push(record);

    // Evict oldest records when limit is exceeded
    if (orgRecords.length > this.config.maxRecordsPerOrg) {
      orgRecords.splice(0, orgRecords.length - this.config.maxRecordsPerOrg);
    }

    this.records.set(organizationId, orgRecords);
    return record;
  }

  /**
   * Record the result of a delivery attempt (success or failure).
   */
  recordAttempt(
    deliveryId: string,
    result: {
      statusCode: number | null;
      success: boolean;
      error?: string;
      durationMs: number;
    },
  ): DeliveryRecord | null {
    const record = this.findById(deliveryId);
    if (!record) return null;

    const now = new Date().toISOString();
    record.totalAttempts += 1;

    const attempt: DeliveryAttempt = {
      attemptNumber: record.totalAttempts,
      timestamp: now,
      statusCode: result.statusCode,
      success: result.success,
      error: result.error,
      durationMs: result.durationMs,
    };
    record.attempts.push(attempt);
    record.lastAttemptAt = now;

    if (result.success) {
      record.success = true;
      record.nextRetryAt = null;
      record.completedAt = now;
    } else {
      record.success = false;
      record.nextRetryAt = this.computeNextRetryAt(record.totalAttempts);
      if (record.nextRetryAt === null) {
        // Max retries exhausted — mark as completed (failed)
        record.completedAt = now;
      }
    }

    return record;
  }

  // ── Queries ──

  /**
   * List recent deliveries for an organization, newest first.
   */
  listDeliveries(
    organizationId: string,
    options: { limit?: number; offset?: number; event?: string; success?: boolean } = {},
  ): { deliveries: DeliveryRecord[]; total: number } {
    let orgRecords = this.records.get(organizationId) ?? [];

    if (options.event) {
      orgRecords = orgRecords.filter((r) => r.event === options.event);
    }
    if (options.success !== undefined) {
      orgRecords = orgRecords.filter((r) => r.success === options.success);
    }

    const total = orgRecords.length;
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    // Return newest first
    const deliveries = [...orgRecords].reverse().slice(offset, offset + limit);
    return { deliveries, total };
  }

  /**
   * Get a single delivery by ID (searches all orgs).
   */
  getDelivery(deliveryId: string): DeliveryRecord | null {
    return this.findById(deliveryId);
  }

  /**
   * Return all deliveries due for retry (nextRetryAt <= now, not yet successful).
   */
  getPendingRetries(): DeliveryRecord[] {
    const now = new Date().toISOString();
    const pending: DeliveryRecord[] = [];

    const allOrgRecords = Array.from(this.records.values());
    for (const orgRecords of allOrgRecords) {
      for (const record of orgRecords) {
        if (
          !record.success &&
          record.nextRetryAt !== null &&
          record.nextRetryAt <= now
        ) {
          pending.push(record);
        }
      }
    }

    return pending;
  }

  /**
   * Check whether a delivery has retries remaining.
   */
  hasRetriesRemaining(deliveryId: string): boolean {
    const record = this.findById(deliveryId);
    if (!record) return false;
    return record.totalAttempts < this.config.maxRetries;
  }

  // ── Config ──

  getConfig(): Readonly<DeliveryTrackerConfig> {
    return { ...this.config };
  }

  // ── Internals ──

  private findById(deliveryId: string): DeliveryRecord | null {
    const allOrgRecords = Array.from(this.records.values());
    for (const orgRecords of allOrgRecords) {
      const record = orgRecords.find((r) => r.id === deliveryId);
      if (record) return record;
    }
    return null;
  }

  private computeNextRetryAt(attemptsSoFar: number): string | null {
    if (attemptsSoFar >= this.config.maxRetries) return null;
    const delayIndex = Math.min(attemptsSoFar - 1, this.config.retryDelaysMs.length - 1);
    const delayMs = this.config.retryDelaysMs[delayIndex];
    return new Date(Date.now() + delayMs).toISOString();
  }
}

// ─── Singleton ───

let _defaultTracker: DeliveryTracker | null = null;

export function getDeliveryTracker(config?: Partial<DeliveryTrackerConfig>): DeliveryTracker {
  if (!_defaultTracker) {
    _defaultTracker = new DeliveryTracker(config);
  }
  return _defaultTracker;
}

/**
 * Reset the singleton (useful in tests).
 */
export function resetDeliveryTracker(): void {
  _defaultTracker = null;
}
