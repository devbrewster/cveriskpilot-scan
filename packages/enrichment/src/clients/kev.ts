import type { KevData, KevMatch } from '../types';
import { createLogger } from '@cveriskpilot/shared';

const logger = createLogger('enrichment:kev');

const KEV_CATALOG_URL =
  'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache
let cachedCatalog: Map<string, KevData> | null = null;
let lastFetchTimestamp = 0;

interface KevCatalogEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
}

interface KevCatalogResponse {
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: KevCatalogEntry[];
}

function parseKevEntry(entry: KevCatalogEntry): KevData {
  return {
    cveId: entry.cveID,
    vendorProject: entry.vendorProject,
    product: entry.product,
    vulnerabilityName: entry.vulnerabilityName,
    dateAdded: entry.dateAdded,
    shortDescription: entry.shortDescription,
    requiredAction: entry.requiredAction,
    dueDate: entry.dueDate,
    knownRansomwareCampaignUse: entry.knownRansomwareCampaignUse === 'Known',
  };
}

/**
 * Download and parse the full CISA KEV catalog.
 * Returns a Map of CVE ID to KEV data for fast lookup.
 * Results are cached in memory for 24 hours.
 */
export async function loadKevCatalog(): Promise<Map<string, KevData>> {
  const now = Date.now();

  // Return cached catalog if still fresh
  if (cachedCatalog && now - lastFetchTimestamp < CACHE_TTL_MS) {
    return cachedCatalog;
  }

  try {
    const response = await fetch(KEV_CATALOG_URL, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      logger.error(`KEV catalog fetch failed with status ${response.status}`);
      // Return stale cache if available
      if (cachedCatalog) return cachedCatalog;
      return new Map();
    }

    const data = (await response.json()) as KevCatalogResponse;
    const catalog = new Map<string, KevData>();

    if (data.vulnerabilities) {
      for (const entry of data.vulnerabilities) {
        catalog.set(entry.cveID, parseKevEntry(entry));
      }
    }

    cachedCatalog = catalog;
    lastFetchTimestamp = now;

    logger.info(`KEV catalog loaded: ${catalog.size} entries`);
    return catalog;
  } catch (err) {
    logger.error('Failed to load KEV catalog', { error: String(err) });
    // Return stale cache if available
    if (cachedCatalog) return cachedCatalog;
    return new Map();
  }
}

/**
 * Check an array of CVE IDs against a loaded KEV catalog.
 * Returns an array of matches.
 */
export function checkKev(
  catalog: Map<string, KevData>,
  cveIds: string[],
): KevMatch[] {
  const matches: KevMatch[] = [];

  for (const cveId of cveIds) {
    const kevData = catalog.get(cveId);
    if (kevData) {
      matches.push({ cveId, kevData });
    }
  }

  return matches;
}

/**
 * Reset the in-memory cache. Useful for testing.
 */
export function _resetKevCache(): void {
  cachedCatalog = null;
  lastFetchTimestamp = 0;
}
