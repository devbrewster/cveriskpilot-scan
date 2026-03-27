// Mock data for dashboard development
// Replace with real API calls when backend is ready

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

export interface DashboardStats {
  totalCases: number;
  criticalHighCases: number;
  kevListedCount: number;
  avgEpssScore: number;
  totalCasesTrend: number;
  criticalHighTrend: number;
  kevTrend: number;
  epssTrend: number;
}

export const mockCases: VulnerabilityCase[] = [
  {
    id: 'case-001',
    title: 'Remote Code Execution in Apache Log4j',
    cveIds: ['CVE-2021-44228'],
    severity: 'CRITICAL',
    cvssScore: 10.0,
    epssScore: 0.976,
    epssPercentile: 0.999,
    kevListed: true,
    kevDueDate: '2026-04-10',
    status: 'IN_REMEDIATION',
    findingCount: 47,
    firstSeenAt: '2026-03-01T10:00:00Z',
    lastSeenAt: '2026-03-26T14:30:00Z',
  },
  {
    id: 'case-002',
    title: 'SQL Injection in Authentication Module',
    cveIds: ['CVE-2024-23456'],
    severity: 'CRITICAL',
    cvssScore: 9.8,
    epssScore: 0.891,
    epssPercentile: 0.987,
    kevListed: true,
    kevDueDate: '2026-04-15',
    status: 'NEW',
    findingCount: 12,
    firstSeenAt: '2026-03-20T08:00:00Z',
    lastSeenAt: '2026-03-26T16:00:00Z',
  },
  {
    id: 'case-003',
    title: 'Privilege Escalation in Linux Kernel',
    cveIds: ['CVE-2024-1086'],
    severity: 'HIGH',
    cvssScore: 7.8,
    epssScore: 0.823,
    epssPercentile: 0.972,
    kevListed: true,
    kevDueDate: '2026-04-20',
    status: 'TRIAGE',
    findingCount: 8,
    firstSeenAt: '2026-03-15T12:00:00Z',
    lastSeenAt: '2026-03-25T09:00:00Z',
  },
  {
    id: 'case-004',
    title: 'Cross-Site Scripting in React Component',
    cveIds: ['CVE-2025-10234'],
    severity: 'HIGH',
    cvssScore: 7.5,
    epssScore: 0.654,
    epssPercentile: 0.923,
    kevListed: false,
    kevDueDate: null,
    status: 'IN_REMEDIATION',
    findingCount: 23,
    firstSeenAt: '2026-03-10T14:00:00Z',
    lastSeenAt: '2026-03-26T11:00:00Z',
  },
  {
    id: 'case-005',
    title: 'Server-Side Request Forgery in API Gateway',
    cveIds: ['CVE-2025-20567'],
    severity: 'HIGH',
    cvssScore: 8.1,
    epssScore: 0.712,
    epssPercentile: 0.945,
    kevListed: false,
    kevDueDate: null,
    status: 'NEW',
    findingCount: 5,
    firstSeenAt: '2026-03-22T09:00:00Z',
    lastSeenAt: '2026-03-26T10:00:00Z',
  },
  {
    id: 'case-006',
    title: 'Deserialization Vulnerability in Jackson',
    cveIds: ['CVE-2025-31890'],
    severity: 'HIGH',
    cvssScore: 7.2,
    epssScore: 0.534,
    epssPercentile: 0.891,
    kevListed: false,
    kevDueDate: null,
    status: 'FIXED_PENDING_VERIFICATION',
    findingCount: 15,
    firstSeenAt: '2026-02-28T16:00:00Z',
    lastSeenAt: '2026-03-20T08:00:00Z',
  },
  {
    id: 'case-007',
    title: 'Buffer Overflow in OpenSSL',
    cveIds: ['CVE-2025-40123'],
    severity: 'CRITICAL',
    cvssScore: 9.1,
    epssScore: 0.789,
    epssPercentile: 0.965,
    kevListed: false,
    kevDueDate: null,
    status: 'TRIAGE',
    findingCount: 31,
    firstSeenAt: '2026-03-18T07:00:00Z',
    lastSeenAt: '2026-03-26T15:00:00Z',
  },
  {
    id: 'case-008',
    title: 'Path Traversal in File Upload Handler',
    cveIds: ['CVE-2025-15678'],
    severity: 'MEDIUM',
    cvssScore: 6.5,
    epssScore: 0.412,
    epssPercentile: 0.834,
    kevListed: false,
    kevDueDate: null,
    status: 'IN_REMEDIATION',
    findingCount: 3,
    firstSeenAt: '2026-03-12T11:00:00Z',
    lastSeenAt: '2026-03-25T13:00:00Z',
  },
  {
    id: 'case-009',
    title: 'Denial of Service in Nginx Configuration',
    cveIds: ['CVE-2025-22345'],
    severity: 'MEDIUM',
    cvssScore: 5.9,
    epssScore: 0.321,
    epssPercentile: 0.778,
    kevListed: false,
    kevDueDate: null,
    status: 'ACCEPTED_RISK',
    findingCount: 2,
    firstSeenAt: '2026-03-05T10:00:00Z',
    lastSeenAt: '2026-03-24T12:00:00Z',
  },
  {
    id: 'case-010',
    title: 'Information Disclosure via Error Messages',
    cveIds: ['CVE-2025-33456'],
    severity: 'MEDIUM',
    cvssScore: 5.3,
    epssScore: 0.198,
    epssPercentile: 0.654,
    kevListed: false,
    kevDueDate: null,
    status: 'VERIFIED_CLOSED',
    findingCount: 7,
    firstSeenAt: '2026-02-20T09:00:00Z',
    lastSeenAt: '2026-03-15T10:00:00Z',
  },
  {
    id: 'case-011',
    title: 'Insecure Direct Object Reference in API',
    cveIds: ['CVE-2025-44567'],
    severity: 'HIGH',
    cvssScore: 7.5,
    epssScore: 0.567,
    epssPercentile: 0.901,
    kevListed: false,
    kevDueDate: null,
    status: 'NEW',
    findingCount: 9,
    firstSeenAt: '2026-03-24T08:00:00Z',
    lastSeenAt: '2026-03-26T16:30:00Z',
  },
  {
    id: 'case-012',
    title: 'Weak Cryptographic Algorithm Usage',
    cveIds: ['CVE-2025-55678'],
    severity: 'LOW',
    cvssScore: 3.7,
    epssScore: 0.089,
    epssPercentile: 0.432,
    kevListed: false,
    kevDueDate: null,
    status: 'FALSE_POSITIVE',
    findingCount: 4,
    firstSeenAt: '2026-03-08T14:00:00Z',
    lastSeenAt: '2026-03-22T11:00:00Z',
  },
  {
    id: 'case-013',
    title: 'Missing HTTP Security Headers',
    cveIds: [],
    severity: 'LOW',
    cvssScore: 3.1,
    epssScore: 0.045,
    epssPercentile: 0.287,
    kevListed: false,
    kevDueDate: null,
    status: 'IN_REMEDIATION',
    findingCount: 18,
    firstSeenAt: '2026-03-01T12:00:00Z',
    lastSeenAt: '2026-03-26T09:00:00Z',
  },
  {
    id: 'case-014',
    title: 'Outdated TLS Configuration',
    cveIds: [],
    severity: 'INFO',
    cvssScore: null,
    epssScore: null,
    epssPercentile: null,
    kevListed: false,
    kevDueDate: null,
    status: 'NOT_APPLICABLE',
    findingCount: 2,
    firstSeenAt: '2026-03-15T10:00:00Z',
    lastSeenAt: '2026-03-20T14:00:00Z',
  },
  {
    id: 'case-015',
    title: 'Container Image Running as Root',
    cveIds: [],
    severity: 'MEDIUM',
    cvssScore: 5.5,
    epssScore: 0.156,
    epssPercentile: 0.589,
    kevListed: false,
    kevDueDate: null,
    status: 'REOPENED',
    findingCount: 11,
    firstSeenAt: '2026-02-25T08:00:00Z',
    lastSeenAt: '2026-03-26T12:00:00Z',
  },
  {
    id: 'case-016',
    title: 'Authentication Bypass in Admin Panel',
    cveIds: ['CVE-2025-66789'],
    severity: 'CRITICAL',
    cvssScore: 9.8,
    epssScore: 0.934,
    epssPercentile: 0.993,
    kevListed: true,
    kevDueDate: '2026-04-05',
    status: 'IN_REMEDIATION',
    findingCount: 6,
    firstSeenAt: '2026-03-23T07:00:00Z',
    lastSeenAt: '2026-03-26T17:00:00Z',
  },
  {
    id: 'case-017',
    title: 'XML External Entity Injection',
    cveIds: ['CVE-2025-77890'],
    severity: 'HIGH',
    cvssScore: 7.0,
    epssScore: 0.478,
    epssPercentile: 0.856,
    kevListed: false,
    kevDueDate: null,
    status: 'TRIAGE',
    findingCount: 4,
    firstSeenAt: '2026-03-19T13:00:00Z',
    lastSeenAt: '2026-03-25T16:00:00Z',
  },
];

