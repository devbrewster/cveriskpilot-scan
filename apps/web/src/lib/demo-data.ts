// Demo data for the public demo experience
// All data is simulated and represents a realistic enterprise vulnerability posture

import type {
  Severity,
  CaseStatus,
  ScannerType,
  ParserFormat,
  UploadJobStatus,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------
export const demoStats = {
  severityCounts: {
    CRITICAL: 12,
    HIGH: 47,
    MEDIUM: 156,
    LOW: 289,
    INFO: 83,
  } as Record<Severity, number>,
  totalFindings: 587,
  totalCases: 203,
  openCases: 147,
  kevVulnerabilities: 8,
  kevCount: 8,
  avgEpss: 0.34,
  mttr: 4.2, // days
};

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------
export interface DemoFinding {
  id: string;
  title: string;
  severity: Severity;
  status: CaseStatus;
  cveId: string;
  cvssScore: number;
  epssScore: number;
  epssPercentile: number;
  kevListed: boolean;
  scannerType: ScannerType;
  assetName: string;
  discoveredAt: string;
  parserFormat: ParserFormat;
}

export const demoFindings: DemoFinding[] = [
  {
    id: 'f-001',
    title: 'XZ Utils Backdoor — Malicious Code in liblzma',
    severity: 'CRITICAL',
    status: 'IN_REMEDIATION',
    cveId: 'CVE-2024-3094',
    cvssScore: 10.0,
    epssScore: 0.957,
    epssPercentile: 0.998,
    kevListed: true,
    scannerType: 'SCA',
    assetName: 'prod-api-01.acmecorp.io',
    discoveredAt: '2024-03-29T08:12:00Z',
    parserFormat: 'CYCLONEDX',
  },
  {
    id: 'f-002',
    title: 'Fortinet FortiOS SSL VPN — Out-of-Bounds Write RCE',
    severity: 'CRITICAL',
    status: 'IN_REMEDIATION',
    cveId: 'CVE-2024-21762',
    cvssScore: 9.8,
    epssScore: 0.943,
    epssPercentile: 0.997,
    kevListed: true,
    scannerType: 'VM',
    assetName: 'fw-edge-01.acmecorp.io',
    discoveredAt: '2024-02-09T14:30:00Z',
    parserFormat: 'NESSUS',
  },
  {
    id: 'f-003',
    title: 'HTTP/2 Rapid Reset DDoS Attack Vector',
    severity: 'HIGH',
    status: 'TRIAGE',
    cveId: 'CVE-2023-44487',
    cvssScore: 7.5,
    epssScore: 0.822,
    epssPercentile: 0.981,
    kevListed: true,
    scannerType: 'DAST',
    assetName: 'lb-public-01.acmecorp.io',
    discoveredAt: '2024-01-15T10:00:00Z',
    parserFormat: 'SARIF',
  },
  {
    id: 'f-004',
    title: 'Apache Log4j Remote Code Execution (Log4Shell)',
    severity: 'CRITICAL',
    status: 'VERIFIED_CLOSED',
    cveId: 'CVE-2021-44228',
    cvssScore: 10.0,
    epssScore: 0.976,
    epssPercentile: 0.999,
    kevListed: true,
    scannerType: 'SCA',
    assetName: 'app-backend-03.acmecorp.io',
    discoveredAt: '2023-12-10T16:45:00Z',
    parserFormat: 'CYCLONEDX',
  },
  {
    id: 'f-005',
    title: 'Citrix NetScaler ADC — Unauthenticated RCE (CitrixBleed)',
    severity: 'CRITICAL',
    status: 'IN_REMEDIATION',
    cveId: 'CVE-2023-4966',
    cvssScore: 9.4,
    epssScore: 0.961,
    epssPercentile: 0.998,
    kevListed: true,
    scannerType: 'VM',
    assetName: 'vpn-gateway.acmecorp.io',
    discoveredAt: '2023-10-18T09:20:00Z',
    parserFormat: 'NESSUS',
  },
  {
    id: 'f-006',
    title: 'Confluence Data Center — Broken Access Control RCE',
    severity: 'CRITICAL',
    status: 'TRIAGE',
    cveId: 'CVE-2023-22515',
    cvssScore: 10.0,
    epssScore: 0.913,
    epssPercentile: 0.993,
    kevListed: true,
    scannerType: 'DAST',
    assetName: 'confluence.internal.acmecorp.io',
    discoveredAt: '2023-10-05T11:05:00Z',
    parserFormat: 'SARIF',
  },
  {
    id: 'f-007',
    title: 'MOVEit Transfer SQL Injection — Data Exfiltration',
    severity: 'CRITICAL',
    status: 'VERIFIED_CLOSED',
    cveId: 'CVE-2023-34362',
    cvssScore: 9.8,
    epssScore: 0.952,
    epssPercentile: 0.998,
    kevListed: true,
    scannerType: 'DAST',
    assetName: 'filetransfer.acmecorp.io',
    discoveredAt: '2023-06-01T07:30:00Z',
    parserFormat: 'QUALYS',
  },
  {
    id: 'f-008',
    title: 'Spring Framework RCE via Data Binding (Spring4Shell)',
    severity: 'CRITICAL',
    status: 'VERIFIED_CLOSED',
    cveId: 'CVE-2022-22965',
    cvssScore: 9.8,
    epssScore: 0.975,
    epssPercentile: 0.999,
    kevListed: true,
    scannerType: 'SCA',
    assetName: 'svc-orders-02.acmecorp.io',
    discoveredAt: '2023-04-12T13:15:00Z',
    parserFormat: 'CYCLONEDX',
  },
  {
    id: 'f-009',
    title: 'OpenSSL X.509 Certificate Verification Buffer Overread',
    severity: 'HIGH',
    status: 'NEW',
    cveId: 'CVE-2022-3602',
    cvssScore: 7.5,
    epssScore: 0.487,
    epssPercentile: 0.942,
    kevListed: false,
    scannerType: 'SCA',
    assetName: 'proxy-internal-01.acmecorp.io',
    discoveredAt: '2024-02-28T18:00:00Z',
    parserFormat: 'OSV',
  },
  {
    id: 'f-010',
    title: 'PostgreSQL COPY FROM PROGRAM Privilege Escalation',
    severity: 'HIGH',
    status: 'IN_REMEDIATION',
    cveId: 'CVE-2019-9193',
    cvssScore: 7.2,
    epssScore: 0.312,
    epssPercentile: 0.891,
    kevListed: false,
    scannerType: 'VM',
    assetName: 'db-primary-01.acmecorp.io',
    discoveredAt: '2024-03-05T21:10:00Z',
    parserFormat: 'NESSUS',
  },
  {
    id: 'f-011',
    title: 'Node.js undici HTTP Request Smuggling',
    severity: 'MEDIUM',
    status: 'NEW',
    cveId: 'CVE-2024-24758',
    cvssScore: 5.3,
    epssScore: 0.104,
    epssPercentile: 0.712,
    kevListed: false,
    scannerType: 'SCA',
    assetName: 'app-frontend-01.acmecorp.io',
    discoveredAt: '2024-03-10T14:22:00Z',
    parserFormat: 'CYCLONEDX',
  },
  {
    id: 'f-012',
    title: 'Docker Container Escape via runc (Leaky Vessels)',
    severity: 'HIGH',
    status: 'TRIAGE',
    cveId: 'CVE-2024-21626',
    cvssScore: 8.6,
    epssScore: 0.728,
    epssPercentile: 0.968,
    kevListed: false,
    scannerType: 'CONTAINER',
    assetName: 'k8s-node-04.acmecorp.io',
    discoveredAt: '2024-02-01T09:45:00Z',
    parserFormat: 'JSON_FORMAT',
  },
  {
    id: 'f-013',
    title: 'Terraform AWS Provider — IAM Role Assumption Bypass',
    severity: 'MEDIUM',
    status: 'ACCEPTED_RISK',
    cveId: 'CVE-2024-27289',
    cvssScore: 6.5,
    epssScore: 0.078,
    epssPercentile: 0.631,
    kevListed: false,
    scannerType: 'IAC',
    assetName: 'infra-terraform-repo',
    discoveredAt: '2024-03-08T16:30:00Z',
    parserFormat: 'SARIF',
  },
  {
    id: 'f-014',
    title: 'jQuery Prototype Pollution via $.extend()',
    severity: 'LOW',
    status: 'ACCEPTED_RISK',
    cveId: 'CVE-2019-11358',
    cvssScore: 3.7,
    epssScore: 0.021,
    epssPercentile: 0.385,
    kevListed: false,
    scannerType: 'SCA',
    assetName: 'legacy-portal.acmecorp.io',
    discoveredAt: '2024-01-22T11:00:00Z',
    parserFormat: 'CYCLONEDX',
  },
  {
    id: 'f-015',
    title: 'SSH Server CBC Mode Information Disclosure',
    severity: 'LOW',
    status: 'NEW',
    cveId: 'CVE-2008-5161',
    cvssScore: 2.6,
    epssScore: 0.009,
    epssPercentile: 0.218,
    kevListed: false,
    scannerType: 'VM',
    assetName: 'bastion-01.acmecorp.io',
    discoveredAt: '2024-03-14T08:55:00Z',
    parserFormat: 'NESSUS',
  },
];

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------
export interface DemoCase {
  id: string;
  title: string;
  severity: Severity;
  status: CaseStatus;
  cveId: string;
  cvssScore: number;
  epssScore: number;
  kevListed: boolean;
  assignedTo: string;
  findingCount: number;
  createdAt: string;
}

export const demoCases: DemoCase[] = [
  {
    id: 'c-001',
    title: 'XZ Utils Backdoor — Supply Chain Compromise',
    severity: 'CRITICAL',
    status: 'IN_REMEDIATION',
    cveId: 'CVE-2024-3094',
    cvssScore: 10.0,
    epssScore: 0.957,
    kevListed: true,
    assignedTo: 'Maria Chen',
    findingCount: 14,
    createdAt: '2024-03-29T08:30:00Z',
  },
  {
    id: 'c-002',
    title: 'Fortinet SSL VPN Out-of-Bounds Write',
    severity: 'CRITICAL',
    status: 'IN_REMEDIATION',
    cveId: 'CVE-2024-21762',
    cvssScore: 9.8,
    epssScore: 0.943,
    kevListed: true,
    assignedTo: 'James Walker',
    findingCount: 3,
    createdAt: '2024-02-09T15:00:00Z',
  },
  {
    id: 'c-003',
    title: 'HTTP/2 Rapid Reset — DoS across Load Balancers',
    severity: 'HIGH',
    status: 'TRIAGE',
    cveId: 'CVE-2023-44487',
    cvssScore: 7.5,
    epssScore: 0.822,
    kevListed: true,
    assignedTo: 'Sarah Kim',
    findingCount: 7,
    createdAt: '2024-01-16T10:15:00Z',
  },
  {
    id: 'c-004',
    title: 'CitrixBleed — NetScaler Session Hijack',
    severity: 'CRITICAL',
    status: 'NEW',
    cveId: 'CVE-2023-4966',
    cvssScore: 9.4,
    epssScore: 0.961,
    kevListed: true,
    assignedTo: 'Unassigned',
    findingCount: 2,
    createdAt: '2023-10-18T09:30:00Z',
  },
  {
    id: 'c-005',
    title: 'Confluence RCE — Broken Access Control',
    severity: 'CRITICAL',
    status: 'TRIAGE',
    cveId: 'CVE-2023-22515',
    cvssScore: 10.0,
    epssScore: 0.913,
    kevListed: true,
    assignedTo: 'David Park',
    findingCount: 4,
    createdAt: '2023-10-06T11:30:00Z',
  },
  {
    id: 'c-006',
    title: 'Log4Shell — Legacy App Instances',
    severity: 'CRITICAL',
    status: 'VERIFIED_CLOSED',
    cveId: 'CVE-2021-44228',
    cvssScore: 10.0,
    epssScore: 0.976,
    kevListed: true,
    assignedTo: 'Maria Chen',
    findingCount: 47,
    createdAt: '2023-12-11T08:00:00Z',
  },
  {
    id: 'c-007',
    title: 'Docker runc Container Escape (Leaky Vessels)',
    severity: 'HIGH',
    status: 'IN_REMEDIATION',
    cveId: 'CVE-2024-21626',
    cvssScore: 8.6,
    epssScore: 0.728,
    kevListed: false,
    assignedTo: 'James Walker',
    findingCount: 11,
    createdAt: '2024-02-02T10:00:00Z',
  },
  {
    id: 'c-008',
    title: 'PostgreSQL COPY Privilege Escalation',
    severity: 'HIGH',
    status: 'ACCEPTED_RISK',
    cveId: 'CVE-2019-9193',
    cvssScore: 7.2,
    epssScore: 0.312,
    kevListed: false,
    assignedTo: 'Sarah Kim',
    findingCount: 5,
    createdAt: '2024-03-06T21:30:00Z',
  },
  {
    id: 'c-009',
    title: 'MOVEit Transfer SQLi — File Exfil Risk',
    severity: 'CRITICAL',
    status: 'VERIFIED_CLOSED',
    cveId: 'CVE-2023-34362',
    cvssScore: 9.8,
    epssScore: 0.952,
    kevListed: true,
    assignedTo: 'David Park',
    findingCount: 8,
    createdAt: '2023-06-02T08:00:00Z',
  },
  {
    id: 'c-010',
    title: 'Terraform IAM Role Assumption Bypass',
    severity: 'MEDIUM',
    status: 'ACCEPTED_RISK',
    cveId: 'CVE-2024-27289',
    cvssScore: 6.5,
    epssScore: 0.078,
    kevListed: false,
    assignedTo: 'James Walker',
    findingCount: 2,
    createdAt: '2024-03-09T16:45:00Z',
  },
];

// ---------------------------------------------------------------------------
// EPSS Top 10 (sorted by epssScore descending)
// ---------------------------------------------------------------------------
export const demoEpssTop10 = [...demoCases]
  .sort((a, b) => b.epssScore - a.epssScore)
  .slice(0, 10);

// ---------------------------------------------------------------------------
// Recent scans / upload jobs
// ---------------------------------------------------------------------------
export interface DemoRecentScan {
  id: string;
  filename: string;
  status: UploadJobStatus;
  parserFormat: ParserFormat;
  totalFindings: number;
  findingsCreated: number;
  casesCreated: number;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

export const demoRecentScans: DemoRecentScan[] = [
  {
    id: 'scan-001',
    filename: 'nessus-weekly-2024-03-15.nessus',
    status: 'COMPLETED',
    parserFormat: 'NESSUS',
    totalFindings: 142,
    findingsCreated: 142,
    casesCreated: 18,
    createdAt: '2024-03-15T02:00:00Z',
    completedAt: '2024-03-15T02:04:32Z',
    errorMessage: null,
  },
  {
    id: 'scan-002',
    filename: 'sonarqube-report.sarif',
    status: 'COMPLETED',
    parserFormat: 'SARIF',
    totalFindings: 67,
    findingsCreated: 67,
    casesCreated: 9,
    createdAt: '2024-03-14T09:30:00Z',
    completedAt: '2024-03-14T09:31:15Z',
    errorMessage: null,
  },
  {
    id: 'scan-003',
    filename: 'trivy-containers-2024-03-13.json',
    status: 'COMPLETED',
    parserFormat: 'JSON_FORMAT',
    totalFindings: 93,
    findingsCreated: 93,
    casesCreated: 12,
    createdAt: '2024-03-13T18:15:00Z',
    completedAt: '2024-03-13T18:16:48Z',
    errorMessage: null,
  },
  {
    id: 'scan-004',
    filename: 'dependency-track-sbom.cdx.json',
    status: 'COMPLETED',
    parserFormat: 'CYCLONEDX',
    totalFindings: 214,
    findingsCreated: 214,
    casesCreated: 31,
    createdAt: '2024-03-12T06:00:00Z',
    completedAt: '2024-03-12T06:03:22Z',
    errorMessage: null,
  },
  {
    id: 'scan-005',
    filename: 'qualys-perimeter-scan-q1.xml',
    status: 'COMPLETED',
    parserFormat: 'QUALYS',
    totalFindings: 71,
    findingsCreated: 71,
    casesCreated: 8,
    createdAt: '2024-03-10T22:45:00Z',
    completedAt: '2024-03-10T22:47:10Z',
    errorMessage: null,
  },
];

// ---------------------------------------------------------------------------
// SLA metrics
// ---------------------------------------------------------------------------
export const demoSlaMetrics = {
  breached: 3,
  approaching: 7,
  atRisk: 7,
  onTrack: 137,
  breachBySeverity: {
    CRITICAL: 1,
    HIGH: 1,
    MEDIUM: 1,
  } as Record<string, number>,
};

// ---------------------------------------------------------------------------
// Compliance scores
// ---------------------------------------------------------------------------
export const demoComplianceScores = [
  { framework: 'SOC2', score: 78 },
  { framework: 'SSDF', score: 82 },
  { framework: 'ASVS', score: 71 },
];

// ---------------------------------------------------------------------------
// Activity timeline
// ---------------------------------------------------------------------------
export interface DemoTimelineEntry {
  id: string;
  type: 'scan' | 'case' | 'remediation' | 'alert' | 'kev' | 'policy';
  title: string;
  description?: string;
  timestamp: string;
}

export const demoTimeline: DemoTimelineEntry[] = [
  {
    id: 'tl-001',
    type: 'scan',
    title: 'Nessus weekly scan uploaded',
    description: '142 findings ingested from nessus-weekly-2024-03-15.nessus',
    timestamp: '2024-03-15T02:05:00Z',
  },
  {
    id: 'tl-002',
    type: 'kev',
    title: 'New critical case: XZ Utils Backdoor (CVE-2024-3094)',
    description: 'KEV listed — assigned to Maria Chen for emergency triage',
    timestamp: '2024-03-29T08:30:00Z',
  },
  {
    id: 'tl-003',
    type: 'remediation',
    title: 'Log4Shell remediation verified',
    description: 'All 47 findings for CVE-2021-44228 verified closed',
    timestamp: '2024-03-12T16:20:00Z',
  },
  {
    id: 'tl-004',
    type: 'alert',
    title: 'SLA breached: CitrixBleed (CVE-2023-4966)',
    description: 'Critical severity — 162 days overdue',
    timestamp: '2024-03-28T00:00:00Z',
  },
  {
    id: 'tl-005',
    type: 'case',
    title: 'Fortinet SSL VPN case assigned to James Walker',
    description: 'Emergency patching scheduled for next maintenance window',
    timestamp: '2024-02-09T15:10:00Z',
  },
  {
    id: 'tl-006',
    type: 'case',
    title: 'HTTP/2 Rapid Reset moved to TRIAGE',
    description: 'Impact assessment underway across load balancers',
    timestamp: '2024-01-17T09:00:00Z',
  },
  {
    id: 'tl-007',
    type: 'policy',
    title: 'Risk accepted: jQuery Prototype Pollution',
    description: 'CVE-2019-11358 — legacy portal scheduled for EOL Q2',
    timestamp: '2024-03-01T14:30:00Z',
  },
  {
    id: 'tl-008',
    type: 'remediation',
    title: 'MOVEit Transfer SQLi remediation verified',
    description: 'CVE-2023-34362 — case closed after patch verification',
    timestamp: '2024-02-28T11:45:00Z',
  },
];
