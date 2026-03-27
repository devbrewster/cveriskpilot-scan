// @cveriskpilot/streaming — Redis-backed progress tracking for scan jobs

import type { PipelinePhase, ProgressUpdate } from './types';

// ---------------------------------------------------------------------------
// Redis client abstraction
// ---------------------------------------------------------------------------

/**
 * Minimal Redis-like interface so we can swap in ioredis, node-redis, or
 * an in-memory implementation without hard-coupling.
 */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: Array<string | number>): Promise<unknown>;
  del(key: string): Promise<number>;
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string, handler: (message: string) => void): Promise<void>;
}

/**
 * In-memory implementation of RedisLike for local development / testing.
 */
export class InMemoryRedis implements RedisLike {
  private store = new Map<string, string>();
  private subscribers = new Map<string, Array<(message: string) => void>>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, ...args: Array<string | number>): Promise<'OK'> {
    this.store.set(key, value);

    // Handle EX (expiry in seconds) — simplified: schedule deletion
    const exIndex = args.indexOf('EX');
    if (exIndex !== -1 && typeof args[exIndex + 1] === 'number') {
      const ttlSeconds = args[exIndex + 1] as number;
      setTimeout(() => this.store.delete(key), ttlSeconds * 1000);
    }

    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async publish(channel: string, message: string): Promise<number> {
    const handlers = this.subscribers.get(channel) ?? [];
    for (const handler of handlers) {
      handler(message);
    }
    return handlers.length;
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    const existing = this.subscribers.get(channel) ?? [];
    existing.push(handler);
    this.subscribers.set(channel, existing);
  }
}

// ---------------------------------------------------------------------------
// ProgressTracker
// ---------------------------------------------------------------------------

const REDIS_KEY_PREFIX = 'cverp:progress:';
const REDIS_CHANNEL = 'cverp:progress:updates';
const DEFAULT_TTL_SECONDS = 3600; // 1 hour

/**
 * Tracks scan processing progress in Redis so that multiple app instances
 * can read/write consistent state. Publishes updates via Redis pub/sub
 * for real-time fan-out.
 */
export class ProgressTracker {
  private redis: RedisLike;
  private ttlSeconds: number;
  private listeners = new Map<string, Array<(update: ProgressUpdate) => void>>();
  private subscribed = false;

  constructor(redis?: RedisLike, options?: { ttlSeconds?: number }) {
    this.redis = redis ?? new InMemoryRedis();
    this.ttlSeconds = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  }

  /**
   * Record a progress update for a job.
   * Stores in Redis and publishes to the updates channel.
   */
  async update(params: {
    jobId: string;
    tenantId: string;
    phase: PipelinePhase;
    processed: number;
    total: number;
    message?: string;
  }): Promise<ProgressUpdate> {
    const { jobId, tenantId, phase, processed, total, message } = params;
    const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

    const update: ProgressUpdate = {
      jobId,
      tenantId,
      phase,
      processed,
      total,
      percent,
      message: message ?? `${phase}: ${processed}/${total} (${percent}%)`,
      updatedAt: new Date().toISOString(),
    };

    const key = `${REDIS_KEY_PREFIX}${jobId}`;
    const json = JSON.stringify(update);

    await this.redis.set(key, json, 'EX', this.ttlSeconds);
    await this.redis.publish(REDIS_CHANNEL, json);

    // Notify local listeners
    this.notifyLocal(jobId, update);

    return update;
  }

  /**
   * Get the latest progress for a job.
   */
  async get(jobId: string): Promise<ProgressUpdate | null> {
    const key = `${REDIS_KEY_PREFIX}${jobId}`;
    const raw = await this.redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as ProgressUpdate;
  }

  /**
   * Mark a job as complete and remove its progress entry after a delay.
   */
  async complete(jobId: string, tenantId: string): Promise<ProgressUpdate> {
    return this.update({
      jobId,
      tenantId,
      phase: 'complete',
      processed: 0,
      total: 0,
      message: 'Processing complete',
    });
  }

  /**
   * Mark a job as failed.
   */
  async fail(jobId: string, tenantId: string, errorMessage: string): Promise<ProgressUpdate> {
    return this.update({
      jobId,
      tenantId,
      phase: 'error',
      processed: 0,
      total: 0,
      message: errorMessage,
    });
  }

  /**
   * Remove progress tracking for a job.
   */
  async clear(jobId: string): Promise<void> {
    const key = `${REDIS_KEY_PREFIX}${jobId}`;
    await this.redis.del(key);
  }

  /**
   * Subscribe to progress updates for a specific job (local in-process listener).
   * For cross-instance updates, the Redis pub/sub channel is used automatically.
   */
  onProgress(jobId: string, listener: (update: ProgressUpdate) => void): () => void {
    const existing = this.listeners.get(jobId) ?? [];
    existing.push(listener);
    this.listeners.set(jobId, existing);

    // Ensure we're subscribed to Redis channel
    this.ensureSubscribed();

    // Return unsubscribe function
    return () => {
      const list = this.listeners.get(jobId);
      if (list) {
        const idx = list.indexOf(listener);
        if (idx !== -1) list.splice(idx, 1);
        if (list.length === 0) this.listeners.delete(jobId);
      }
    };
  }

  /**
   * Subscribe to all progress updates (any job).
   */
  onAnyProgress(listener: (update: ProgressUpdate) => void): () => void {
    const ALL_KEY = '__all__';
    const existing = this.listeners.get(ALL_KEY) ?? [];
    existing.push(listener);
    this.listeners.set(ALL_KEY, existing);

    this.ensureSubscribed();

    return () => {
      const list = this.listeners.get(ALL_KEY);
      if (list) {
        const idx = list.indexOf(listener);
        if (idx !== -1) list.splice(idx, 1);
        if (list.length === 0) this.listeners.delete(ALL_KEY);
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private notifyLocal(jobId: string, update: ProgressUpdate): void {
    // Job-specific listeners
    const jobListeners = this.listeners.get(jobId) ?? [];
    for (const listener of jobListeners) {
      try {
        listener(update);
      } catch {
        // Don't let a bad listener break the pipeline
      }
    }

    // Global listeners
    const allListeners = this.listeners.get('__all__') ?? [];
    for (const listener of allListeners) {
      try {
        listener(update);
      } catch {
        // Swallow
      }
    }
  }

  private ensureSubscribed(): void {
    if (this.subscribed) return;
    this.subscribed = true;

    this.redis.subscribe(REDIS_CHANNEL, (message: string) => {
      try {
        const update = JSON.parse(message) as ProgressUpdate;
        this.notifyLocal(update.jobId, update);
      } catch {
        // Ignore malformed messages
      }
    });
  }
}
