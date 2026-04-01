/**
 * Free Enrichment — EPSS + CISA KEV + Risk Score + Effort Estimate
 *
 * All data sources are free public APIs. No API key required.
 * Enriches findings in-place with risk intelligence context.
 */

import { withRetry } from './retry.js';
import type { CanonicalFinding } from './vendor/parsers/types.js';

// ---------------------------------------------------------------------------
// EPSS — Exploit Prediction Scoring System (api.first.org, free, no auth)
// ---------------------------------------------------------------------------

interface EpssEntry {
  cve: string;
  epss: string;
  percentile: string;
}

async function fetchEpss(cveIds: string[]): Promise<Map<string, { score: number; percentile: number }>> {
  const results = new Map<string, { score: number; percentile: number }>();
  if (cveIds.length === 0) return results;

  // EPSS API supports batch queries (comma-separated, max ~100 per request)
  const BATCH_SIZE = 100;
  for (let i = 0; i < cveIds.length; i += BATCH_SIZE) {
    const batch = cveIds.slice(i, i + BATCH_SIZE);
    try {
      const data = await withRetry(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8_000);
        try {
          const res = await fetch(
            `https://api.first.org/data/v1/epss?cve=${batch.join(',')}`,
            { signal: controller.signal },
          );
          clearTimeout(timer);
          if (!res.ok) {
            const err = new Error(`EPSS ${res.status}`);
            (err as any).status = res.status;
            throw err;
          }
          return (await res.json()) as { data: EpssEntry[] };
        } finally {
          clearTimeout(timer);
        }
      }, { maxRetries: 2, baseDelayMs: 500 });

      for (const entry of data.data ?? []) {
        results.set(entry.cve, {
          score: parseFloat(entry.epss),
          percentile: parseFloat(entry.percentile) * 100,
        });
      }
    } catch {
      // Non-fatal — continue without EPSS data
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// CISA KEV — Known Exploited Vulnerabilities (free JSON catalog)
// ---------------------------------------------------------------------------

interface KevVulnerability {
  cveID: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
  vendorProject: string;
  product: string;
}

let kevCache: Map<string, KevVulnerability> | null = null;

async function fetchKev(): Promise<Map<string, KevVulnerability>> {
  if (kevCache) return kevCache;

  try {
    const data = await withRetry(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      try {
        const res = await fetch(
          'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
          { signal: controller.signal },
        );
        clearTimeout(timer);
        if (!res.ok) {
          const err = new Error(`KEV ${res.status}`);
          (err as any).status = res.status;
          throw err;
        }
        return (await res.json()) as { vulnerabilities: KevVulnerability[] };
      } finally {
        clearTimeout(timer);
      }
    }, { maxRetries: 1, baseDelayMs: 1000 });

    kevCache = new Map();
    for (const v of data.vulnerabilities ?? []) {
      kevCache.set(v.cveID, v);
    }
    return kevCache;
  } catch {
    return new Map();
  }
}

// ---------------------------------------------------------------------------
// Risk Score — composite 0-100 from CVSS + EPSS + KEV
// ---------------------------------------------------------------------------

function computeRiskScore(finding: CanonicalFinding): number {
  // Base from CVSS (0-10 → 0-50)
  const cvssBase = (finding.cvssScore ?? severityToBaseCvss(finding.severity)) * 5;

  // EPSS multiplier (0-1 → 0-30 points)
  const epssPoints = (finding.epssScore ?? 0) * 30;

  // KEV boost (+20 if on KEV)
  const kevBoost = finding.kevListed ? 20 : 0;

  return Math.min(100, Math.round(cvssBase + epssPoints + kevBoost));
}

function severityToBaseCvss(severity: string): number {
  switch (severity) {
    case 'CRITICAL': return 9.5;
    case 'HIGH': return 7.5;
    case 'MEDIUM': return 5.0;
    case 'LOW': return 3.0;
    default: return 1.0;
  }
}

