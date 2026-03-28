// ---------------------------------------------------------------------------
// Snyk → CanonicalFinding Mapper
// ---------------------------------------------------------------------------

import type { CanonicalFinding } from '@cveriskpilot/parsers';

// ---------------------------------------------------------------------------
// Snyk REST API Response Types
// ---------------------------------------------------------------------------

export interface SnykIssue {
  id: string;
  type: string; // 'issue'
  attributes: SnykIssueAttributes;
  relationships?: {
    organization?: { data: { id: string; type: string } };
    scan_item?: { data: { id: string; type: string } };
  };
}

export interface SnykIssueAttributes {
  title: string;
  description?: string;
  status: string; // 'open' | 'resolved' | 'ignored'
  type: string; // 'package_vulnerability' | 'license' | 'code' | 'cloud' | 'custom'
  effective_severity_level: string; // 'critical' | 'high' | 'medium' | 'low' | 'info'
  created_at: string;
  updated_at: string;
  problems: SnykProblem[];
  coordinates?: SnykCoordinate[];
  severities?: SnykSeverity[];
  slots?: {
    disclosure_time?: string;
    exploit?: string;
    publication_time?: string;
    references?: Array<{ title?: string; url: string }>;
  };
  classes?: Array<{ id: string; source: string; type: string }>;
  key: string;
  tool?: string;
}

export interface SnykProblem {
  id: string;
  source: string; // 'CVE' | 'CWE' | 'SNYK' | 'GHSA' | etc.
  type: string;
  url?: string;
  disclosed_at?: string;
  updated_at?: string;
}

export interface SnykCoordinate {
  representations: Array<{
    dependency?: {
      package_name: string;
      package_version: string;
    };
    resourcePath?: string;
  }>;
  remedies?: Array<{
    type: string;
    description: string;
    details?: {
      upgrade_package?: string;
    };
  }>;
}

export interface SnykSeverity {
  source: string;
  level: string;
  score?: number;
  vector?: string;
  type?: string; // 'CVSS' | 'Snyk'
  modifier?: string;
}

export interface SnykIssuesResponse {
  data: SnykIssue[];
  jsonapi: { version: string };
  links?: {
    self?: string;
    first?: string;
    last?: string;
    next?: string;
    prev?: string;
  };
}

export interface SnykProject {
  id: string;
  name: string;
  type?: string;
  origin?: string;
  targetReference?: string;
}

// ---------------------------------------------------------------------------
// Severity Mapping
// ---------------------------------------------------------------------------

const SEVERITY_MAP: Record<string, CanonicalFinding['severity']> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
  info: 'INFO',
};

function mapSeverity(snykSeverity: string): CanonicalFinding['severity'] {
  return SEVERITY_MAP[snykSeverity.toLowerCase()] ?? 'INFO';
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

/**
 * Map a single Snyk issue to a CanonicalFinding.
 */
export function mapSnykIssue(
  issue: SnykIssue,
  projectName?: string,
): CanonicalFinding {
  const cveIds = extractIds(issue.attributes.problems, 'CVE');
  const cweIds = extractIds(issue.attributes.problems, 'CWE');

  // Find best CVSS score from severities
  const { cvssScore, cvssVector, cvssVersion } = extractCvss(issue.attributes.severities);

  // Extract package info from coordinates
  const packageInfo = extractPackageInfo(issue.attributes.coordinates);
  const fixedVersion = extractFixedVersion(issue.attributes.coordinates);

  const assetName = projectName ?? packageInfo.packageName ?? issue.attributes.key;

  return {
    title: issue.attributes.title,
    description: issue.attributes.description ?? `Snyk issue: ${issue.attributes.title}`,
    cveIds,
    cweIds,
    severity: mapSeverity(issue.attributes.effective_severity_level),
    cvssScore,
    cvssVector,
    cvssVersion,
    scannerType: 'snyk',
    scannerName: 'Snyk',
    assetName,
    assetType: issue.attributes.type === 'package_vulnerability' ? 'package' : issue.attributes.type,
    packageName: packageInfo.packageName,
    packageVersion: packageInfo.packageVersion,
    fixedVersion,
    rawObservations: {
      snykIssueId: issue.id,
      snykKey: issue.attributes.key,
      issueType: issue.attributes.type,
      status: issue.attributes.status,
      tool: issue.attributes.tool,
      problems: issue.attributes.problems,
      exploit: issue.attributes.slots?.exploit,
      classes: issue.attributes.classes,
    },
    discoveredAt: new Date(issue.attributes.created_at),
  };
}

/**
 * Map a batch of Snyk issues to CanonicalFindings.
 */
export function mapSnykBatch(
  issues: SnykIssue[],
  projectName?: string,
): CanonicalFinding[] {
  return issues.map((issue) => mapSnykIssue(issue, projectName));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractIds(problems: SnykProblem[], source: string): string[] {
  const ids = new Set<string>();
  for (const problem of problems) {
    if (problem.source === source && problem.id) {
      ids.add(problem.id);
    }
  }
  return [...ids];
}

function extractCvss(severities?: SnykSeverity[]): {
  cvssScore?: number;
  cvssVector?: string;
  cvssVersion?: string;
} {
  if (!severities?.length) return {};

  // Prefer CVSS v3 scores
  const cvss3 = severities.find((s) => s.vector?.startsWith('CVSS:3'));
  if (cvss3) {
    return {
      cvssScore: cvss3.score ?? undefined,
      cvssVector: cvss3.vector ?? undefined,
      cvssVersion: '3.x',
    };
  }

  // Fall back to any scored severity
  const scored = severities.find((s) => s.score !== undefined);
  if (scored) {
    return {
      cvssScore: scored.score,
      cvssVector: scored.vector ?? undefined,
    };
  }

  return {};
}

function extractPackageInfo(
  coordinates?: SnykCoordinate[],
): { packageName?: string; packageVersion?: string } {
  if (!coordinates?.length) return {};

  for (const coord of coordinates) {
    for (const repr of coord.representations) {
      if (repr.dependency) {
        return {
          packageName: repr.dependency.package_name,
          packageVersion: repr.dependency.package_version,
        };
      }
    }
  }

  return {};
}

function extractFixedVersion(coordinates?: SnykCoordinate[]): string | undefined {
  if (!coordinates?.length) return undefined;

  for (const coord of coordinates) {
    if (coord.remedies) {
      for (const remedy of coord.remedies) {
        if (remedy.details?.upgrade_package) {
          return remedy.details.upgrade_package;
        }
      }
    }
  }

  return undefined;
}
