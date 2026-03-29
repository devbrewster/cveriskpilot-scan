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
export const demoComplianceScores: Record<string, number> = {
  SOC2: 78,
  SSDF: 82,
  ASVS: 71,
};

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

// ---------------------------------------------------------------------------
// Enriched finding details for drill-down pages
// ---------------------------------------------------------------------------
export interface DetailFinding {
  id: string;
  organizationId: string;
  clientId: string;
  assetId: string;
  scannerType: ScannerType;
  scannerName: string;
  observations: Record<string, unknown>;
  dedupKey: string;
  vulnerabilityCaseId: string | null;
  discoveredAt: string;
}

export interface DetailAsset {
  id: string;
  name: string;
  type: string;
  environment: string;
  criticality: string;
  internetExposed: boolean;
  tags: string[];
  findingCount: number;
}

export interface DetailVulnCase {
  id: string;
  organizationId: string;
  clientId: string;
  title: string;
  description: string;
  cveIds: string[];
  cweIds: string[];
  severity: Severity;
  cvssScore: number | null;
  cvssVector: string | null;
  cvssVersion: string | null;
  epssScore: number | null;
  epssPercentile: number | null;
  kevListed: boolean;
  kevDueDate: string | null;
  status: CaseStatus;
  assignedToId: string | null;
  dueAt: string | null;
  aiAdvisory: Record<string, unknown> | null;
  remediationNotes: string;
  findingCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

// ---------------------------------------------------------------------------
// Detail findings (enriched versions of f-001 through f-005)
// ---------------------------------------------------------------------------
export const demoDetailFindings: DetailFinding[] = [
  {
    id: 'f-001',
    organizationId: 'org-demo',
    clientId: 'client-demo',
    assetId: 'asset-001',
    scannerType: 'SCA',
    scannerName: 'Dependency-Track 4.10',
    observations: {
      package: 'xz-utils',
      installedVersion: '5.6.0',
      fixedVersion: '5.6.1',
      path: '/usr/lib/liblzma.so.5.6.0',
      confidence: 'HIGH',
      evidence: 'Backdoor code detected in build process via ifunc resolver',
    },
    dedupKey: 'CVE-2024-3094:prod-api-01.acmecorp.io:SCA',
    vulnerabilityCaseId: 'c-001',
    discoveredAt: '2024-03-29T08:12:00Z',
  },
  {
    id: 'f-002',
    organizationId: 'org-demo',
    clientId: 'client-demo',
    assetId: 'asset-002',
    scannerType: 'VM',
    scannerName: 'Nessus 10.7',
    observations: {
      pluginId: 190643,
      pluginName: 'Fortinet FortiOS SSL VPN Out-of-Bounds Write',
      port: 443,
      protocol: 'tcp',
      synopsis: 'The remote host is affected by an out-of-bounds write vulnerability.',
      pluginOutput: 'Installed version: 7.2.3\nFixed version: 7.2.7',
      seeAlso: 'https://www.fortiguard.com/psirt/FG-IR-24-015',
    },
    dedupKey: 'CVE-2024-21762:fw-edge-01.acmecorp.io:VM',
    vulnerabilityCaseId: 'c-002',
    discoveredAt: '2024-02-09T14:30:00Z',
  },
  {
    id: 'f-003',
    organizationId: 'org-demo',
    clientId: 'client-demo',
    assetId: 'asset-003',
    scannerType: 'DAST',
    scannerName: 'OWASP ZAP 2.14',
    observations: {
      ruleId: 'CVE-2023-44487',
      level: 'error',
      uri: 'https://lb-public-01.acmecorp.io',
      evidence: 'Server responded to rapid RST_STREAM frames without rate limiting',
      httpVersion: 'HTTP/2',
      concurrentStreams: 100,
      resetRate: '1000/s',
    },
    dedupKey: 'CVE-2023-44487:lb-public-01.acmecorp.io:DAST',
    vulnerabilityCaseId: 'c-003',
    discoveredAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'f-004',
    organizationId: 'org-demo',
    clientId: 'client-demo',
    assetId: 'asset-004',
    scannerType: 'SCA',
    scannerName: 'Trivy v0.50',
    observations: {
      package: 'org.apache.logging.log4j:log4j-core',
      installedVersion: '2.14.1',
      fixedVersion: '2.17.1',
      path: '/app/lib/log4j-core-2.14.1.jar',
      confidence: 'HIGH',
      evidence: 'JNDI lookup class present in classpath — vulnerable to RCE via crafted log messages',
    },
    dedupKey: 'CVE-2021-44228:app-backend-03.acmecorp.io:SCA',
    vulnerabilityCaseId: 'c-006',
    discoveredAt: '2023-12-10T16:45:00Z',
  },
  {
    id: 'f-005',
    organizationId: 'org-demo',
    clientId: 'client-demo',
    assetId: 'asset-005',
    scannerType: 'VM',
    scannerName: 'Nessus 10.7',
    observations: {
      pluginId: 186557,
      pluginName: 'Citrix NetScaler ADC Buffer Overflow (CitrixBleed)',
      port: 443,
      protocol: 'tcp',
      synopsis: 'The remote Citrix ADC is affected by a buffer overflow vulnerability.',
      pluginOutput: 'Installed version: 13.1-48.47\nFixed version: 13.1-49.15',
      seeAlso: 'https://support.citrix.com/article/CTX579459',
    },
    dedupKey: 'CVE-2023-4966:vpn-gateway.acmecorp.io:VM',
    vulnerabilityCaseId: 'c-004',
    discoveredAt: '2023-10-18T09:20:00Z',
  },
];

// ---------------------------------------------------------------------------
// Detail assets (20 realistic enterprise assets)
// ---------------------------------------------------------------------------
export const demoDetailAssets: DetailAsset[] = [
  // First 5 match demoFindings asset names
  {
    id: 'asset-001',
    name: 'prod-api-01.acmecorp.io',
    type: 'HOST',
    environment: 'Production',
    criticality: '5',
    internetExposed: false,
    tags: ['api', 'backend', 'node.js'],
    findingCount: 23,
  },
  {
    id: 'asset-002',
    name: 'fw-edge-01.acmecorp.io',
    type: 'HOST',
    environment: 'Production',
    criticality: '5',
    internetExposed: true,
    tags: ['firewall', 'fortinet', 'perimeter'],
    findingCount: 8,
  },
  {
    id: 'asset-003',
    name: 'lb-public-01.acmecorp.io',
    type: 'HOST',
    environment: 'Production',
    criticality: '4',
    internetExposed: true,
    tags: ['load-balancer', 'nginx', 'dmz'],
    findingCount: 14,
  },
  {
    id: 'asset-004',
    name: 'app-backend-03.acmecorp.io',
    type: 'HOST',
    environment: 'Production',
    criticality: '4',
    internetExposed: false,
    tags: ['java', 'spring', 'backend'],
    findingCount: 31,
  },
  {
    id: 'asset-005',
    name: 'vpn-gateway.acmecorp.io',
    type: 'HOST',
    environment: 'Production',
    criticality: '5',
    internetExposed: true,
    tags: ['vpn', 'citrix', 'remote-access'],
    findingCount: 5,
  },
  // 15 additional diverse assets
  {
    id: 'asset-006',
    name: 'k8s-node-04.acmecorp.io',
    type: 'HOST',
    environment: 'Production',
    criticality: '4',
    internetExposed: false,
    tags: ['kubernetes', 'docker', 'container-runtime'],
    findingCount: 19,
  },
  {
    id: 'asset-007',
    name: 'infra-terraform-repo',
    type: 'REPOSITORY',
    environment: 'Production',
    criticality: '3',
    internetExposed: false,
    tags: ['iac', 'terraform', 'aws'],
    findingCount: 7,
  },
  {
    id: 'asset-008',
    name: 'confluence.internal.acmecorp.io',
    type: 'APPLICATION',
    environment: 'Production',
    criticality: '4',
    internetExposed: false,
    tags: ['wiki', 'atlassian', 'collaboration'],
    findingCount: 12,
  },
  {
    id: 'asset-009',
    name: 'db-primary-01.acmecorp.io',
    type: 'HOST',
    environment: 'Production',
    criticality: '5',
    internetExposed: false,
    tags: ['database', 'postgresql', 'primary'],
    findingCount: 9,
  },
  {
    id: 'asset-010',
    name: 'acmecorp/api-gateway:latest',
    type: 'CONTAINER_IMAGE',
    environment: 'Production',
    criticality: '4',
    internetExposed: false,
    tags: ['docker', 'api', 'node.js'],
    findingCount: 16,
  },
  {
    id: 'asset-011',
    name: 'app-frontend-01.acmecorp.io',
    type: 'HOST',
    environment: 'Production',
    criticality: '3',
    internetExposed: true,
    tags: ['react', 'nextjs', 'frontend'],
    findingCount: 11,
  },
  {
    id: 'asset-012',
    name: 'staging-api.acmecorp.io',
    type: 'HOST',
    environment: 'Staging',
    criticality: '2',
    internetExposed: false,
    tags: ['api', 'staging', 'node.js'],
    findingCount: 28,
  },
  {
    id: 'asset-013',
    name: 'acmecorp-aws-prod',
    type: 'CLOUD_ACCOUNT',
    environment: 'Production',
    criticality: '5',
    internetExposed: false,
    tags: ['aws', 'cloud', 'multi-region'],
    findingCount: 34,
  },
  {
    id: 'asset-014',
    name: 'acmecorp/worker-service:v2.8',
    type: 'CONTAINER_IMAGE',
    environment: 'Production',
    criticality: '3',
    internetExposed: false,
    tags: ['docker', 'worker', 'python'],
    findingCount: 6,
  },
  {
    id: 'asset-015',
    name: 'legacy-portal.acmecorp.io',
    type: 'APPLICATION',
    environment: 'Production',
    criticality: '2',
    internetExposed: true,
    tags: ['legacy', 'jquery', 'php'],
    findingCount: 18,
  },
  {
    id: 'asset-016',
    name: 'dev-k8s-cluster.acmecorp.io',
    type: 'HOST',
    environment: 'Development',
    criticality: '1',
    internetExposed: false,
    tags: ['kubernetes', 'development', 'ephemeral'],
    findingCount: 42,
  },
  {
    id: 'asset-017',
    name: 'filetransfer.acmecorp.io',
    type: 'APPLICATION',
    environment: 'Production',
    criticality: '4',
    internetExposed: true,
    tags: ['moveit', 'file-transfer', 'sftp'],
    findingCount: 4,
  },
  {
    id: 'asset-018',
    name: 'acmecorp/frontend-app',
    type: 'REPOSITORY',
    environment: 'Production',
    criticality: '3',
    internetExposed: false,
    tags: ['github', 'react', 'typescript'],
    findingCount: 15,
  },
  {
    id: 'asset-019',
    name: 'bastion-01.acmecorp.io',
    type: 'HOST',
    environment: 'Production',
    criticality: '4',
    internetExposed: true,
    tags: ['ssh', 'bastion', 'jump-host'],
    findingCount: 3,
  },
  {
    id: 'asset-020',
    name: 'svc-orders-02.acmecorp.io',
    type: 'HOST',
    environment: 'Staging',
    criticality: '3',
    internetExposed: false,
    tags: ['java', 'spring-boot', 'microservice'],
    findingCount: 10,
  },
];

// ---------------------------------------------------------------------------
// Detail vulnerability cases (enriched versions of c-001 through c-005)
// ---------------------------------------------------------------------------
export const demoDetailCases: DetailVulnCase[] = [
  {
    id: 'c-001',
    organizationId: 'org-demo',
    clientId: 'client-demo',
    title: 'XZ Utils Backdoor — Supply Chain Compromise',
    description:
      'A malicious backdoor was discovered in xz-utils versions 5.6.0 and 5.6.1, introduced through a sophisticated supply chain attack targeting the build process. The backdoor modifies liblzma to intercept and manipulate SSH authentication via systemd.',
    cveIds: ['CVE-2024-3094'],
    cweIds: ['CWE-506'],
    severity: 'CRITICAL',
    cvssScore: 10.0,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
    cvssVersion: '3.1',
    epssScore: 0.957,
    epssPercentile: 0.998,
    kevListed: true,
    kevDueDate: '2024-04-12T00:00:00Z',
    status: 'IN_REMEDIATION',
    assignedToId: 'user-001',
    dueAt: '2024-04-05T00:00:00Z',
    aiAdvisory: {
      summary:
        'Critical supply chain backdoor in xz-utils affecting liblzma. The malicious code intercepts RSA key verification in OpenSSH via systemd integration, enabling unauthorized remote access. Immediate downgrade or removal is required.',
      recommendation:
        'Downgrade xz-utils to version 5.4.6 or earlier immediately. Audit all systems for signs of compromise. Review SSH logs for anomalous authentication patterns. Rebuild any container images that include affected versions.',
      references: [
        'https://nvd.nist.gov/vuln/detail/CVE-2024-3094',
        'https://www.openwall.com/lists/oss-security/2024/03/29/4',
        'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
      ],
      generatedAt: '2024-03-29T10:00:00Z',
    },
    remediationNotes: '',
    findingCount: 14,
    firstSeenAt: '2024-03-29T08:12:00Z',
    lastSeenAt: '2024-03-29T08:12:00Z',
  },
  {
    id: 'c-002',
    organizationId: 'org-demo',
    clientId: 'client-demo',
    title: 'Fortinet SSL VPN Out-of-Bounds Write',
    description:
      'An out-of-bounds write vulnerability in Fortinet FortiOS SSL VPN allows a remote unauthenticated attacker to execute arbitrary code via specially crafted HTTP requests. Actively exploited in the wild.',
    cveIds: ['CVE-2024-21762'],
    cweIds: ['CWE-787'],
    severity: 'CRITICAL',
    cvssScore: 9.8,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    cvssVersion: '3.1',
    epssScore: 0.943,
    epssPercentile: 0.997,
    kevListed: true,
    kevDueDate: '2024-02-16T00:00:00Z',
    status: 'IN_REMEDIATION',
    assignedToId: 'user-002',
    dueAt: '2024-02-16T00:00:00Z',
    aiAdvisory: {
      summary:
        'Critical RCE in FortiOS SSL VPN with confirmed active exploitation. Unauthenticated attackers can execute arbitrary code remotely. CISA has added this to the KEV catalog with a mandatory remediation deadline.',
      recommendation:
        'Upgrade FortiOS to 7.4.2, 7.2.7, 7.0.14, 6.4.15, or 6.2.16 immediately. If patching is not possible within 24 hours, disable SSL VPN as a temporary workaround. Review firewall logs for indicators of compromise.',
      references: [
        'https://nvd.nist.gov/vuln/detail/CVE-2024-21762',
        'https://www.fortiguard.com/psirt/FG-IR-24-015',
        'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
      ],
      generatedAt: '2024-02-10T08:00:00Z',
    },
    remediationNotes: '',
    findingCount: 3,
    firstSeenAt: '2024-02-09T14:30:00Z',
    lastSeenAt: '2024-02-09T14:30:00Z',
  },
  {
    id: 'c-003',
    organizationId: 'org-demo',
    clientId: 'client-demo',
    title: 'HTTP/2 Rapid Reset — DoS across Load Balancers',
    description:
      'The HTTP/2 protocol allows a denial of service via rapid stream resets (RST_STREAM frames), causing excessive server resource consumption. Multiple implementations are affected including nginx, Apache, and various cloud providers.',
    cveIds: ['CVE-2023-44487'],
    cweIds: ['CWE-400'],
    severity: 'HIGH',
    cvssScore: 7.5,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H',
    cvssVersion: '3.1',
    epssScore: 0.822,
    epssPercentile: 0.981,
    kevListed: true,
    kevDueDate: '2024-04-01T00:00:00Z',
    status: 'TRIAGE',
    assignedToId: 'user-003',
    dueAt: '2024-04-15T00:00:00Z',
    aiAdvisory: null,
    remediationNotes: '',
    findingCount: 7,
    firstSeenAt: '2024-01-15T10:00:00Z',
    lastSeenAt: '2024-01-22T14:30:00Z',
  },
  {
    id: 'c-004',
    organizationId: 'org-demo',
    clientId: 'client-demo',
    title: 'CitrixBleed — NetScaler Session Hijack',
    description:
      'A buffer overflow in Citrix NetScaler ADC and Gateway allows an unauthenticated attacker to leak sensitive session tokens, enabling session hijacking. Widely exploited by ransomware groups.',
    cveIds: ['CVE-2023-4966'],
    cweIds: ['CWE-119'],
    severity: 'CRITICAL',
    cvssScore: 9.4,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:L',
    cvssVersion: '3.1',
    epssScore: 0.961,
    epssPercentile: 0.998,
    kevListed: true,
    kevDueDate: '2023-11-08T00:00:00Z',
    status: 'NEW',
    assignedToId: null,
    dueAt: '2023-11-15T00:00:00Z',
    aiAdvisory: null,
    remediationNotes: '',
    findingCount: 2,
    firstSeenAt: '2023-10-18T09:20:00Z',
    lastSeenAt: '2023-10-18T09:20:00Z',
  },
  {
    id: 'c-005',
    organizationId: 'org-demo',
    clientId: 'client-demo',
    title: 'Confluence RCE — Broken Access Control',
    description:
      'A critical broken access control vulnerability in Atlassian Confluence Data Center and Server allows an unauthenticated attacker to create administrator accounts and execute arbitrary code remotely.',
    cveIds: ['CVE-2023-22515'],
    cweIds: ['CWE-284'],
    severity: 'CRITICAL',
    cvssScore: 10.0,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
    cvssVersion: '3.1',
    epssScore: 0.913,
    epssPercentile: 0.993,
    kevListed: true,
    kevDueDate: '2023-10-19T00:00:00Z',
    status: 'TRIAGE',
    assignedToId: 'user-004',
    dueAt: '2023-10-25T00:00:00Z',
    aiAdvisory: null,
    remediationNotes: '',
    findingCount: 4,
    firstSeenAt: '2023-10-05T11:05:00Z',
    lastSeenAt: '2023-10-06T09:15:00Z',
  },
];

// ---------------------------------------------------------------------------
// Case-to-findings mapping (some cases have multiple findings)
// ---------------------------------------------------------------------------
export const demoCaseFindings: Record<string, DetailFinding[]> = {
  'c-001': [
    demoDetailFindings[0],
    {
      id: 'f-001b',
      organizationId: 'org-demo',
      clientId: 'client-demo',
      assetId: 'asset-010',
      scannerType: 'SCA',
      scannerName: 'Trivy v0.50',
      observations: {
        package: 'xz-utils',
        installedVersion: '5.6.1',
        fixedVersion: '5.6.2',
        path: '/usr/lib/liblzma.so.5.6.1',
        confidence: 'HIGH',
        evidence: 'Container image includes compromised xz-utils version',
      },
      dedupKey: 'CVE-2024-3094:acmecorp/api-gateway:latest:SCA',
      vulnerabilityCaseId: 'c-001',
      discoveredAt: '2024-03-29T09:05:00Z',
    },
    {
      id: 'f-001c',
      organizationId: 'org-demo',
      clientId: 'client-demo',
      assetId: 'asset-014',
      scannerType: 'SCA',
      scannerName: 'Trivy v0.50',
      observations: {
        package: 'xz-utils',
        installedVersion: '5.6.0',
        fixedVersion: '5.6.2',
        path: '/usr/lib/liblzma.so.5.6.0',
        confidence: 'HIGH',
        evidence: 'Worker service image built with compromised base layer',
      },
      dedupKey: 'CVE-2024-3094:acmecorp/worker-service:v2.8:SCA',
      vulnerabilityCaseId: 'c-001',
      discoveredAt: '2024-03-29T09:12:00Z',
    },
  ],
  'c-002': [
    demoDetailFindings[1],
    {
      id: 'f-002b',
      organizationId: 'org-demo',
      clientId: 'client-demo',
      assetId: 'asset-002',
      scannerType: 'VM',
      scannerName: 'Qualys VMDR 10.23',
      observations: {
        qid: 730946,
        title: 'Fortinet FortiOS SSL VPN Out-of-Bounds Write',
        port: 10443,
        protocol: 'tcp',
        impact: 'Remote attacker can execute arbitrary code without authentication',
        solution: 'Upgrade FortiOS to 7.4.2 or later',
      },
      dedupKey: 'CVE-2024-21762:fw-edge-01.acmecorp.io:VM:qualys',
      vulnerabilityCaseId: 'c-002',
      discoveredAt: '2024-02-10T06:00:00Z',
    },
  ],
  'c-003': [
    demoDetailFindings[2],
    {
      id: 'f-003b',
      organizationId: 'org-demo',
      clientId: 'client-demo',
      assetId: 'asset-011',
      scannerType: 'DAST',
      scannerName: 'OWASP ZAP 2.14',
      observations: {
        ruleId: 'CVE-2023-44487',
        level: 'warning',
        uri: 'https://app-frontend-01.acmecorp.io',
        evidence: 'HTTP/2 endpoint susceptible to rapid reset flood',
        httpVersion: 'HTTP/2',
        concurrentStreams: 50,
      },
      dedupKey: 'CVE-2023-44487:app-frontend-01.acmecorp.io:DAST',
      vulnerabilityCaseId: 'c-003',
      discoveredAt: '2024-01-16T11:30:00Z',
    },
  ],
  'c-004': [
    demoDetailFindings[4],
  ],
  'c-005': [
    {
      id: 'f-006',
      organizationId: 'org-demo',
      clientId: 'client-demo',
      assetId: 'asset-008',
      scannerType: 'DAST',
      scannerName: 'OWASP ZAP 2.14',
      observations: {
        ruleId: 'CVE-2023-22515',
        level: 'error',
        uri: 'https://confluence.internal.acmecorp.io/setup/setupadministrator.action',
        evidence: 'Setup wizard endpoint accessible without authentication',
        method: 'POST',
        statusCode: 200,
      },
      dedupKey: 'CVE-2023-22515:confluence.internal.acmecorp.io:DAST',
      vulnerabilityCaseId: 'c-005',
      discoveredAt: '2023-10-05T11:05:00Z',
    },
    {
      id: 'f-006b',
      organizationId: 'org-demo',
      clientId: 'client-demo',
      assetId: 'asset-008',
      scannerType: 'VM',
      scannerName: 'Nessus 10.7',
      observations: {
        pluginId: 183070,
        pluginName: 'Atlassian Confluence Broken Access Control',
        port: 8090,
        protocol: 'tcp',
        synopsis: 'Confluence instance allows unauthenticated admin account creation.',
        pluginOutput: 'Installed version: 8.5.1\nFixed version: 8.5.2',
      },
      dedupKey: 'CVE-2023-22515:confluence.internal.acmecorp.io:VM',
      vulnerabilityCaseId: 'c-005',
      discoveredAt: '2023-10-06T09:15:00Z',
    },
  ],
};

// ---------------------------------------------------------------------------
// Demo users (12 users covering all 10 RBAC roles)
// ---------------------------------------------------------------------------
export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export const demoUsers: DemoUser[] = [
  {
    id: 'user-001',
    email: 'maria.chen@acmecorp.io',
    name: 'Maria Chen',
    role: 'SECURITY_ADMIN',
    isActive: true,
    mfaEnabled: true,
    lastLoginAt: '2024-03-29T07:45:00Z',
    createdAt: '2023-06-15T09:00:00Z',
  },
  {
    id: 'user-002',
    email: 'james.walker@acmecorp.io',
    name: 'James Walker',
    role: 'ANALYST',
    isActive: true,
    mfaEnabled: true,
    lastLoginAt: '2024-03-28T16:30:00Z',
    createdAt: '2023-07-01T10:00:00Z',
  },
  {
    id: 'user-003',
    email: 'sarah.kim@acmecorp.io',
    name: 'Sarah Kim',
    role: 'ANALYST',
    isActive: true,
    mfaEnabled: true,
    lastLoginAt: '2024-03-29T08:15:00Z',
    createdAt: '2023-08-20T14:00:00Z',
  },
  {
    id: 'user-004',
    email: 'david.park@acmecorp.io',
    name: 'David Park',
    role: 'DEVELOPER',
    isActive: true,
    mfaEnabled: false,
    lastLoginAt: '2024-03-27T11:00:00Z',
    createdAt: '2023-09-10T08:30:00Z',
  },
  {
    id: 'user-005',
    email: 'admin@cveriskpilot.com',
    name: 'Platform Admin',
    role: 'PLATFORM_ADMIN',
    isActive: true,
    mfaEnabled: true,
    lastLoginAt: '2024-03-29T06:00:00Z',
    createdAt: '2023-01-01T00:00:00Z',
  },
  {
    id: 'user-006',
    email: 'support@cveriskpilot.com',
    name: 'Support Agent',
    role: 'PLATFORM_SUPPORT',
    isActive: true,
    mfaEnabled: true,
    lastLoginAt: '2024-03-28T09:00:00Z',
    createdAt: '2023-02-15T10:00:00Z',
  },
  {
    id: 'user-007',
    email: 'rachel.torres@acmecorp.io',
    name: 'Rachel Torres',
    role: 'ORG_OWNER',
    isActive: true,
    mfaEnabled: true,
    lastLoginAt: '2024-03-25T14:30:00Z',
    createdAt: '2023-06-01T08:00:00Z',
  },
  {
    id: 'user-008',
    email: 'mike.johnson@acmecorp.io',
    name: 'Mike Johnson',
    role: 'VIEWER',
    isActive: true,
    mfaEnabled: false,
    lastLoginAt: '2024-03-20T10:15:00Z',
    createdAt: '2024-01-10T09:00:00Z',
  },
  {
    id: 'user-009',
    email: 'svc-scanner@acmecorp.io',
    name: 'Scanner Service Account',
    role: 'SERVICE_ACCOUNT',
    isActive: true,
    mfaEnabled: false,
    lastLoginAt: '2024-03-29T02:00:00Z',
    createdAt: '2023-07-20T12:00:00Z',
  },
  {
    id: 'user-010',
    email: 'emily.zhang@partnercorp.io',
    name: 'Emily Zhang',
    role: 'CLIENT_ADMIN',
    isActive: true,
    mfaEnabled: true,
    lastLoginAt: '2024-03-28T13:45:00Z',
    createdAt: '2024-02-01T10:00:00Z',
  },
  {
    id: 'user-011',
    email: 'tom.harris@partnercorp.io',
    name: 'Tom Harris',
    role: 'CLIENT_VIEWER',
    isActive: true,
    mfaEnabled: false,
    lastLoginAt: '2024-03-22T09:30:00Z',
    createdAt: '2024-02-15T14:00:00Z',
  },
  {
    id: 'user-012',
    email: 'lisa.martinez@acmecorp.io',
    name: 'Lisa Martinez',
    role: 'ANALYST',
    isActive: false,
    mfaEnabled: true,
    lastLoginAt: '2024-02-28T17:00:00Z',
    createdAt: '2023-08-01T09:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Risk exceptions (8 items with varied statuses)
// ---------------------------------------------------------------------------
export interface DemoRiskException {
  id: string;
  type: 'ACCEPTED_RISK' | 'FALSE_POSITIVE' | 'NOT_APPLICABLE';
  reason: string;
  expiresAt: string | null;
  createdAt: string;
  derivedStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  requestedBy: { name: string; email: string };
  approvedBy: { name: string; email: string } | null;
  vulnerabilityCase: { id: string; title: string; severity: Severity; cveIds: string[] };
}

export const demoRiskExceptions: DemoRiskException[] = [
  {
    id: 'exc-001',
    type: 'ACCEPTED_RISK',
    reason: 'Legacy portal scheduled for decommission in Q2 2024. jQuery upgrade would require full rewrite of frontend. Risk accepted with compensating controls (WAF rules).',
    expiresAt: '2024-06-30T00:00:00Z',
    createdAt: '2024-01-22T14:00:00Z',
    derivedStatus: 'APPROVED',
    requestedBy: { name: 'David Park', email: 'david.park@acmecorp.io' },
    approvedBy: { name: 'Maria Chen', email: 'maria.chen@acmecorp.io' },
    vulnerabilityCase: { id: 'c-010', title: 'Terraform IAM Role Assumption Bypass', severity: 'MEDIUM', cveIds: ['CVE-2024-27289'] },
  },
  {
    id: 'exc-002',
    type: 'ACCEPTED_RISK',
    reason: 'PostgreSQL COPY FROM PROGRAM requires superuser access. Database accounts use least-privilege roles and superuser is restricted to break-glass only.',
    expiresAt: '2024-09-30T00:00:00Z',
    createdAt: '2024-03-06T22:00:00Z',
    derivedStatus: 'APPROVED',
    requestedBy: { name: 'Sarah Kim', email: 'sarah.kim@acmecorp.io' },
    approvedBy: { name: 'Rachel Torres', email: 'rachel.torres@acmecorp.io' },
    vulnerabilityCase: { id: 'c-008', title: 'PostgreSQL COPY Privilege Escalation', severity: 'HIGH', cveIds: ['CVE-2019-9193'] },
  },
  {
    id: 'exc-003',
    type: 'FALSE_POSITIVE',
    reason: 'SSH CBC mode cipher is disabled in sshd_config. Nessus plugin triggers on banner detection only. Manual verification confirms CBC ciphers are not negotiated.',
    expiresAt: null,
    createdAt: '2024-03-14T10:00:00Z',
    derivedStatus: 'PENDING',
    requestedBy: { name: 'James Walker', email: 'james.walker@acmecorp.io' },
    approvedBy: null,
    vulnerabilityCase: { id: 'c-008', title: 'PostgreSQL COPY Privilege Escalation', severity: 'HIGH', cveIds: ['CVE-2019-9193'] },
  },
  {
    id: 'exc-004',
    type: 'NOT_APPLICABLE',
    reason: 'Terraform provider vulnerability requires malicious .tf files in the repository. All infrastructure code is reviewed via mandatory PR approvals and Sentinel policies.',
    expiresAt: null,
    createdAt: '2024-03-09T17:00:00Z',
    derivedStatus: 'APPROVED',
    requestedBy: { name: 'James Walker', email: 'james.walker@acmecorp.io' },
    approvedBy: { name: 'Maria Chen', email: 'maria.chen@acmecorp.io' },
    vulnerabilityCase: { id: 'c-010', title: 'Terraform IAM Role Assumption Bypass', severity: 'MEDIUM', cveIds: ['CVE-2024-27289'] },
  },
  {
    id: 'exc-005',
    type: 'ACCEPTED_RISK',
    reason: 'Node.js undici request smuggling requires specific proxy configurations not present in our environment. Risk accepted pending next quarterly dependency update cycle.',
    expiresAt: '2024-04-30T00:00:00Z',
    createdAt: '2024-03-11T09:00:00Z',
    derivedStatus: 'PENDING',
    requestedBy: { name: 'David Park', email: 'david.park@acmecorp.io' },
    approvedBy: null,
    vulnerabilityCase: { id: 'c-007', title: 'Docker runc Container Escape (Leaky Vessels)', severity: 'HIGH', cveIds: ['CVE-2024-21626'] },
  },
  {
    id: 'exc-006',
    type: 'FALSE_POSITIVE',
    reason: 'Spring4Shell requires specific conditions (JDK 9+, Apache Tomcat, WAR deployment). This service runs on embedded Jetty with JAR packaging — not vulnerable.',
    expiresAt: null,
    createdAt: '2023-04-15T11:00:00Z',
    derivedStatus: 'REJECTED',
    requestedBy: { name: 'David Park', email: 'david.park@acmecorp.io' },
    approvedBy: null,
    vulnerabilityCase: { id: 'c-006', title: 'Log4Shell — Legacy App Instances', severity: 'CRITICAL', cveIds: ['CVE-2021-44228'] },
  },
  {
    id: 'exc-007',
    type: 'ACCEPTED_RISK',
    reason: 'OpenSSL buffer overread only affects X.509 certificate name constraint validation. Internal proxy uses certificates from private CA without name constraints.',
    expiresAt: '2024-01-31T00:00:00Z',
    createdAt: '2023-11-01T08:00:00Z',
    derivedStatus: 'EXPIRED',
    requestedBy: { name: 'Sarah Kim', email: 'sarah.kim@acmecorp.io' },
    approvedBy: { name: 'Maria Chen', email: 'maria.chen@acmecorp.io' },
    vulnerabilityCase: { id: 'c-003', title: 'HTTP/2 Rapid Reset — DoS across Load Balancers', severity: 'HIGH', cveIds: ['CVE-2023-44487'] },
  },
  {
    id: 'exc-008',
    type: 'NOT_APPLICABLE',
    reason: 'MOVEit Transfer instance was decommissioned on 2023-07-15 as part of emergency response. File transfer migrated to SFTP Gateway.',
    expiresAt: '2023-12-31T00:00:00Z',
    createdAt: '2023-07-15T16:00:00Z',
    derivedStatus: 'EXPIRED',
    requestedBy: { name: 'Maria Chen', email: 'maria.chen@acmecorp.io' },
    approvedBy: { name: 'Rachel Torres', email: 'rachel.torres@acmecorp.io' },
    vulnerabilityCase: { id: 'c-009', title: 'MOVEit Transfer SQLi — File Exfil Risk', severity: 'CRITICAL', cveIds: ['CVE-2023-34362'] },
  },
];

// ---------------------------------------------------------------------------
// Audit log entries (15 items spanning last 7 days)
// ---------------------------------------------------------------------------
export interface DemoAuditEntry {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATE_CHANGE' | 'RISK_EXCEPTION' | 'EXPORT' | 'LOGIN' | 'LOGOUT';
  entityType: string;
  entityId: string;
  actor: { name: string; email: string };
  actorIp: string;
  details: string;
  createdAt: string;
}

export const demoAuditEntries: DemoAuditEntry[] = [
  {
    id: 'audit-001',
    action: 'LOGIN',
    entityType: 'Session',
    entityId: 'session-8a3f',
    actor: { name: 'Maria Chen', email: 'maria.chen@acmecorp.io' },
    actorIp: '10.0.1.42',
    details: 'Successful login via SSO (Google OAuth)',
    createdAt: '2024-03-29T07:45:00Z',
  },
  {
    id: 'audit-002',
    action: 'CREATE',
    entityType: 'UploadJob',
    entityId: 'scan-001',
    actor: { name: 'Scanner Service Account', email: 'svc-scanner@acmecorp.io' },
    actorIp: '10.0.5.10',
    details: 'Uploaded nessus-weekly-2024-03-15.nessus (142 findings parsed)',
    createdAt: '2024-03-29T02:00:00Z',
  },
  {
    id: 'audit-003',
    action: 'STATE_CHANGE',
    entityType: 'VulnerabilityCase',
    entityId: 'c-001',
    actor: { name: 'Maria Chen', email: 'maria.chen@acmecorp.io' },
    actorIp: '10.0.1.42',
    details: 'Status changed from NEW to IN_REMEDIATION for XZ Utils Backdoor (CVE-2024-3094)',
    createdAt: '2024-03-29T08:35:00Z',
  },
  {
    id: 'audit-004',
    action: 'UPDATE',
    entityType: 'VulnerabilityCase',
    entityId: 'c-002',
    actor: { name: 'James Walker', email: 'james.walker@acmecorp.io' },
    actorIp: '10.0.1.87',
    details: 'Assigned to James Walker; emergency patching scheduled for maintenance window',
    createdAt: '2024-03-28T16:30:00Z',
  },
  {
    id: 'audit-005',
    action: 'RISK_EXCEPTION',
    entityType: 'RiskException',
    entityId: 'exc-005',
    actor: { name: 'David Park', email: 'david.park@acmecorp.io' },
    actorIp: '10.0.2.15',
    details: 'Risk exception requested for CVE-2024-24758 (Node.js undici) — ACCEPTED_RISK, pending approval',
    createdAt: '2024-03-28T09:00:00Z',
  },
  {
    id: 'audit-006',
    action: 'EXPORT',
    entityType: 'Report',
    entityId: 'report-q1-exec',
    actor: { name: 'Rachel Torres', email: 'rachel.torres@acmecorp.io' },
    actorIp: '10.0.1.5',
    details: 'Exported Q1 Executive Summary Report (PDF, 24 pages)',
    createdAt: '2024-03-27T14:00:00Z',
  },
  {
    id: 'audit-007',
    action: 'STATE_CHANGE',
    entityType: 'VulnerabilityCase',
    entityId: 'c-006',
    actor: { name: 'Maria Chen', email: 'maria.chen@acmecorp.io' },
    actorIp: '10.0.1.42',
    details: 'Status changed from IN_REMEDIATION to VERIFIED_CLOSED for Log4Shell (CVE-2021-44228). All 47 findings verified.',
    createdAt: '2024-03-27T16:20:00Z',
  },
  {
    id: 'audit-008',
    action: 'CREATE',
    entityType: 'ApiKey',
    entityId: 'key-jira-sync',
    actor: { name: 'Maria Chen', email: 'maria.chen@acmecorp.io' },
    actorIp: '10.0.1.42',
    details: 'Created API key "Jira Sync Integration" with scope: cases:read, cases:write',
    createdAt: '2024-03-26T11:00:00Z',
  },
  {
    id: 'audit-009',
    action: 'LOGIN',
    entityType: 'Session',
    entityId: 'session-2b7e',
    actor: { name: 'Emily Zhang', email: 'emily.zhang@partnercorp.io' },
    actorIp: '203.0.113.45',
    details: 'Successful login via client portal (MFA verified)',
    createdAt: '2024-03-26T13:45:00Z',
  },
  {
    id: 'audit-010',
    action: 'UPDATE',
    entityType: 'Organization',
    entityId: 'org-demo',
    actor: { name: 'Rachel Torres', email: 'rachel.torres@acmecorp.io' },
    actorIp: '10.0.1.5',
    details: 'Updated data retention policy: findings=365d, audit_logs=730d, scan_artifacts=180d',
    createdAt: '2024-03-25T10:30:00Z',
  },
  {
    id: 'audit-011',
    action: 'DELETE',
    entityType: 'UploadJob',
    entityId: 'scan-legacy-003',
    actor: { name: 'Maria Chen', email: 'maria.chen@acmecorp.io' },
    actorIp: '10.0.1.42',
    details: 'Deleted legacy scan artifact per retention policy (older than 180 days)',
    createdAt: '2024-03-25T03:00:00Z',
  },
  {
    id: 'audit-012',
    action: 'RISK_EXCEPTION',
    entityType: 'RiskException',
    entityId: 'exc-004',
    actor: { name: 'Maria Chen', email: 'maria.chen@acmecorp.io' },
    actorIp: '10.0.1.42',
    details: 'Approved risk exception for CVE-2024-27289 (Terraform IAM bypass) — NOT_APPLICABLE',
    createdAt: '2024-03-24T15:00:00Z',
  },
  {
    id: 'audit-013',
    action: 'LOGOUT',
    entityType: 'Session',
    entityId: 'session-5c9d',
    actor: { name: 'Tom Harris', email: 'tom.harris@partnercorp.io' },
    actorIp: '203.0.113.78',
    details: 'Session ended (manual logout from client portal)',
    createdAt: '2024-03-24T17:30:00Z',
  },
  {
    id: 'audit-014',
    action: 'CREATE',
    entityType: 'Team',
    entityId: 'team-appsec',
    actor: { name: 'Rachel Torres', email: 'rachel.torres@acmecorp.io' },
    actorIp: '10.0.1.5',
    details: 'Created team "Application Security" with 4 members',
    createdAt: '2024-03-23T09:00:00Z',
  },
  {
    id: 'audit-015',
    action: 'STATE_CHANGE',
    entityType: 'VulnerabilityCase',
    entityId: 'c-003',
    actor: { name: 'Sarah Kim', email: 'sarah.kim@acmecorp.io' },
    actorIp: '10.0.1.63',
    details: 'Status changed from NEW to TRIAGE for HTTP/2 Rapid Reset (CVE-2023-44487). Impact assessment initiated.',
    createdAt: '2024-03-23T11:15:00Z',
  },
];

// ---------------------------------------------------------------------------
// Notifications (12 items, 5 unread)
// ---------------------------------------------------------------------------
export interface DemoNotification {
  id: string;
  type: 'scan_complete' | 'sla_breach' | 'case_assigned' | 'kev_alert' | 'status_change' | 'mention';
  title: string;
  message: string;
  isRead: boolean;
  relatedEntityId: string | null;
  createdAt: string;
}

export const demoNotifications: DemoNotification[] = [
  {
    id: 'notif-001',
    type: 'kev_alert',
    title: 'New KEV Entry: CVE-2024-3094',
    message: 'XZ Utils Backdoor (CVE-2024-3094) has been added to CISA KEV catalog. 14 findings across your environment are affected. Remediation deadline: April 12, 2024.',
    isRead: false,
    relatedEntityId: 'c-001',
    createdAt: '2024-03-29T08:15:00Z',
  },
  {
    id: 'notif-002',
    type: 'case_assigned',
    title: 'Case Assigned: XZ Utils Backdoor',
    message: 'You have been assigned to case c-001 (XZ Utils Backdoor — Supply Chain Compromise). Priority: CRITICAL. Please begin triage immediately.',
    isRead: false,
    relatedEntityId: 'c-001',
    createdAt: '2024-03-29T08:30:00Z',
  },
  {
    id: 'notif-003',
    type: 'scan_complete',
    title: 'Scan Complete: nessus-weekly-2024-03-15.nessus',
    message: 'Nessus weekly scan processed successfully. 142 findings ingested, 18 new cases created, 3 critical findings detected.',
    isRead: false,
    relatedEntityId: 'scan-001',
    createdAt: '2024-03-29T02:05:00Z',
  },
  {
    id: 'notif-004',
    type: 'sla_breach',
    title: 'SLA Breached: CitrixBleed (CVE-2023-4966)',
    message: 'Case c-004 (CitrixBleed — NetScaler Session Hijack) has exceeded its SLA by 142 days. CRITICAL severity, KEV-listed. Immediate action required.',
    isRead: false,
    relatedEntityId: 'c-004',
    createdAt: '2024-03-28T00:01:00Z',
  },
  {
    id: 'notif-005',
    type: 'status_change',
    title: 'Case Closed: Log4Shell',
    message: 'Case c-006 (Log4Shell — Legacy App Instances) has been verified closed by Maria Chen. All 47 findings remediated and verified.',
    isRead: false,
    relatedEntityId: 'c-006',
    createdAt: '2024-03-27T16:25:00Z',
  },
  {
    id: 'notif-006',
    type: 'mention',
    title: 'Mentioned in Case Comment',
    message: 'James Walker mentioned you in a comment on case c-002: "Need @maria.chen to review the FortiOS patch schedule before Friday maintenance window."',
    isRead: true,
    relatedEntityId: 'c-002',
    createdAt: '2024-03-27T11:00:00Z',
  },
  {
    id: 'notif-007',
    type: 'scan_complete',
    title: 'Scan Complete: sonarqube-report.sarif',
    message: 'SonarQube SAST scan processed. 67 findings ingested, 9 new cases created. No critical findings in this scan.',
    isRead: true,
    relatedEntityId: 'scan-002',
    createdAt: '2024-03-26T09:31:00Z',
  },
  {
    id: 'notif-008',
    type: 'case_assigned',
    title: 'Case Assigned: Docker runc Escape',
    message: 'You have been assigned to case c-007 (Docker runc Container Escape). Priority: HIGH. 11 container hosts affected.',
    isRead: true,
    relatedEntityId: 'c-007',
    createdAt: '2024-03-25T10:00:00Z',
  },
  {
    id: 'notif-009',
    type: 'sla_breach',
    title: 'SLA Approaching: Confluence RCE',
    message: 'Case c-005 (Confluence RCE — Broken Access Control) SLA due date is approaching. 2 days remaining. Currently in TRIAGE status.',
    isRead: true,
    relatedEntityId: 'c-005',
    createdAt: '2024-03-24T08:00:00Z',
  },
  {
    id: 'notif-010',
    type: 'kev_alert',
    title: 'KEV Update: CVE-2024-21762',
    message: 'Fortinet FortiOS SSL VPN vulnerability (CVE-2024-21762) KEV remediation deadline has passed. 3 findings still open on fw-edge-01.acmecorp.io.',
    isRead: true,
    relatedEntityId: 'c-002',
    createdAt: '2024-03-23T00:01:00Z',
  },
  {
    id: 'notif-011',
    type: 'status_change',
    title: 'Case Updated: HTTP/2 Rapid Reset',
    message: 'Case c-003 (HTTP/2 Rapid Reset) moved to TRIAGE by Sarah Kim. Impact assessment underway across 7 load balancer instances.',
    isRead: true,
    relatedEntityId: 'c-003',
    createdAt: '2024-03-23T11:20:00Z',
  },
  {
    id: 'notif-012',
    type: 'scan_complete',
    title: 'Scan Complete: dependency-track-sbom.cdx.json',
    message: 'Dependency-Track SBOM scan processed. 214 findings ingested, 31 new cases created. 5 critical supply chain findings detected.',
    isRead: true,
    relatedEntityId: 'scan-004',
    createdAt: '2024-03-22T06:04:00Z',
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------
export function getDemoFindingById(
  id: string,
): { finding: DetailFinding; asset: DetailAsset | null; vulnCase: DetailVulnCase | null } | null {
  const finding = demoDetailFindings.find((f) => f.id === id);
  if (!finding) return null;
  const asset = demoDetailAssets.find((a) => a.id === finding.assetId) ?? null;
  const vulnCase = finding.vulnerabilityCaseId
    ? demoDetailCases.find((c) => c.id === finding.vulnerabilityCaseId) ?? null
    : null;
  return { finding, asset, vulnCase };
}

export function getDemoCaseById(
  id: string,
): { vulnCase: DetailVulnCase; findings: DetailFinding[]; assignedUserName: string | null } | null {
  const vulnCase = demoDetailCases.find((c) => c.id === id);
  if (!vulnCase) return null;
  const findings = demoCaseFindings[id] ?? [];
  const user = demoUsers.find((u) => u.id === vulnCase.assignedToId);
  return { vulnCase, findings, assignedUserName: user?.name ?? null };
}

// ---------------------------------------------------------------------------
// Pipeline Compliance Scanner — Demo Data
// ---------------------------------------------------------------------------

export const demoCWEMappings = [
  { cweId: 'CWE-89', cweName: 'SQL Injection', severity: 'CRITICAL' as const,
    nist80053: ['SI-10'], soc2: ['CC6.1'], cmmc: ['SI.L2-3.14.2'], fedramp: ['SI-10'], asvs: ['V5.3.4'], ssdf: ['PW.5.1'] },
  { cweId: 'CWE-79', cweName: 'Cross-Site Scripting', severity: 'HIGH' as const,
    nist80053: ['SI-2', 'SI-3'], soc2: ['CC6.1'], cmmc: ['SI.L2-3.14.1'], fedramp: ['SI-2', 'SI-3'], asvs: ['V5.3.3'], ssdf: ['PW.5.1'] },
  { cweId: 'CWE-798', cweName: 'Hardcoded Credentials', severity: 'CRITICAL' as const,
    nist80053: ['IA-5'], soc2: ['CC6.1', 'CC6.6'], cmmc: ['IA.L2-3.5.10'], fedramp: ['IA-5'], asvs: ['V2.10.4'], ssdf: ['PO.5.2'] },
  { cweId: 'CWE-22', cweName: 'Path Traversal', severity: 'HIGH' as const,
    nist80053: ['AC-4'], soc2: ['CC6.1'], cmmc: ['AC.L2-3.1.3'], fedramp: ['AC-4'], asvs: ['V12.3.1'], ssdf: ['PW.5.1'] },
  { cweId: 'CWE-352', cweName: 'Cross-Site Request Forgery', severity: 'MEDIUM' as const,
    nist80053: ['SC-23'], soc2: ['CC6.1'], cmmc: ['SC.L2-3.13.8'], fedramp: ['SC-23'], asvs: ['V4.2.2'], ssdf: ['PW.5.1'] },
  { cweId: 'CWE-502', cweName: 'Deserialization of Untrusted Data', severity: 'CRITICAL' as const,
    nist80053: ['SI-10'], soc2: ['CC6.1'], cmmc: ['SI.L2-3.14.2'], fedramp: ['SI-10'], asvs: ['V5.5.3'], ssdf: ['PW.5.1'] },
  { cweId: 'CWE-918', cweName: 'Server-Side Request Forgery', severity: 'HIGH' as const,
    nist80053: ['SC-7'], soc2: ['CC6.6'], cmmc: ['SC.L2-3.13.1'], fedramp: ['SC-7'], asvs: ['V12.6.1'], ssdf: ['PW.5.1'] },
  { cweId: 'CWE-287', cweName: 'Improper Authentication', severity: 'CRITICAL' as const,
    nist80053: ['IA-2'], soc2: ['CC6.1'], cmmc: ['IA.L2-3.5.1'], fedramp: ['IA-2'], asvs: ['V2.1.1'], ssdf: ['PW.5.1'] },
  { cweId: 'CWE-862', cweName: 'Missing Authorization', severity: 'HIGH' as const,
    nist80053: ['AC-3'], soc2: ['CC6.3'], cmmc: ['AC.L2-3.1.1'], fedramp: ['AC-3'], asvs: ['V4.1.1'], ssdf: ['PW.5.1'] },
  { cweId: 'CWE-200', cweName: 'Exposure of Sensitive Information', severity: 'MEDIUM' as const,
    nist80053: ['SC-28'], soc2: ['CC6.7'], cmmc: ['SC.L2-3.13.16'], fedramp: ['SC-28'], asvs: ['V8.3.4'], ssdf: ['PO.5.2'] },
  { cweId: 'CWE-327', cweName: 'Broken Cryptography', severity: 'HIGH' as const,
    nist80053: ['SC-13'], soc2: ['CC6.1'], cmmc: ['SC.L2-3.13.11'], fedramp: ['SC-13'], asvs: ['V6.2.1'], ssdf: ['PW.6.1'] },
  { cweId: 'CWE-78', cweName: 'OS Command Injection', severity: 'CRITICAL' as const,
    nist80053: ['SI-10'], soc2: ['CC6.1'], cmmc: ['SI.L2-3.14.2'], fedramp: ['SI-10'], asvs: ['V5.3.8'], ssdf: ['PW.5.1'] },
];

export const demoPipelineFindings = [
  { id: 'pf-001', title: 'SQL Injection in user query', severity: 'CRITICAL' as const, cweId: 'CWE-89', filePath: 'src/api/users/query.ts', lineNumber: 47, scanner: 'Semgrep' },
  { id: 'pf-002', title: 'Hardcoded API key in config', severity: 'CRITICAL' as const, cweId: 'CWE-798', filePath: 'src/config/aws.ts', lineNumber: 12, scanner: 'Gitleaks' },
  { id: 'pf-003', title: 'XSS in search input', severity: 'HIGH' as const, cweId: 'CWE-79', filePath: 'src/components/SearchBar.tsx', lineNumber: 31, scanner: 'Semgrep' },
  { id: 'pf-004', title: 'Path traversal in file upload', severity: 'HIGH' as const, cweId: 'CWE-22', filePath: 'src/api/uploads/handler.ts', lineNumber: 88, scanner: 'Snyk' },
  { id: 'pf-005', title: 'CSRF in form submission', severity: 'MEDIUM' as const, cweId: 'CWE-352', filePath: 'src/api/forms/submit.ts', lineNumber: 23, scanner: 'Semgrep' },
  { id: 'pf-006', title: 'Unsafe deserialization in webhook', severity: 'CRITICAL' as const, cweId: 'CWE-502', filePath: 'src/webhooks/parse.ts', lineNumber: 56, scanner: 'Snyk' },
  { id: 'pf-007', title: 'SSRF via image proxy', severity: 'HIGH' as const, cweId: 'CWE-918', filePath: 'src/api/images/proxy.ts', lineNumber: 19, scanner: 'Semgrep' },
  { id: 'pf-008', title: 'Missing auth check on admin route', severity: 'CRITICAL' as const, cweId: 'CWE-287', filePath: 'src/api/admin/users.ts', lineNumber: 5, scanner: 'Semgrep' },
  { id: 'pf-009', title: 'Broken access control on reports', severity: 'HIGH' as const, cweId: 'CWE-862', filePath: 'src/api/reports/export.ts', lineNumber: 34, scanner: 'Snyk' },
  { id: 'pf-010', title: 'Sensitive data in error response', severity: 'MEDIUM' as const, cweId: 'CWE-200', filePath: 'src/middleware/error.ts', lineNumber: 67, scanner: 'Semgrep' },
  { id: 'pf-011', title: 'Weak cipher in TLS config', severity: 'HIGH' as const, cweId: 'CWE-327', filePath: 'src/config/tls.ts', lineNumber: 8, scanner: 'Trivy' },
  { id: 'pf-012', title: 'OS command injection in PDF gen', severity: 'CRITICAL' as const, cweId: 'CWE-78', filePath: 'src/services/pdf/generate.ts', lineNumber: 42, scanner: 'Semgrep' },
];

export const demoPipelineScans = [
  { scanId: 'scan_01JQXYZ123456', repository: 'acmecorp/api-gateway', branch: 'feat/user-search', commitSha: 'a1b2c3d', prNumber: 342, verdict: 'fail' as const, totalFindings: 12, critical: 2, high: 4, medium: 2, low: 4, controlsAffected: 8, frameworks: ['NIST 800-53', 'SOC 2', 'CMMC'], poamEntriesCreated: 4, createdAt: '2026-03-28T10:15:00Z' },
  { scanId: 'scan_01JQXYZ123457', repository: 'acmecorp/api-gateway', branch: 'main', commitSha: 'e4f5g6h', prNumber: null, verdict: 'pass' as const, totalFindings: 0, critical: 0, high: 0, medium: 0, low: 0, controlsAffected: 0, frameworks: ['NIST 800-53', 'SOC 2', 'CMMC'], poamEntriesCreated: 0, createdAt: '2026-03-27T18:30:00Z' },
  { scanId: 'scan_01JQXYZ123458', repository: 'acmecorp/frontend-app', branch: 'fix/xss-sanitize', commitSha: 'i7j8k9l', prNumber: 187, verdict: 'warn' as const, totalFindings: 3, critical: 0, high: 1, medium: 2, low: 0, controlsAffected: 3, frameworks: ['NIST 800-53', 'ASVS'], poamEntriesCreated: 1, createdAt: '2026-03-28T08:45:00Z' },
  { scanId: 'scan_01JQXYZ123459', repository: 'acmecorp/infra-terraform', branch: 'main', commitSha: 'm0n1o2p', prNumber: null, verdict: 'pass' as const, totalFindings: 1, critical: 0, high: 0, medium: 0, low: 1, controlsAffected: 0, frameworks: ['FedRAMP', 'NIST 800-53'], poamEntriesCreated: 0, createdAt: '2026-03-27T22:00:00Z' },
  { scanId: 'scan_01JQXYZ123460', repository: 'acmecorp/payment-service', branch: 'feat/stripe-v3', commitSha: 'q3r4s5t', prNumber: 56, verdict: 'fail' as const, totalFindings: 7, critical: 3, high: 2, medium: 1, low: 1, controlsAffected: 6, frameworks: ['SOC 2', 'ASVS', 'SSDF'], poamEntriesCreated: 3, createdAt: '2026-03-28T06:20:00Z' },
  { scanId: 'scan_01JQXYZ123461', repository: 'acmecorp/auth-service', branch: 'main', commitSha: 'u5v6w7x', prNumber: null, verdict: 'pass' as const, totalFindings: 0, critical: 0, high: 0, medium: 0, low: 0, controlsAffected: 0, frameworks: ['NIST 800-53', 'CMMC', 'FedRAMP'], poamEntriesCreated: 0, createdAt: '2026-03-26T14:10:00Z' },
  { scanId: 'scan_01JQXYZ123462', repository: 'acmecorp/mobile-backend', branch: 'feat/push-notif', commitSha: 'y8z9a0b', prNumber: 412, verdict: 'warn' as const, totalFindings: 5, critical: 0, high: 2, medium: 2, low: 1, controlsAffected: 4, frameworks: ['NIST 800-53', 'SOC 2'], poamEntriesCreated: 2, createdAt: '2026-03-27T11:30:00Z' },
  { scanId: 'scan_01JQXYZ123463', repository: 'acmecorp/data-pipeline', branch: 'fix/sql-param', commitSha: 'c1d2e3f', prNumber: 89, verdict: 'pass' as const, totalFindings: 2, critical: 0, high: 0, medium: 1, low: 1, controlsAffected: 1, frameworks: ['NIST 800-53', 'SSDF'], poamEntriesCreated: 0, createdAt: '2026-03-28T09:00:00Z' },
];

export const demoPipelinePOAMs = [
  { id: 'POAM-2026-0342', findingTitle: 'SQL Injection in user query', cweId: 'CWE-89', controlId: 'SI-10', framework: 'NIST 800-53', severity: 'CRITICAL' as const, status: 'Open' as const, milestone: 'Parameterize query inputs', dueDate: '2026-04-11', owner: '@security-team', prLink: 'https://github.com/acmecorp/api-gateway/pull/342', commitSha: 'a1b2c3d' },
  { id: 'POAM-2026-0343', findingTitle: 'Hardcoded API key in config', cweId: 'CWE-798', controlId: 'IA-5', framework: 'NIST 800-53', severity: 'CRITICAL' as const, status: 'Open' as const, milestone: 'Migrate to secrets manager', dueDate: '2026-04-11', owner: '@security-team', prLink: 'https://github.com/acmecorp/api-gateway/pull/342', commitSha: 'a1b2c3d' },
  { id: 'POAM-2026-0344', findingTitle: 'XSS in search input', cweId: 'CWE-79', controlId: 'SI-2', framework: 'NIST 800-53', severity: 'HIGH' as const, status: 'Open' as const, milestone: 'Implement output encoding', dueDate: '2026-04-27', owner: '@dev-lead', prLink: 'https://github.com/acmecorp/api-gateway/pull/342', commitSha: 'a1b2c3d' },
  { id: 'POAM-2026-0345', findingTitle: 'Path traversal in file upload', cweId: 'CWE-22', controlId: 'AC-4', framework: 'NIST 800-53', severity: 'HIGH' as const, status: 'Open' as const, milestone: 'Validate and sanitize file paths', dueDate: '2026-04-27', owner: '@dev-lead', prLink: 'https://github.com/acmecorp/api-gateway/pull/342', commitSha: 'a1b2c3d' },
];

export const demoPipelineRepos = [
  { name: 'acmecorp/api-gateway', lastScan: '2026-03-28T10:15:00Z', scanCount: 147, passRate: 72,
    frameworks: [
      { name: 'NIST 800-53', score: 84, controlsTotal: 45, controlsPassing: 38 },
      { name: 'SOC 2', score: 91, controlsTotal: 7, controlsPassing: 6 },
      { name: 'CMMC', score: 78, controlsTotal: 33, controlsPassing: 26 },
    ] },
  { name: 'acmecorp/frontend-app', lastScan: '2026-03-28T08:45:00Z', scanCount: 203, passRate: 88,
    frameworks: [
      { name: 'NIST 800-53', score: 92, controlsTotal: 45, controlsPassing: 41 },
      { name: 'ASVS', score: 86, controlsTotal: 7, controlsPassing: 6 },
    ] },
  { name: 'acmecorp/payment-service', lastScan: '2026-03-28T06:20:00Z', scanCount: 89, passRate: 64,
    frameworks: [
      { name: 'SOC 2', score: 76, controlsTotal: 7, controlsPassing: 5 },
      { name: 'ASVS', score: 71, controlsTotal: 7, controlsPassing: 5 },
      { name: 'SSDF', score: 82, controlsTotal: 8, controlsPassing: 7 },
    ] },
  { name: 'acmecorp/infra-terraform', lastScan: '2026-03-27T22:00:00Z', scanCount: 312, passRate: 95,
    frameworks: [
      { name: 'FedRAMP', score: 97, controlsTotal: 35, controlsPassing: 34 },
      { name: 'NIST 800-53', score: 95, controlsTotal: 45, controlsPassing: 43 },
    ] },
  { name: 'acmecorp/auth-service', lastScan: '2026-03-26T14:10:00Z', scanCount: 178, passRate: 91,
    frameworks: [
      { name: 'NIST 800-53', score: 93, controlsTotal: 45, controlsPassing: 42 },
      { name: 'CMMC', score: 89, controlsTotal: 33, controlsPassing: 29 },
      { name: 'FedRAMP', score: 91, controlsTotal: 35, controlsPassing: 32 },
    ] },
];

export const demoPipelineMSSPClients = [
  { id: 'mssp-001', name: 'TechVault Inc.', industry: 'Financial Services', frameworks: ['SOC 2', 'NIST 800-53', 'ASVS'], scanCount: 1247, openFindings: 23, poamItems: 8, complianceScore: 87 },
  { id: 'mssp-002', name: 'MedSecure Health', industry: 'Healthcare', frameworks: ['NIST 800-53', 'FedRAMP'], scanCount: 892, openFindings: 41, poamItems: 15, complianceScore: 74 },
  { id: 'mssp-003', name: 'DefenseFirst Corp.', industry: 'Defense / Gov Contractor', frameworks: ['CMMC', 'NIST 800-53', 'FedRAMP'], scanCount: 2103, openFindings: 12, poamItems: 4, complianceScore: 93 },
  { id: 'mssp-004', name: 'CloudNova SaaS', industry: 'Technology', frameworks: ['SOC 2', 'ASVS', 'SSDF'], scanCount: 567, openFindings: 67, poamItems: 22, complianceScore: 68 },
  { id: 'mssp-005', name: 'Patriot Energy Co.', industry: 'Energy / Utilities', frameworks: ['NIST 800-53', 'FedRAMP', 'CMMC'], scanCount: 1456, openFindings: 19, poamItems: 6, complianceScore: 91 },
];

export const demoPRCommentMarkdown = `## ❌ CVERiskPilot Compliance Scan

> **FAIL** — 6 finding(s) at or above **CRITICAL** severity.

🔴 **2** Critical  🟠 **3** High  🟡 **4** Medium  🔵 **2** Low  ⚪ **1** Info

**Triage:** 8 actionable · 3 needs review · 1 auto-dismissed

<sub>842 dependencies (npm, pip) · Scanners: sbom, secrets, iac · Duration: 1240ms</sub>

<details>
<summary><strong>🔍 8 Findings Requiring Attention</strong></summary>

| Severity | Verdict | Finding | CWE | Location |
|----------|---------|---------|-----|----------|
| 🔴 CRITICAL | 🔴 TP | SQL Injection in user query builder | CWE-89 | \`src/db/queries.ts:42\` |
| 🔴 CRITICAL | 🔴 TP | Hardcoded AWS secret key | CWE-798 | \`config/aws.ts:8\` |
| 🟠 HIGH | 🔴 TP | XSS in search input handler | CWE-79 | \`src/routes/search.ts:156\` |
| 🟠 HIGH | 🟡 Review | Path traversal in file upload | CWE-22 | \`src/upload/handler.ts:73\` |
| 🟠 HIGH | 🔴 TP | lodash@4.17.20 — Prototype Pollution | CWE-1321 | \`lodash@4.17.20\` |
| 🟡 MEDIUM | 🟡 Review | Terraform S3 bucket missing encryption | CWE-311 | \`infra/s3.tf:12\` |
| 🟡 MEDIUM | 🔴 TP | Dockerfile running as root | CWE-250 | \`Dockerfile:1\` |
| 🔵 LOW | 🟡 Review | Missing Content-Security-Policy header | CWE-693 | \`src/middleware.ts:5\` |

</details>

<details>
<summary><strong>🏛️ Compliance Impact — 14 controls affected</strong></summary>

| Framework | Controls Affected | Control IDs |
|-----------|:-----------------:|-------------|
| **NIST 800-53 Rev 5** | 6 | SI-10, IA-5, SI-2, AC-4, SC-28, CM-7 |
| **SOC 2 Type II** | 2 | CC6.1, CC8.1 |
| **CMMC Level 2** | 3 | SI.L2-3.14.2, IA.L2-3.5.10, AC.L2-3.1.3 |
| **FedRAMP Moderate** | 2 | SI-2, SA-11 |
| **OWASP ASVS 4.0** | 1 | V5.1 |

</details>

---
<sub>🛡️ Scanned by <a href="https://cveriskpilot.com">CVERiskPilot</a> · <a href="https://www.npmjs.com/package/@cveriskpilot/scan">CLI</a> · <a href="https://cveriskpilot.com/docs/pipeline">Setup Guide</a></sub>`;