// ---------------------------------------------------------------------------
// Remediation Effort Estimate
// ---------------------------------------------------------------------------

function estimateEffort(finding: CanonicalFinding): 'LOW' | 'MEDIUM' | 'HIGH' {
  // Major version upgrade = HIGH effort
  if (finding.isSemVerMajor) return 'HIGH';

  // No fix available = HIGH (needs architecture change or workaround)
  if (finding.packageName && !finding.fixedVersion) return 'HIGH';

  // Patch-level fix = LOW
  if (finding.fixedVersion && finding.packageVersion) {
    const current = finding.packageVersion.split('.');
    const fix = finding.fixedVersion.split('.');
    // Same major + minor = patch update
    if (current[0] === fix[0] && current[1] === fix[1]) return 'LOW';
    // Same major = minor update
    if (current[0] === fix[0]) return 'MEDIUM';
    // Major version change
    return 'HIGH';
  }

  // Config/secrets findings = LOW (rotate, update config)
  if (finding.scannerType === 'secrets') return 'LOW';

  // IaC findings = LOW-MEDIUM (config changes)
  if (finding.scannerType === 'iac') return 'LOW';

  // API route security = MEDIUM (code change required)
  if (finding.scannerType === 'api-security') return 'MEDIUM';

  return 'MEDIUM';
}

// ---------------------------------------------------------------------------
// Public API — Enrich findings in-place
// ---------------------------------------------------------------------------

export interface EnrichmentStats {
  epssEnriched: number;
  kevEnriched: number;
  kevListed: number;
  riskScored: number;
  durationMs: number;
}

export async function enrichFindings(
  findings: CanonicalFinding[],
  verbose: boolean,
): Promise<EnrichmentStats> {
  const startTime = Date.now();
  const log = verbose ? (msg: string) => process.stderr.write(`  [enrich] ${msg}\n`) : () => {};
  const stats: EnrichmentStats = { epssEnriched: 0, kevEnriched: 0, kevListed: 0, riskScored: 0, durationMs: 0 };

  // Collect unique CVE IDs
  const cveSet = new Set<string>();
  for (const f of findings) {
    for (const cve of f.cveIds) cveSet.add(cve);
  }
  const cveIds = Array.from(cveSet);

  if (cveIds.length === 0) {
    // Still compute risk scores and effort for non-CVE findings
    for (const f of findings) {
      f.remediationEffort = estimateEffort(f);
      f.riskScore = computeRiskScore(f);
      stats.riskScored++;
    }
    stats.durationMs = Date.now() - startTime;
    return stats;
  }

  log(`Enriching ${cveIds.length} CVEs with EPSS + KEV data...`);

  // Fetch EPSS and KEV in parallel
  const [epssData, kevData] = await Promise.all([
    fetchEpss(cveIds),
    fetchKev(),
  ]);

  log(`EPSS: ${epssData.size} scores, KEV: ${kevData.size} entries loaded`);

  // Apply enrichment to findings
  for (const f of findings) {
    // EPSS: use the highest-scoring CVE for this finding
    for (const cve of f.cveIds) {
      const epss = epssData.get(cve);
      if (epss && (f.epssScore === undefined || epss.score > f.epssScore)) {
        f.epssScore = epss.score;
        f.epssPercentile = epss.percentile;
        stats.epssEnriched++;
      }
    }

    // KEV: check if any CVE is on the catalog
    for (const cve of f.cveIds) {
      const kev = kevData.get(cve);
      if (kev) {
        f.kevListed = true;
        f.kevDueDate = kev.dueDate;
        stats.kevEnriched++;
        stats.kevListed++;
        break;
      }
    }

    // Effort estimate
    f.remediationEffort = estimateEffort(f);

    // Risk score (depends on EPSS + KEV being set first)
    f.riskScore = computeRiskScore(f);
    stats.riskScored++;
  }

  stats.durationMs = Date.now() - startTime;
  log(`Enrichment complete in ${stats.durationMs}ms`);
  return stats;
}
