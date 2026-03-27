import type { CanonicalFinding } from './types';

async function sha256(input: string): Promise<string> {
  // Use Web Crypto API (available in Node 18+ and browsers)
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a SHA-256 dedup key for a finding.
 * Key composition:
 * - If CVE present: SHA256(orgId + clientId + cveId + assetName + port)
 * - If no CVE: SHA256(orgId + clientId + title + assetName + port)
 */
export async function generateDedupKey(
  orgId: string,
  clientId: string,
  finding: CanonicalFinding,
): Promise<string> {
  const identifier =
    finding.cveIds.length > 0
      ? finding.cveIds[0]!
      : finding.title;

  const port = finding.port?.toString() ?? '';
  const input = `${orgId}|${clientId}|${identifier}|${finding.assetName}|${port}`;

  return sha256(input);
}

/**
 * Deduplicate findings within a single batch.
 * Keeps the first occurrence based on CVE+asset+port or title+asset+port.
 */
export function deduplicateFindings(
  findings: CanonicalFinding[],
): CanonicalFinding[] {
  const seen = new Set<string>();
  const result: CanonicalFinding[] = [];

  for (const finding of findings) {
    const identifier =
      finding.cveIds.length > 0
        ? finding.cveIds[0]!
        : finding.title;

    const port = finding.port?.toString() ?? '';
    const key = `${identifier}|${finding.assetName}|${port}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(finding);
    }
  }

  return result;
}
