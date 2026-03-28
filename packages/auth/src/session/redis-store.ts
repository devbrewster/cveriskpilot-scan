// Redis-backed server-side session store for CVERiskPilot
// Provides session CRUD with sliding-window TTL refresh

import Redis from 'ioredis';
import crypto from 'node:crypto';
import type { UserRole } from '@cveriskpilot/domain';

/** Session data stored in Redis */
export interface Session {
  userId: string;
  organizationId: string;
  role: UserRole;
  email: string;
  createdAt: string;    // ISO 8601
  expiresAt: string;    // ISO 8601
  mfaVerified?: boolean;
  /** MSSP client context — set when user switches to a specific client */
  clientId?: string;
  /** Display name of the active MSSP client */
  clientName?: string;
}

/** Default session TTL: 24 hours in seconds */
const DEFAULT_SESSION_TTL_SECONDS = 24 * 60 * 60;

/** Redis key prefix for sessions */
const SESSION_KEY_PREFIX = 'crp:session:';

let redisInstance: Redis | null = null;

/** In-memory session store for local dev when Redis is unavailable */
const memoryStore = new Map<string, { value: string; expiresAt: number }>();

/** Whether we're using the in-memory fallback */
let usingMemoryFallback = false;

/**
 * Get or create a Redis client singleton.
 * Uses REDIS_URL from environment. Falls back to in-memory store if unavailable.
 */
export function getRedisClient(): Redis {
  if (redisInstance) return redisInstance;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    usingMemoryFallback = true;
    // Return a minimal Redis-compatible interface backed by Map
    return createMemoryRedisProxy();
  }

  redisInstance = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  return redisInstance;
}

/**
 * Creates a proxy object that implements the subset of Redis methods
 * used by the session store, backed by an in-memory Map.
 */
function createMemoryRedisProxy(): Redis {
  const proxy = {
    async set(key: string, value: string, _mode?: string, ttl?: number) {
      const expiresAt = ttl ? Date.now() + ttl * 1000 : Date.now() + 86400000;
      memoryStore.set(key, { value, expiresAt });
      return 'OK';
    },
    async get(key: string) {
      const entry = memoryStore.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= Date.now()) {
        memoryStore.delete(key);
        return null;
      }
      return entry.value;
    },
    async del(key: string) {
      memoryStore.delete(key);
      return 1;
    },
  } as unknown as Redis;

  redisInstance = proxy;
  return proxy;
}

/**
 * Allow injecting a Redis client for testing or custom configurations.
 */
export function setRedisClient(client: Redis): void {
  redisInstance = client;
}

/**
 * Build the Redis key for a given session ID.
 */
function sessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

/**
 * Create a new session in Redis.
 * Returns the session ID (used as the cookie value).
 */
export async function createSession(
  data: Omit<Session, 'createdAt' | 'expiresAt'>,
  ttlSeconds: number = DEFAULT_SESSION_TTL_SECONDS,
): Promise<string> {
  const redis = getRedisClient();
  const sessionId = crypto.randomUUID();
  const now = new Date();

  const session: Session = {
    ...data,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
  };

  await redis.set(
    sessionKey(sessionId),
    JSON.stringify(session),
    'EX',
    ttlSeconds,
  );

  return sessionId;
}

/**
 * Retrieve a session by its ID.
 * Returns null if the session does not exist or has expired.
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const redis = getRedisClient();
  const raw = await redis.get(sessionKey(sessionId));

  if (!raw) return null;

  const session = JSON.parse(raw) as Session;

  // Double-check expiry (belt and suspenders with Redis TTL)
  if (new Date(session.expiresAt) <= new Date()) {
    await redis.del(sessionKey(sessionId));
    return null;
  }

  return session;
}

/**
 * Destroy (invalidate) a session.
 */
export async function destroySession(sessionId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(sessionKey(sessionId));
}

/**
 * Refresh a session's TTL (sliding window).
 * Updates the expiresAt field and resets the Redis TTL.
 */
export async function refreshSession(
  sessionId: string,
  ttlSeconds: number = DEFAULT_SESSION_TTL_SECONDS,
): Promise<Session | null> {
  const session = await getSession(sessionId);
  if (!session) return null;

  const redis = getRedisClient();
  const newExpiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const updatedSession: Session = {
    ...session,
    expiresAt: newExpiresAt,
  };

  await redis.set(
    sessionKey(sessionId),
    JSON.stringify(updatedSession),
    'EX',
    ttlSeconds,
  );

  return updatedSession;
}

/**
 * Update specific fields of an existing session.
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<Pick<Session, 'mfaVerified' | 'role' | 'clientId' | 'clientName'>>,
): Promise<Session | null> {
  const session = await getSession(sessionId);
  if (!session) return null;

  const redis = getRedisClient();
  const updatedSession: Session = { ...session, ...updates };

  // Preserve remaining TTL
  const remainingTtl = Math.max(
    1,
    Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000),
  );

  await redis.set(
    sessionKey(sessionId),
    JSON.stringify(updatedSession),
    'EX',
    remainingTtl,
  );

  return updatedSession;
}
