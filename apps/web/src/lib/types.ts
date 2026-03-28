// Shared domain types for the web application

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type CaseStatus =
  | 'NEW'
  | 'TRIAGE'
  | 'IN_REMEDIATION'
  | 'FIXED_PENDING_VERIFICATION'
  | 'VERIFIED_CLOSED'
  | 'REOPENED'
  | 'ACCEPTED_RISK'
  | 'FALSE_POSITIVE'
  | 'NOT_APPLICABLE'
  | 'DUPLICATE';

export type ScannerType =
  | 'SCA'
  | 'SAST'
  | 'DAST'
  | 'IAC'
  | 'CONTAINER'
  | 'VM'
  | 'BUG_BOUNTY';

export type UploadJobStatus =
  | 'QUEUED'
  | 'PARSING'
  | 'ENRICHING'
  | 'BUILDING_CASES'
  | 'COMPLETED'
  | 'FAILED';

export type ParserFormat =
  | 'NESSUS'
  | 'SARIF'
  | 'CSV'
  | 'JSON_FORMAT'
  | 'CYCLONEDX'
  | 'OSV'
  | 'SPDX'
  | 'CSAF'
  | 'QUALYS'
  | 'OPENVAS';

export interface VulnerabilityCase {
  id: string;
  title: string;
  cveIds: string[];
  severity: Severity;
  cvssScore: number | null;
  epssScore: number | null;
  epssPercentile: number | null;
  kevListed: boolean;
  kevDueDate: string | null;
  status: CaseStatus;
  findingCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface UploadJob {
  id: string;
  filename: string;
  parserFormat: ParserFormat;
  status: UploadJobStatus;
  totalFindings: number;
  findingsCreated: number;
  casesCreated: number;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

/** Shape of a finding returned by GET /api/findings */
export interface ApiFinding {
  id: string;
  organizationId: string;
  clientId: string;
  assetId: string;
  scannerType: ScannerType;
  scannerName: string;
  discoveredAt: string;
  createdAt: string;
  asset: {
    id: string;
    name: string;
    type: string;
    environment: string;
    criticality: string;
  } | null;
  vulnerabilityCase: {
    id: string;
    title: string;
    severity: Severity;
    status: CaseStatus;
    cveIds: string[];
    epssScore: number | null;
    kevListed: boolean;
  } | null;
}

/** Shape returned by GET /api/findings */
export interface FindingsApiResponse {
  findings: ApiFinding[];
  total: number;
  page: number;
  totalPages: number;
}

/** Shape returned by the GET /api/dashboard endpoint */
export interface DashboardApiResponse {
  severityCounts: Record<string, number>;
  kevCount: number;
  epssTop10: Array<{
    id: string;
    title: string;
    cveIds: string[];
    severity: Severity;
    epssScore: number | null;
    epssPercentile: number | null;
    kevListed: boolean;
    status: CaseStatus;
  }>;
  recentScans: Array<{
    id: string;
    status: UploadJobStatus;
    totalFindings: number | null;
    findingsCreated: number | null;
    casesCreated: number | null;
    createdAt: string;
    completedAt: string | null;
    errorMessage: string | null;
    artifact: {
      filename: string;
      parserFormat: ParserFormat;
    } | null;
  }>;
  totalFindings: number;
  totalCases: number;
  nearestKevDueDate: string | null;
}
