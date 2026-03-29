import type { NvdCveData, NvdCvssData } from '../types';
import { createLogger } from '@cveriskpilot/shared';

const logger = createLogger('enrichment:nvd');

const NVD_API_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
const BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 2_000;

// Rate-limit tracking
const RATE_WINDOW_MS = 30_000;
let requestTimestamps: number[] = [];

function getRateLimit(): number {
  return process.env.NVD_API_KEY ? 50 : 5;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  if (process.env.NVD_API_KEY) {
    headers['apiKey'] = process.env.NVD_API_KEY;
  }
  return headers;
}

async function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const limit = getRateLimit();

  // Purge timestamps outside the rate window
  requestTimestamps = requestTimestamps.filter(
    (ts) => now - ts < RATE_WINDOW_MS,
  );

  if (requestTimestamps.length >= limit) {
    const oldest = requestTimestamps[0]!;
    const waitMs = RATE_WINDOW_MS - (now - oldest) + 100; // +100ms buffer
    if (waitMs > 0) {
      await sleepMs(waitMs);
    }
    // Purge again after sleeping
    const afterSleep = Date.now();
    requestTimestamps = requestTimestamps.filter(
      (ts) => afterSleep - ts < RATE_WINDOW_MS,
    );
  }

  requestTimestamps.push(Date.now());
}

// ---------------------------------------------------------------------------
// Response parsing helpers
// ---------------------------------------------------------------------------

interface NvdApiVulnerability {
  cve: {
    id: string;
    descriptions?: Array<{ lang: string; value: string }>;
    weaknesses?: Array<{
      description: Array<{ lang: string; value: string }>;
    }>;
    metrics?: {
      cvssMetricV31?: Array<{
        cvssData: { baseScore: number; vectorString: string; version: string };
      }>;
      cvssMetricV30?: Array<{
        cvssData: { baseScore: number; vectorString: string; version: string };
      }>;
      cvssMetricV2?: Array<{
        cvssData: { baseScore: number; vectorString: string; version: string };
      }>;
    };
    published?: string;
    lastModified?: string;
  };
}

interface NvdApiResponse {
  vulnerabilities?: NvdApiVulnerability[];
}

function extractCvss(metrics: NvdApiVulnerability['cve']['metrics']): {
  cvssV3?: NvdCvssData;
  cvssV2?: NvdCvssData;
} {
  if (!metrics) return {};

  let cvssV3: NvdCvssData | undefined;
  let cvssV2: NvdCvssData | undefined;

  // Prefer v3.1, fallback to v3.0
  const v31 = metrics.cvssMetricV31?.[0]?.cvssData;
  const v30 = metrics.cvssMetricV30?.[0]?.cvssData;
  const v3Source = v31 ?? v30;
  if (v3Source) {
    cvssV3 = {
      score: v3Source.baseScore,
      vector: v3Source.vectorString,
      version: v3Source.version,
    };
  }

  const v2Source = metrics.cvssMetricV2?.[0]?.cvssData;
  if (v2Source) {
    cvssV2 = {
      score: v2Source.baseScore,
      vector: v2Source.vectorString,
    };
  }

  return { cvssV3, cvssV2 };
}

function extractCweIds(
  weaknesses: NvdApiVulnerability['cve']['weaknesses'],
): string[] {
  if (!weaknesses) return [];
  const cweIds: string[] = [];
  for (const w of weaknesses) {
    for (const d of w.description) {
      if (d.value && d.value !== 'NVD-CWE-Other' && d.value !== 'NVD-CWE-noinfo') {
        cweIds.push(d.value);
      }
    }
  }
  return [...new Set(cweIds)];
}

function parseVulnerability(vuln: NvdApiVulnerability): NvdCveData {
  const cve = vuln.cve;
  const enDesc =
    cve.descriptions?.find((d) => d.lang === 'en')?.value ?? '';
  const { cvssV3, cvssV2 } = extractCvss(cve.metrics);

  return {
    cveId: cve.id,
    title: enDesc.length > 120 ? enDesc.slice(0, 120) + '...' : enDesc,
    description: enDesc,
    cweIds: extractCweIds(cve.weaknesses),
    cvssV3,
    cvssV2,
    publishedDate: cve.published ?? '',
    lastModified: cve.lastModified ?? '',
  };
}

// ---------------------------------------------------------------------------
// Single CVE fetch with retry
// ---------------------------------------------------------------------------

async function fetchSingleCve(cveId: string): Promise<NvdCveData | null> {
  const url = `${NVD_API_BASE}?cveId=${encodeURIComponent(cveId)}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await enforceRateLimit();

    try {
      const response = await fetch(url, { headers: getHeaders() });

      if (response.status === 404) {
        return null;
      }

      if (response.status === 429 || response.status === 503) {
        const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt);
        logger.warn(
          `NVD API returned ${response.status} for ${cveId}, retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await sleepMs(backoff);
        continue;
      }

      if (!response.ok) {
        logger.warn(
          `NVD API returned ${response.status} for ${cveId}, skipping`,
        );
        return null;
      }

      const data = (await response.json()) as NvdApiResponse;
      const vuln = data.vulnerabilities?.[0];
      if (!vuln) return null;

      return parseVulnerability(vuln);
    } catch (err) {
      if (attempt < MAX_RETRIES - 1) {
        const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt);
        logger.warn(
          `NVD API error for ${cveId}: ${String(err)}, retrying in ${backoff}ms`,
        );
        await sleepMs(backoff);
      } else {
        logger.error(`NVD API failed for ${cveId} after ${MAX_RETRIES} attempts`, { error: String(err) });
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API: batch lookup
// ---------------------------------------------------------------------------

/**
 * Fetch CVE data from NVD REST API v2.0 for a batch of CVE IDs.
 * Queries one CVE at a time (NVD v2.0 does not support multi-CVE queries
 * in a single call), respecting rate limits.
 * Processes in batches of {@link BATCH_SIZE} with rate-limit enforcement.
 */
export async function fetchNvdCves(
  cveIds: string[],
): Promise<Map<string, NvdCveData>> {
  const results = new Map<string, NvdCveData>();
  if (cveIds.length === 0) return results;

  const unique = [...new Set(cveIds)];

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);

    for (const cveId of batch) {
      const data = await fetchSingleCve(cveId);
      if (data) {
        results.set(cveId, data);
      }
    }
  }

  return results;
}

/**
 * Reset internal rate-limit state. Useful for testing.
 */
export function _resetRateLimitState(): void {
  requestTimestamps = [];
}
