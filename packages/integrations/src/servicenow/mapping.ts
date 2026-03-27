// ---------------------------------------------------------------------------
// ServiceNow Field Mapping (t109)
// ---------------------------------------------------------------------------

import type { CreateIncidentData } from './client';

/**
 * CVERiskPilot case fields used in ServiceNow mapping.
 */
export interface CaseFields {
  caseId: string;
  title: string;
  description?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: string;
  cvssScore?: number | null;
  epssScore?: number | null;
  kevListed?: boolean;
  cveIds?: string[];
  assignedTeam?: string;
  assignedUser?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Map CVERiskPilot severity to ServiceNow severity (1-4 scale).
 */
export function mapSeverityToSnSeverity(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return '1';
    case 'HIGH':
      return '2';
    case 'MEDIUM':
      return '3';
    case 'LOW':
    case 'INFO':
      return '4';
    default:
      return '3';
  }
}

/**
 * Map CVERiskPilot severity to ServiceNow priority (1-5 scale).
 */
export function mapSeverityToSnPriority(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return '1';
    case 'HIGH':
      return '2';
    case 'MEDIUM':
      return '3';
    case 'LOW':
      return '4';
    case 'INFO':
      return '5';
    default:
      return '3';
  }
}

/**
 * Map CVERiskPilot severity to ServiceNow impact (1-3 scale).
 */
export function mapSeverityToSnImpact(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
    case 'HIGH':
      return '1';
    case 'MEDIUM':
      return '2';
    case 'LOW':
    case 'INFO':
      return '3';
    default:
      return '2';
  }
}

/**
 * Map ServiceNow incident state to CVERiskPilot case status.
 */
export function mapSnStateToCaseStatus(snState: string): string {
  switch (snState) {
    case '1': // New
      return 'OPEN';
    case '2': // In Progress
      return 'IN_PROGRESS';
    case '3': // On Hold
      return 'ON_HOLD';
    case '6': // Resolved
      return 'RESOLVED';
    case '7': // Closed
      return 'CLOSED';
    case '8': // Canceled
      return 'CLOSED';
    default:
      return 'OPEN';
  }
}

/**
 * Map CVERiskPilot case status to ServiceNow incident state.
 */
export function mapCaseStatusToSnState(caseStatus: string): string {
  switch (caseStatus) {
    case 'OPEN':
    case 'NEW':
      return '1';
    case 'IN_PROGRESS':
    case 'TRIAGED':
      return '2';
    case 'ON_HOLD':
      return '3';
    case 'RESOLVED':
    case 'REMEDIATED':
      return '6';
    case 'CLOSED':
    case 'FALSE_POSITIVE':
    case 'RISK_ACCEPTED':
      return '7';
    default:
      return '1';
  }
}

/**
 * Build a ServiceNow description from CVERiskPilot case fields.
 */
function buildDescription(fields: CaseFields): string {
  const lines: string[] = [];

  lines.push(`[CVERiskPilot Case: ${fields.caseId}]`);
  lines.push('');

  if (fields.description) {
    lines.push(fields.description);
    lines.push('');
  }

  if (fields.cveIds && fields.cveIds.length > 0) {
    lines.push(`CVE IDs: ${fields.cveIds.join(', ')}`);
  }

  lines.push(`Severity: ${fields.severity}`);

  if (fields.cvssScore !== null && fields.cvssScore !== undefined) {
    lines.push(`CVSS Score: ${fields.cvssScore}`);
  }
  if (fields.epssScore !== null && fields.epssScore !== undefined) {
    lines.push(`EPSS Score: ${fields.epssScore}`);
  }
  if (fields.kevListed) {
    lines.push('KEV Listed: Yes (Known Exploited Vulnerability)');
  }

  return lines.join('\n');
}

/**
 * Map a CVERiskPilot case to ServiceNow incident creation data.
 */
export function mapCaseToIncident(fields: CaseFields): CreateIncidentData {
  return {
    short_description: `[CVERiskPilot] ${fields.title}`.slice(0, 160),
    description: buildDescription(fields),
    category: 'Security',
    subcategory: 'Vulnerability',
    severity: mapSeverityToSnSeverity(fields.severity),
    priority: mapSeverityToSnPriority(fields.severity),
    impact: mapSeverityToSnImpact(fields.severity),
    urgency: mapSeverityToSnImpact(fields.severity),
  };
}

/**
 * Map a ServiceNow incident update back to CVERiskPilot case fields.
 */
export function mapIncidentToCase(incident: {
  state: string;
  assigned_to?: string;
  resolved_at?: string | null;
  closed_at?: string | null;
}): { status: string; resolvedAt?: string | null; closedAt?: string | null } {
  return {
    status: mapSnStateToCaseStatus(incident.state),
    resolvedAt: incident.resolved_at ?? null,
    closedAt: incident.closed_at ?? null,
  };
}
