import type { CanonicalFinding } from '@cveriskpilot/parsers';
import type {
  EnrichedFinding,
  EnrichmentStats,
  NvdCveData,
  EpssData,
  KevData,
} from '../types.js';
import { fetchNvdCves } from '../clients/nvd.js';
import { fetchEpssScores } from '../clients/epss.js';
import { loadKevCatalog, checkKev } from '../clients/kev.js';
import {
  getCachedNvd,
  setCachedNvd,
  getCachedEpss,
  setCachedEpss,
} from '../cache/redis-cache.js';
import { computeRiskScore } from '../scoring/risk-score.js';

// ---------------------------------------------------------------------------
// Stage 1: Extract unique CVE IDs
// ---------------------------------------------------------------------------

function extractUniqueCves(findings: CanonicalFinding[]): string[] {
  const cveSet = new Set<string>();
  for (const finding of findings) {
    for (const cveId of finding.cveIds) {
      cveSet.add(cveId);
    }
  }
  return [...cveSet];
}

// ---------------------------------------------------------------------------
// Stage 2: NVD enrichment (cache-aware)
// ---------------------------------------------------------------------------

async function enrichNvd(
  cveIds: string[],
  stats: EnrichmentStats,
): Promise<Map<string, NvdCveData>> {
  const allNvd = new Map<string, NvdCveData>();
  if (cveIds.length === 0) return allNvd;

  try {
    // Check cache first
    const { cached, uncached } = await getCachedNvd(cveIds);
    stats.nvdCacheHits = cached.size;

    for (const [id, data] of cached) {
      allNvd.set(id, data);
    }

    // Fetch uncached from NVD API
    if (uncached.length > 0) {
      stats.nvdApiCalls = uncached.length;
      const fetched = await fetchNvdCves(uncached);

      for (const [id, data] of fetched) {
        allNvd.set(id, data);
      }

      // Cache the newly fetched data
      if (fetched.size > 0) {
        await setCachedNvd(fetched);
      }
    }
  } catch (err) {
    console.error('NVD enrichment failed (partial):', err);
  }

  return allNvd;
}

// ---------------------------------------------------------------------------
// Stage 3: EPSS enrichment (cache-aware)
// ---------------------------------------------------------------------------

async function enrichEpss(
  cveIds: string[],
  stats: EnrichmentStats,
): Promise<Map<string, EpssData>> {
  const allEpss = new Map<string, EpssData>();
  if (cveIds.length === 0) return allEpss;

  try {
    // Check cache first
    const { cached, uncached } = await getCachedEpss(cveIds);
    stats.epssCacheHits = cached.size;

    for (const [id, data] of cached) {
      allEpss.set(id, data);
    }

    // Fetch uncached from EPSS API
    if (uncached.length > 0) {
      stats.epssApiCalls = uncached.length;
      const fetched = await fetchEpssScores(uncached);

      for (const [id, data] of fetched) {
        allEpss.set(id, data);
      }

      // Cache the newly fetched data
      if (fetched.size > 0) {
        await setCachedEpss(fetched);
      }
    }
  } catch (err) {
    console.error('EPSS enrichment failed (partial):', err);
  }

  return allEpss;
}

// ---------------------------------------------------------------------------
// Stage 4: KEV check
// ---------------------------------------------------------------------------

async function enrichKev(
  cveIds: string[],
  stats: EnrichmentStats,
): Promise<Map<string, KevData>> {
  const kevMap = new Map<string, KevData>();
  if (cveIds.length === 0) return kevMap;

  try {
    const catalog = await loadKevCatalog();
    const matches = checkKev(catalog, cveIds);
    stats.kevMatches = matches.length;

    for (const match of matches) {
      kevMap.set(match.cveId, match.kevData);
    }
  } catch (err) {
    console.error('KEV enrichment failed (partial):', err);
  }

  return kevMap;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Orchestrate the full enrichment flow for a batch of CanonicalFindings.
 *
 * 4 stages:
 * 1. Extract unique CVEs from all findings
 * 2. NVD enrichment: cache check -> fetch uncached -> cache results
 * 3. EPSS enrichment: cache check -> fetch uncached -> cache results
 * 4. KEV check: load catalog -> match CVEs
 *
 * Handles partial failures: if NVD is down, EPSS+KEV data still included.
 */
export async function enrichFindings(
  findings: CanonicalFinding[],
): Promise<EnrichedFinding[]> {
  const startTime = Date.now();

  const stats: EnrichmentStats = {
    totalCves: 0,
    nvdCacheHits: 0,
    nvdApiCalls: 0,
    epssCacheHits: 0,
    epssApiCalls: 0,
    kevMatches: 0,
    enrichmentTimeMs: 0,
  };

  // Stage 1: Extract unique CVE IDs
  const cveIds = extractUniqueCves(findings);
  stats.totalCves = cveIds.length;

  // Stages 2-4: Run enrichment (NVD sequential due to rate limits, EPSS+KEV can run after)
  const nvdMap = await enrichNvd(cveIds, stats);
  const [epssMap, kevMap] = await Promise.all([
    enrichEpss(cveIds, stats),
    enrichKev(cveIds, stats),
  ]);

  // Build enriched findings
  const enriched: EnrichedFinding[] = findings.map((finding) => {
    // Pick the first CVE's data for the primary enrichment
    const primaryCve = finding.cveIds[0];

    const nvdData = primaryCve ? nvdMap.get(primaryCve) : undefined;
    const epssData = primaryCve ? epssMap.get(primaryCve) : undefined;
    const kevData = primaryCve ? kevMap.get(primaryCve) : undefined;

    // Determine CVSS score: prefer NVD data, fall back to scanner-provided
    const cvssScore =
      nvdData?.cvssV3?.score ?? nvdData?.cvssV2?.score ?? finding.cvssScore;

    const riskScore = computeRiskScore({
      cvssScore,
      epssScore: epssData?.score,
      kevListed: kevData !== undefined,
    });

    return {
      ...finding,
      nvdData,
      epssData,
      kevData,
      riskScore,
    };
  });

  stats.enrichmentTimeMs = Date.now() - startTime;

  console.log(
    `Enrichment complete: ${stats.totalCves} CVEs, ` +
      `NVD cache=${stats.nvdCacheHits} api=${stats.nvdApiCalls}, ` +
      `EPSS cache=${stats.epssCacheHits} api=${stats.epssApiCalls}, ` +
      `KEV matches=${stats.kevMatches}, ` +
      `time=${stats.enrichmentTimeMs}ms`,
  );

  return enriched;
}

/**
 * Returns enrichment stats without running the pipeline.
 * Useful for dry-run or preview mode.
 */
export function extractCveIds(findings: CanonicalFinding[]): string[] {
  return extractUniqueCves(findings);
}
