import type { CanonicalFinding, ParseResult, ParseError } from '../types';

interface OsvEntry {
  id?: string;
  summary?: string;
  details?: string;
  aliases?: string[];
  modified?: string;
  published?: string;
  severity?: OsvSeverity[];
  affected?: OsvAffected[];
  references?: Array<{ type?: string; url?: string }>;
  database_specific?: Record<string, unknown>;
}

interface OsvSeverity {
  type?: string; // e.g. "CVSS_V3"
  score?: string; // CVSS vector string
}

interface OsvAffected {
  package?: {
    name?: string;
    ecosystem?: string;
    purl?: string;
  };
  ranges?: Array<{
    type?: string;
    events?: Array<{ introduced?: string; fixed?: string }>;
  }>;
  versions?: string[];
  ecosystem_specific?: Record<string, unknown>;
  database_specific?: Record<string, unknown>;
}

const CVE_REGEX = /CVE-\d{4}-\d{4,}/g;

/**
 * Parse a CVSS v3 vector to extract the base score severity.
 * The vector looks like: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
 * We derive severity from the score if present, or from the vector.
 */
function severityFromCvssVector(
  vector: string,
): CanonicalFinding['severity'] {
  // Try to extract numeric score if embedded
  const scoreMatch = vector.match(/(\d+\.?\d*)/);
  if (scoreMatch) {
    const score = parseFloat(scoreMatch[1]);
    // Only use if it looks like a reasonable CVSS score (0-10)
    if (score >= 0 && score <= 10) {
      return cvssScoreToSeverity(score);
    }
  }

  // Heuristic: count high-impact metrics in the vector
  const upper = vector.toUpperCase();
  if (upper.includes('/C:H') && upper.includes('/I:H') && upper.includes('/A:H')) {
    return 'CRITICAL';
  }
  if (upper.includes('/C:H') || upper.includes('/I:H') || upper.includes('/A:H')) {
    return 'HIGH';
  }
  if (upper.includes('/C:L') || upper.includes('/I:L') || upper.includes('/A:L')) {
    return 'MEDIUM';
  }
  return 'MEDIUM';
}

function cvssScoreToSeverity(score: number): CanonicalFinding['severity'] {
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MEDIUM';
  if (score > 0) return 'LOW';
  return 'INFO';
}

function severityFromDatabaseSpecific(
  dbSpecific: Record<string, unknown> | undefined,
): CanonicalFinding['severity'] | undefined {
  if (!dbSpecific) return undefined;
  const sev = dbSpecific['severity'] ?? dbSpecific['cvss_severity'];
  if (typeof sev === 'string') {
    const lower = sev.toLowerCase();
    const map: Record<string, CanonicalFinding['severity']> = {
      critical: 'CRITICAL',
      high: 'HIGH',
      moderate: 'MEDIUM',
      medium: 'MEDIUM',
      low: 'LOW',
      info: 'INFO',
    };
    return map[lower];
  }
  return undefined;
}