export const mockUploadJobs: UploadJob[] = [
  {
    id: 'job-001',
    filename: 'nessus-prod-scan-2026-03-26.nessus',
    parserFormat: 'NESSUS',
    status: 'COMPLETED',
    totalFindings: 342,
    findingsCreated: 287,
    casesCreated: 14,
    createdAt: '2026-03-26T14:30:00Z',
    completedAt: '2026-03-26T14:35:00Z',
    errorMessage: null,
  },
  {
    id: 'job-002',
    filename: 'github-sast-results.sarif',
    parserFormat: 'SARIF',
    status: 'COMPLETED',
    totalFindings: 89,
    findingsCreated: 67,
    casesCreated: 8,
    createdAt: '2026-03-26T10:15:00Z',
    completedAt: '2026-03-26T10:17:00Z',
    errorMessage: null,
  },
  {
    id: 'job-003',
    filename: 'container-scan-sbom.cyclonedx.json',
    parserFormat: 'CYCLONEDX',
    status: 'ENRICHING',
    totalFindings: 156,
    findingsCreated: 0,
    casesCreated: 0,
    createdAt: '2026-03-26T16:00:00Z',
    completedAt: null,
    errorMessage: null,
  },
  {
    id: 'job-004',
    filename: 'qualys-weekly-report.csv',
    parserFormat: 'QUALYS',
    status: 'FAILED',
    totalFindings: 0,
    findingsCreated: 0,
    casesCreated: 0,
    createdAt: '2026-03-25T22:00:00Z',
    completedAt: null,
    errorMessage: 'Invalid CSV format: missing required column "QID"',
  },
  {
    id: 'job-005',
    filename: 'openvas-staging-scan.csv',
    parserFormat: 'OPENVAS',
    status: 'QUEUED',
    totalFindings: 0,
    findingsCreated: 0,
    casesCreated: 0,
    createdAt: '2026-03-26T16:45:00Z',
    completedAt: null,
    errorMessage: null,
  },
];

export const mockStats: DashboardStats = {
  totalCases: 17,
  criticalHighCases: 11,
  kevListedCount: 4,
  avgEpssScore: 0.505,
  totalCasesTrend: 12.3,
  criticalHighTrend: 8.7,
  kevTrend: -25.0,
  epssTrend: 3.2,
};

export function getSeverityCounts(cases: VulnerabilityCase[]) {
  const counts: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };
  for (const c of cases) {
    counts[c.severity]++;
  }
  return counts;
}
