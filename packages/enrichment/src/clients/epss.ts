import type { EpssData } from '../types.js';

const EPSS_API_BASE = 'https://api.first.org/data/v1/epss';
const BATCH_SIZE = 100;

interface EpssApiDataEntry {
  cve: string;
  epss: string;
  percentile: string;
  date: string;
}

interface EpssApiResponse {
  status: string;
  'status-code': number;
  data?: EpssApiDataEntry[];
}

/**
 * Fetch EPSS scores from FIRST EPSS API for a batch of CVE IDs.
 * Sends up to 100 CVEs per request as comma-separated query param.
 */
export async function fetchEpssScores(
  cveIds: string[],
): Promise<Map<string, EpssData>> {
  const results = new Map<string, EpssData>();
  if (cveIds.length === 0) return results;

  const unique = [...new Set(cveIds)];

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const cveParam = batch.join(',');
    const url = `${EPSS_API_BASE}?cve=${encodeURIComponent(cveParam)}`;

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        console.warn(`EPSS API returned ${response.status}, skipping batch`);
        continue;
      }

      const data = (await response.json()) as EpssApiResponse;

      if (!data.data || data.data.length === 0) {
        continue;
      }

      for (const entry of data.data) {
        const epssScore = parseFloat(entry.epss);
        const epssPercentile = parseFloat(entry.percentile);

        if (isNaN(epssScore) || isNaN(epssPercentile)) continue;

        results.set(entry.cve, {
          cveId: entry.cve,
          score: epssScore,
          percentile: epssPercentile,
          date: entry.date,
        });
      }
    } catch (err) {
      console.error('EPSS API error:', err);
    }
  }

  return results;
}
