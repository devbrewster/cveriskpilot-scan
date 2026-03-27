// ---------------------------------------------------------------------------
// HackerOne Report Ingestion (t111)
// ---------------------------------------------------------------------------

import { HackerOneClient } from './client';
import type {
  HackerOneConfig,
  HackerOneReport,
  ReportFilters,
} from './client';
import type { CanonicalFinding } from '@cveriskpilot/parsers/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IngestionResult {
  imported: number;
  skipped: number;
  duplicates: number;
  errors: Array<{ reportId: string; error: string }>;
  findings: CanonicalFinding[];
}

export interface DedupConfig {
  /** Existing finding IDs/titles to check against for deduplication */
  existingTitles?: Set<string>;
  existingCveIds?: Set<string>;
}

// ---------------------------------------------------------------------------
// Severity mapping
// ---------------------------------------------------------------------------

function mapH1Severity(
  rating: string | null | undefined,
): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' {
  switch (rating) {
    case 'critical':
      return 'CRITICAL';
    case 'high':
      return 'HIGH';
    case 'medium':
      return 'MEDIUM';
    case 'low':
      return 'LOW';
    case 'none':
    default:
      return 'INFO';
  }
}

// ---------------------------------------------------------------------------
// HackerOneIngestion
// ---------------------------------------------------------------------------

export class HackerOneIngestion {
  private readonly client: HackerOneClient;

  constructor(config: HackerOneConfig) {
    this.client = new HackerOneClient(config);
  }

  /**
   * Import HackerOne reports as CanonicalFindings.
   */
  async importReports(
    programHandle: string,
    filters?: ReportFilters,
    dedupConfig?: DedupConfig,
  ): Promise<IngestionResult> {
    const result: IngestionResult = {
      imported: 0,
      skipped: 0,
      duplicates: 0,
      errors: [],
      findings: [],
    };

    let reports: HackerOneReport[];
    try {
      reports = await this.client.getReports(programHandle, filters);
    } catch (err) {
      result.errors.push({
        reportId: '*',
        error: `Failed to fetch reports: ${err instanceof Error ? err.message : String(err)}`,
      });
      return result;
    }

    for (const report of reports) {
      try {
        const finding = this.mapToCanonicalFinding(report);

        // Dedup check
        if (dedupConfig) {
          const isDuplicate = this.isDuplicate(finding, dedupConfig);
          if (isDuplicate) {
            result.duplicates++;
            continue;
          }
        }

        result.findings.push(finding);
        result.imported++;
      } catch (err) {
        result.errors.push({
          reportId: report.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    result.skipped = reports.length - result.imported - result.errors.length;

    return result;
  }

  /**
   * Convert a HackerOne report to CanonicalFinding format.
   */
  mapToCanonicalFinding(report: HackerOneReport): CanonicalFinding {
    const attrs = report.attributes;

    // Extract CWE IDs
    const cweIds: string[] = [];
    if (attrs.weakness?.external_id) {
      cweIds.push(attrs.weakness.external_id);
    }
    if (report.relationships?.weakness?.data?.attributes?.external_id) {
      const extId = report.relationships.weakness.data.attributes.external_id;
      if (!cweIds.includes(extId)) {
        cweIds.push(extId);
      }
    }

    // Extract CVSS score
    const cvssScore =
      report.relationships?.severity?.data?.attributes?.score ?? undefined;

    // Determine asset info
    const assetName =
      attrs.structured_scope?.asset_identifier ?? 'unknown';
    const assetType = attrs.structured_scope?.asset_type ?? undefined;

    return {
      title: attrs.title,
      description: attrs.vulnerability_information ?? '',
      cveIds: attrs.cve_ids ?? [],
      cweIds,
      severity: mapH1Severity(attrs.severity_rating),
      cvssScore: cvssScore ?? undefined,
      scannerType: 'bug_bounty',
      scannerName: 'HackerOne',
      runId: `h1-${report.id}`,
      assetName,
      assetType,
      rawObservations: {
        hackerone_report_id: report.id,
        state: attrs.state,
        created_at: attrs.created_at,
        triaged_at: attrs.triaged_at,
        disclosed_at: attrs.disclosed_at,
        bounty_amount: attrs.bounty_amount,
        severity_rating: attrs.severity_rating,
      },
      discoveredAt: new Date(attrs.created_at),
    };
  }

  // ---------------------------------------------------------------------------
  // Dedup
  // ---------------------------------------------------------------------------

  private isDuplicate(
    finding: CanonicalFinding,
    config: DedupConfig,
  ): boolean {
    // Check by title
    if (config.existingTitles?.has(finding.title)) {
      return true;
    }

    // Check by CVE IDs
    if (config.existingCveIds && finding.cveIds.length > 0) {
      for (const cve of finding.cveIds) {
        if (config.existingCveIds.has(cve)) {
          return true;
        }
      }
    }

    return false;
  }
}