export async function parseOsv(
  content: string | Buffer,
): Promise<ParseResult> {
  const start = performance.now();
  const errors: ParseError[] = [];
  const findings: CanonicalFinding[] = [];

  const text =
    typeof content === 'string' ? content : content.toString('utf-8');

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    errors.push({
      message: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'error',
    });
    return {
      format: 'OSV',
      scannerName: 'osv',
      findings: [],
      metadata: {
        totalFindings: 0,
        parseTimeMs: performance.now() - start,
        errors,
      },
    };
  }

  // OSV can be a single entry or an array (e.g. from osv-scanner output)
  let entries: OsvEntry[];
  if (Array.isArray(data)) {
    entries = data as OsvEntry[];
  } else if (
    typeof data === 'object' &&
    data !== null &&
    'results' in data &&
    Array.isArray((data as Record<string, unknown>)['results'])
  ) {
    // osv-scanner output: { results: [{ packages: [{ vulnerabilities: [...] }] }] }
    entries = [];
    const results = (data as Record<string, unknown>)[
      'results'
    ] as Array<Record<string, unknown>>;
    for (const result of results) {
      const packages = (result['packages'] ?? []) as Array<
        Record<string, unknown>
      >;
      for (const pkg of packages) {
        const vulns = (pkg['vulnerabilities'] ?? []) as OsvEntry[];
        entries.push(...vulns);
      }
    }
  } else if (typeof data === 'object' && data !== null && 'id' in data) {
    // Single OSV entry
    entries = [data as OsvEntry];
  } else if (
    typeof data === 'object' &&
    data !== null &&
    'vulns' in data &&
    Array.isArray((data as Record<string, unknown>)['vulns'])
  ) {
    entries = (data as Record<string, unknown>)['vulns'] as OsvEntry[];
  } else {
    errors.push({
      message: 'Unrecognized OSV format',
      severity: 'warning',
    });
    entries = [];
  }

  for (const entry of entries) {
    try {
      const osvId = entry.id ?? 'unknown';
      const title = entry.summary ?? osvId;
      const description = entry.details ?? entry.summary ?? osvId;

      // Extract CVE IDs from aliases
      const cveIds: string[] = [];
      for (const alias of entry.aliases ?? []) {
        if (alias.match(CVE_REGEX)) {
          cveIds.push(alias);
        }
      }
      // Also check if the id itself is a CVE
      if (osvId.startsWith('CVE-')) {
        if (!cveIds.includes(osvId)) cveIds.push(osvId);
      }

      // Determine severity from CVSS
      let severity: CanonicalFinding['severity'] = 'MEDIUM';
      let cvssVector: string | undefined;
      let cvssVersion: string | undefined;
      let cvssScore: number | undefined;

      if (entry.severity && entry.severity.length > 0) {
        const sev = entry.severity[0];
        if (sev.score) {
          cvssVector = sev.score;
          severity = severityFromCvssVector(sev.score);
          if (sev.type === 'CVSS_V3') cvssVersion = '3.0';
          else if (sev.type === 'CVSS_V2') cvssVersion = '2.0';
        }
      } else {
        // Fall back to database_specific severity
        const dbSeverity = severityFromDatabaseSpecific(
          entry.database_specific,
        );
        if (dbSeverity) severity = dbSeverity;
      }

      // Create findings per affected package
      const affected = entry.affected ?? [];
      if (affected.length === 0) {
        findings.push({
          title,
          description,
          cveIds,
          cweIds: [],
          severity,
          cvssScore,
          cvssVector,
          cvssVersion,
          scannerType: 'SCA',
          scannerName: 'osv',
          assetName: osvId,
          rawObservations: {
            osvId,
            references: entry.references,
          },
          discoveredAt: entry.published
            ? new Date(entry.published)
            : new Date(),
        });
      } else {
        for (const aff of affected) {
          const packageName = aff.package?.name;
          const packageEcosystem = aff.package?.ecosystem;

          // Extract fixed version from ranges
          let fixedVersion: string | undefined;
          for (const range of aff.ranges ?? []) {
            for (const event of range.events ?? []) {
              if (event.fixed) {
                fixedVersion = event.fixed;
                break;
              }
            }
            if (fixedVersion) break;
          }

          // Use first affected version if available
          const packageVersion = aff.versions?.[0];

          findings.push({
            title,
            description,
            cveIds,
            cweIds: [],
            severity,
            cvssScore,
            cvssVector,
            cvssVersion,
            scannerType: 'SCA',
            scannerName: 'osv',
            assetName: packageName ?? osvId,
            packageName,
            packageVersion,
            packageEcosystem,
            fixedVersion,
            rawObservations: {
              osvId,
              references: entry.references,
              ecosystemSpecific: aff.ecosystem_specific,
            },
            discoveredAt: entry.published
              ? new Date(entry.published)
              : new Date(),
          });
        }
      }
    } catch (err) {
      errors.push({
        message: `Error parsing OSV entry: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'warning',
      });
    }
  }

  return {
    format: 'OSV',
    scannerName: 'osv',
    findings,
    metadata: {
      totalFindings: findings.length,
      parseTimeMs: performance.now() - start,
      errors,
    },
  };
}
