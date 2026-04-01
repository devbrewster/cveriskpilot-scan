/**
 * Disk-based cache for OSV API responses.
 * Atomic writes (temp file + rename) prevent corruption on kill.
 * TTL-based: 24h for clean results, 1h for vulnerabilities found.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';

const CACHE_VERSION = 1;
const CACHE_DIR = path.join(os.homedir(), '.cveriskpilot', 'cache');
const OSV_CACHE_FILE = path.join(CACHE_DIR, 'osv-cache.json');

/** 24 hours for non-vulnerable, 1 hour for vulnerable */
const TTL_CLEAN_MS = 24 * 60 * 60 * 1000;
const TTL_VULN_MS = 60 * 60 * 1000;

interface CacheEntry {
  data: unknown;
  hasVulns: boolean;
  cachedAt: number;
}

interface CacheStore {
  version: number;
  entries: Record<string, CacheEntry>;
}

let store: CacheStore | null = null;

function ensureCacheDir(): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function loadStore(): CacheStore {
  if (store) return store;
  try {
    const raw = fs.readFileSync(OSV_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as CacheStore;
    if (parsed.version !== CACHE_VERSION) {
      store = { version: CACHE_VERSION, entries: {} };
    } else {
      store = parsed;
    }
  } catch {
    store = { version: CACHE_VERSION, entries: {} };
  }
  return store;
}

function cacheKey(packageName: string, ecosystem: string, version: string): string {
  const input = `${ecosystem}:${packageName}@${version}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

export function getCached(packageName: string, ecosystem: string, version: string): unknown | undefined {
  const s = loadStore();
  const key = cacheKey(packageName, ecosystem, version);
  const entry = s.entries[key];
  if (!entry) return undefined;

  const ttl = entry.hasVulns ? TTL_VULN_MS : TTL_CLEAN_MS;
  if (Date.now() - entry.cachedAt > ttl) {
    delete s.entries[key];
    return undefined;
  }

  return entry.data;
}

export function setCached(packageName: string, ecosystem: string, version: string, data: unknown, hasVulns: boolean): void {
  const s = loadStore();
  const key = cacheKey(packageName, ecosystem, version);
  s.entries[key] = { data, hasVulns, cachedAt: Date.now() };
}

/**
 * Flush cache to disk with atomic write (temp + rename).
 * Call once after all queries are done.
 */
export function flushCache(): void {
  if (!store) return;

  // Prune expired entries before writing
  const now = Date.now();
  for (const [key, entry] of Object.entries(store.entries)) {
    const ttl = entry.hasVulns ? TTL_VULN_MS : TTL_CLEAN_MS;
    if (now - entry.cachedAt > ttl) {
      delete store.entries[key];
    }
  }

  try {
    ensureCacheDir();
    const tmpFile = OSV_CACHE_FILE + `.${process.pid}.tmp`;
    const content = JSON.stringify(store);
    fs.writeFileSync(tmpFile, content, 'utf-8');
    fs.renameSync(tmpFile, OSV_CACHE_FILE);
  } catch {
    // Best-effort — don't fail the scan if cache write fails
  }
}
