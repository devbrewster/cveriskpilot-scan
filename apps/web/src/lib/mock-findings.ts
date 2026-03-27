// Mock data for findings, vulnerability cases, and assets

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

export type AssetType = 'SERVER' | 'APPLICATION' | 'CONTAINER' | 'CLOUD_RESOURCE' | 'ENDPOINT';
export type Environment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT' | 'QA';
export type Criticality = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  environment: Environment;
  criticality: Criticality;
  internetExposed: boolean;
  tags: string[];
}

export interface Finding {
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

export interface VulnerabilityCase {
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

export interface StatusChange {
  id: string;
  caseId: string;
  fromStatus: CaseStatus | null;
  toStatus: CaseStatus;
  reason: string;
  changedBy: string;
  changedAt: string;
}

// --- Assets ---

export const mockAssets: Asset[] = [
  {
    id: 'asset-1',
    name: 'api-gateway-prod',
    type: 'APPLICATION',
    environment: 'PRODUCTION',
    criticality: 'CRITICAL',
    internetExposed: true,
    tags: ['api', 'gateway', 'nginx'],
  },
  {
    id: 'asset-2',
    name: 'db-primary-01',
    type: 'SERVER',
    environment: 'PRODUCTION',
    criticality: 'CRITICAL',
    internetExposed: false,
    tags: ['database', 'postgres', 'primary'],
  },
  {
    id: 'asset-3',
    name: 'web-frontend-staging',
    type: 'APPLICATION',
    environment: 'STAGING',
    criticality: 'MEDIUM',
    internetExposed: true,
    tags: ['web', 'react', 'frontend'],
  },
  {
    id: 'asset-4',
    name: 'k8s-worker-node-03',
    type: 'CONTAINER',
    environment: 'PRODUCTION',
    criticality: 'HIGH',
    internetExposed: false,
    tags: ['kubernetes', 'worker', 'node'],
  },
  {
    id: 'asset-5',
    name: 'auth-service-dev',
    type: 'APPLICATION',
    environment: 'DEVELOPMENT',
    criticality: 'LOW',
    internetExposed: false,
    tags: ['auth', 'oauth', 'microservice'],
  },
  {
    id: 'asset-6',
    name: 'cdn-edge-us-east',
    type: 'CLOUD_RESOURCE',
    environment: 'PRODUCTION',
    criticality: 'HIGH',
    internetExposed: true,
    tags: ['cdn', 'cloudfront', 'edge'],
  },
  {
    id: 'asset-7',
    name: 'monitoring-agent-fleet',
    type: 'ENDPOINT',
    environment: 'PRODUCTION',
    criticality: 'MEDIUM',
    internetExposed: false,
    tags: ['monitoring', 'datadog', 'agent'],
  },
  {
    id: 'asset-8',
    name: 'payment-service-prod',
    type: 'APPLICATION',
    environment: 'PRODUCTION',
    criticality: 'CRITICAL',
    internetExposed: true,
    tags: ['payment', 'pci', 'stripe'],
  },
];

// --- Vulnerability Cases ---

export const mockCases: VulnerabilityCase[] = [
  {
    id: 'case-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    title: 'Log4Shell Remote Code Execution',
    description: 'Apache Log4j2 JNDI features do not protect against attacker-controlled LDAP and other JNDI related endpoints. An attacker who can control log messages or log message parameters can execute arbitrary code loaded from LDAP servers.',
    cveIds: ['CVE-2021-44228'],
    cweIds: ['CWE-502', 'CWE-400', 'CWE-20'],
    severity: 'CRITICAL',
    cvssScore: 10.0,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
    cvssVersion: '3.1',
    epssScore: 0.97565,
    epssPercentile: 0.9998,
    kevListed: true,
    kevDueDate: '2026-04-15',
    status: 'IN_REMEDIATION',
    assignedToId: 'user-1',
    dueAt: '2026-04-10',
    aiAdvisory: {
      summary: 'This is an extremely critical vulnerability that allows remote code execution without authentication. Immediate patching is required.',
      recommendation: 'Upgrade Apache Log4j to version 2.17.1 or later. As an interim mitigation, set the system property log4j2.formatMsgNoLookups to true, or remove the JndiLookup class from the classpath.',
      references: [
        'https://nvd.nist.gov/vuln/detail/CVE-2021-44228',
        'https://logging.apache.org/log4j/2.x/security.html',
      ],
      generatedAt: '2026-03-20T10:00:00Z',
    },
    remediationNotes: 'Patching scheduled for next maintenance window. WAF rules deployed as interim mitigation.',
    findingCount: 3,
    firstSeenAt: '2026-03-01T08:00:00Z',
    lastSeenAt: '2026-03-25T14:30:00Z',
  },
  {
    id: 'case-2',
    organizationId: 'org-1',
    clientId: 'client-1',
    title: 'Spring4Shell Remote Code Execution',
    description: 'A Spring MVC or Spring WebFlux application running on JDK 9+ may be vulnerable to remote code execution via data binding.',
    cveIds: ['CVE-2022-22965'],
    cweIds: ['CWE-94'],
    severity: 'CRITICAL',
    cvssScore: 9.8,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    cvssVersion: '3.1',
    epssScore: 0.9754,
    epssPercentile: 0.9997,
    kevListed: true,
    kevDueDate: '2026-04-20',
    status: 'NEW',
    assignedToId: null,
    dueAt: '2026-04-18',
    aiAdvisory: null,
    remediationNotes: '',
    findingCount: 2,
    firstSeenAt: '2026-03-15T09:00:00Z',
    lastSeenAt: '2026-03-26T11:00:00Z',
  },
  {
    id: 'case-3',
    organizationId: 'org-1',
    clientId: 'client-1',
    title: 'OpenSSL Buffer Overflow in X.509 Certificate Verification',
    description: 'A buffer overrun can be triggered in X.509 certificate verification, specifically in name constraint checking.',
    cveIds: ['CVE-2022-3602', 'CVE-2022-3786'],
    cweIds: ['CWE-120'],
    severity: 'HIGH',
    cvssScore: 7.5,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H',
    cvssVersion: '3.1',
    epssScore: 0.1632,
    epssPercentile: 0.9543,
    kevListed: false,
    kevDueDate: null,
    status: 'TRIAGE',
    assignedToId: 'user-2',
    dueAt: '2026-04-30',
    aiAdvisory: {
      summary: 'High severity buffer overflow in OpenSSL X.509 certificate handling. Exploitability is limited but impact on availability is significant.',
      recommendation: 'Upgrade OpenSSL to version 3.0.7 or later. Review all services using TLS certificate verification.',
      references: ['https://www.openssl.org/news/secadv/20221101.txt'],
      generatedAt: '2026-03-22T14:00:00Z',
    },
    remediationNotes: '',
    findingCount: 4,
    firstSeenAt: '2026-03-10T12:00:00Z',
    lastSeenAt: '2026-03-27T08:00:00Z',
  },
  {
    id: 'case-4',
    organizationId: 'org-1',
    clientId: 'client-1',
    title: 'SQL Injection in User Authentication Endpoint',
    description: 'The login endpoint does not properly sanitize user input, allowing SQL injection attacks that could bypass authentication or extract database contents.',
    cveIds: [],
    cweIds: ['CWE-89'],
    severity: 'HIGH',
    cvssScore: 8.6,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:N/A:N',
    cvssVersion: '3.1',
    epssScore: 0.045,
    epssPercentile: 0.89,
    kevListed: false,
    kevDueDate: null,
    status: 'IN_REMEDIATION',
    assignedToId: 'user-1',
    dueAt: '2026-04-05',
    aiAdvisory: null,
    remediationNotes: 'Development team applying parameterized queries. PR #1234 submitted.',
    findingCount: 1,
    firstSeenAt: '2026-03-05T10:00:00Z',
    lastSeenAt: '2026-03-25T16:00:00Z',
  },
  {
    id: 'case-5',
    organizationId: 'org-1',
    clientId: 'client-1',
    title: 'Outdated jQuery Version with XSS Vulnerabilities',
    description: 'The application uses jQuery 1.12.4 which contains known cross-site scripting vulnerabilities in the html() and append() functions.',
    cveIds: ['CVE-2020-11022', 'CVE-2020-11023'],
    cweIds: ['CWE-79'],
    severity: 'MEDIUM',
    cvssScore: 6.1,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N',
    cvssVersion: '3.1',
    epssScore: 0.0089,
    epssPercentile: 0.82,
    kevListed: false,
    kevDueDate: null,
    status: 'ACCEPTED_RISK',
    assignedToId: 'user-3',
    dueAt: null,
    aiAdvisory: null,
    remediationNotes: 'Legacy application scheduled for decommission in Q3. Risk accepted per CISO approval.',
    findingCount: 2,
    firstSeenAt: '2026-01-15T08:00:00Z',
    lastSeenAt: '2026-03-20T09:00:00Z',
  },
  {
    id: 'case-6',
    organizationId: 'org-1',
    clientId: 'client-1',
    title: 'Weak TLS Configuration',
    description: 'The server supports TLS 1.0 and TLS 1.1 protocols which are deprecated and known to have cryptographic weaknesses.',
    cveIds: [],
    cweIds: ['CWE-326'],
    severity: 'MEDIUM',
    cvssScore: 5.3,
    cvssVector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N',
    cvssVersion: '3.1',
    epssScore: 0.0012,
    epssPercentile: 0.45,
    kevListed: false,
    kevDueDate: null,
    status: 'FIXED_PENDING_VERIFICATION',
    assignedToId: 'user-2',
    dueAt: '2026-04-01',
    aiAdvisory: null,
    remediationNotes: 'Disabled TLS 1.0/1.1 on all load balancers. Pending rescan confirmation.',
    findingCount: 3,
    firstSeenAt: '2026-02-01T10:00:00Z',
    lastSeenAt: '2026-03-18T12:00:00Z',
  },
  {
    id: 'case-7',
    organizationId: 'org-1',
    clientId: 'client-1',
    title: 'Exposed Debug Endpoint in Production',
    description: 'The /debug/pprof endpoint is accessible without authentication in the production environment, potentially leaking application internals.',
    cveIds: [],
    cweIds: ['CWE-489'],
    severity: 'LOW',
    cvssScore: 3.7,
    cvssVector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N',
    cvssVersion: '3.1',
    epssScore: 0.0003,
    epssPercentile: 0.12,
    kevListed: false,
    kevDueDate: null,
    status: 'VERIFIED_CLOSED',
    assignedToId: 'user-1',
    dueAt: null,
    aiAdvisory: null,
    remediationNotes: 'Debug endpoint removed from production build. Verified via penetration test.',
    findingCount: 1,
    firstSeenAt: '2026-02-10T14:00:00Z',
    lastSeenAt: '2026-03-01T09:00:00Z',
  },
  {
    id: 'case-8',
    organizationId: 'org-1',
    clientId: 'client-1',
    title: 'Container Image Running as Root',
    description: 'Multiple container images are configured to run processes as the root user, violating the principle of least privilege.',
    cveIds: [],
    cweIds: ['CWE-250'],
    severity: 'MEDIUM',
    cvssScore: 5.5,
    cvssVector: 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N',
    cvssVersion: '3.1',
    epssScore: 0.0005,
    epssPercentile: 0.22,
    kevListed: false,
    kevDueDate: null,
    status: 'TRIAGE',
    assignedToId: null,
    dueAt: '2026-05-01',
    aiAdvisory: null,
    remediationNotes: '',
    findingCount: 5,
    firstSeenAt: '2026-03-12T10:00:00Z',
    lastSeenAt: '2026-03-26T15:00:00Z',
  },
  {
    id: 'case-9',
    organizationId: 'org-1',
    clientId: 'client-1',
    title: 'Insecure Deserialization in Java RMI',
    description: 'The application uses Java RMI with insecure deserialization, allowing attackers to execute arbitrary code by sending crafted serialized objects.',
    cveIds: ['CVE-2023-21931'],
    cweIds: ['CWE-502'],
    severity: 'CRITICAL',
    cvssScore: 9.1,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    cvssVersion: '3.1',
    epssScore: 0.89,
    epssPercentile: 0.993,
    kevListed: true,
    kevDueDate: '2026-04-08',
    status: 'REOPENED',
    assignedToId: 'user-1',
    dueAt: '2026-04-08',
    aiAdvisory: {
      summary: 'Critical deserialization vulnerability in Java RMI. The previous fix was incomplete and the vulnerability has been reopened.',
      recommendation: 'Apply the latest Oracle CPU patch. Implement input validation filters on RMI endpoints. Consider migrating to gRPC or REST APIs.',
      references: ['https://www.oracle.com/security-alerts/'],
      generatedAt: '2026-03-25T16:00:00Z',
    },
    remediationNotes: 'Previous patch was insufficient. Escalated to security team.',
    findingCount: 2,
    firstSeenAt: '2026-02-20T08:00:00Z',
    lastSeenAt: '2026-03-27T10:00:00Z',
  },
  {
    id: 'case-10',
    organizationId: 'org-1',
    clientId: 'client-1',
    title: 'Information Disclosure via Server Headers',
    description: 'The web server exposes detailed version information in HTTP response headers (Server, X-Powered-By), aiding reconnaissance.',
    cveIds: [],
    cweIds: ['CWE-200'],
    severity: 'INFO',
    cvssScore: 0.0,
    cvssVector: null,
    cvssVersion: null,
    epssScore: null,
    epssPercentile: null,
    kevListed: false,
    kevDueDate: null,
    status: 'FALSE_POSITIVE',
    assignedToId: null,
    dueAt: null,
    aiAdvisory: null,
    remediationNotes: 'Headers are from the CDN and cannot be modified. Marked as false positive.',
    findingCount: 1,
    firstSeenAt: '2026-03-20T11:00:00Z',
    lastSeenAt: '2026-03-20T11:00:00Z',
  },
];

// --- Findings ---

export const mockFindings: Finding[] = [
  {
    id: 'finding-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-1',
    scannerType: 'SCA',
    scannerName: 'Snyk',
    observations: {
      packageName: 'org.apache.logging.log4j:log4j-core',
      packageVersion: '2.14.1',
      fixVersion: '2.17.1',
      path: '/app/lib/log4j-core-2.14.1.jar',
      severity: 'CRITICAL',
    },
    dedupKey: 'snyk-CVE-2021-44228-log4j-core-api-gateway',
    vulnerabilityCaseId: 'case-1',
    discoveredAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'finding-2',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-4',
    scannerType: 'CONTAINER',
    scannerName: 'Trivy',
    observations: {
      image: 'internal-registry/api-service:v2.3.1',
      layer: 'sha256:abc123...',
      packageName: 'log4j-core',
      installedVersion: '2.14.0',
      fixedVersion: '2.17.1',
    },
    dedupKey: 'trivy-CVE-2021-44228-log4j-core-k8s-worker',
    vulnerabilityCaseId: 'case-1',
    discoveredAt: '2026-03-02T10:00:00Z',
  },
  {
    id: 'finding-3',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-8',
    scannerType: 'SCA',
    scannerName: 'Snyk',
    observations: {
      packageName: 'org.apache.logging.log4j:log4j-api',
      packageVersion: '2.14.1',
      fixVersion: '2.17.1',
      path: '/app/lib/log4j-api-2.14.1.jar',
    },
    dedupKey: 'snyk-CVE-2021-44228-log4j-api-payment',
    vulnerabilityCaseId: 'case-1',
    discoveredAt: '2026-03-03T14:00:00Z',
  },
  {
    id: 'finding-4',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-1',
    scannerType: 'SCA',
    scannerName: 'Dependabot',
    observations: {
      packageName: 'spring-beans',
      packageVersion: '5.3.17',
      fixVersion: '5.3.18',
      manifest: 'pom.xml',
    },
    dedupKey: 'dependabot-CVE-2022-22965-spring-beans-api-gateway',
    vulnerabilityCaseId: 'case-2',
    discoveredAt: '2026-03-15T09:00:00Z',
  },
  {
    id: 'finding-5',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-8',
    scannerType: 'SCA',
    scannerName: 'Snyk',
    observations: {
      packageName: 'spring-webmvc',
      packageVersion: '5.3.17',
      fixVersion: '5.3.18',
    },
    dedupKey: 'snyk-CVE-2022-22965-spring-webmvc-payment',
    vulnerabilityCaseId: 'case-2',
    discoveredAt: '2026-03-16T11:00:00Z',
  },
  {
    id: 'finding-6',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-1',
    scannerType: 'VM',
    scannerName: 'Qualys',
    observations: {
      qid: 316399,
      title: 'OpenSSL Buffer Overflow (CVE-2022-3602)',
      port: 443,
      protocol: 'TCP',
      service: 'https',
    },
    dedupKey: 'qualys-CVE-2022-3602-api-gateway',
    vulnerabilityCaseId: 'case-3',
    discoveredAt: '2026-03-10T12:00:00Z',
  },
  {
    id: 'finding-7',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-6',
    scannerType: 'VM',
    scannerName: 'Qualys',
    observations: {
      qid: 316399,
      port: 443,
      protocol: 'TCP',
    },
    dedupKey: 'qualys-CVE-2022-3602-cdn-edge',
    vulnerabilityCaseId: 'case-3',
    discoveredAt: '2026-03-10T12:30:00Z',
  },
  {
    id: 'finding-8',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-2',
    scannerType: 'VM',
    scannerName: 'Nessus',
    observations: {
      pluginId: 166587,
      pluginName: 'OpenSSL 3.x < 3.0.7 Buffer Overflow',
      risk: 'High',
    },
    dedupKey: 'nessus-CVE-2022-3602-db-primary',
    vulnerabilityCaseId: 'case-3',
    discoveredAt: '2026-03-11T08:00:00Z',
  },
  {
    id: 'finding-9',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-8',
    scannerType: 'VM',
    scannerName: 'Nessus',
    observations: {
      pluginId: 166587,
      port: 8443,
    },
    dedupKey: 'nessus-CVE-2022-3786-payment-service',
    vulnerabilityCaseId: 'case-3',
    discoveredAt: '2026-03-11T09:00:00Z',
  },
  {
    id: 'finding-10',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-1',
    scannerType: 'DAST',
    scannerName: 'Burp Suite',
    observations: {
      url: 'https://api.example.com/v1/auth/login',
      method: 'POST',
      parameter: 'username',
      evidence: "Input: ' OR 1=1 -- resulted in valid session token",
      confidence: 'Certain',
    },
    dedupKey: 'burp-sqli-auth-login-api-gateway',
    vulnerabilityCaseId: 'case-4',
    discoveredAt: '2026-03-05T10:00:00Z',
  },
  {
    id: 'finding-11',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-3',
    scannerType: 'SCA',
    scannerName: 'npm audit',
    observations: {
      packageName: 'jquery',
      packageVersion: '1.12.4',
      fixVersion: '3.5.0',
      severity: 'moderate',
    },
    dedupKey: 'npm-CVE-2020-11022-jquery-frontend',
    vulnerabilityCaseId: 'case-5',
    discoveredAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'finding-12',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-3',
    scannerType: 'SCA',
    scannerName: 'npm audit',
    observations: {
      packageName: 'jquery',
      packageVersion: '1.12.4',
      fixVersion: '3.5.0',
      advisory: 'Passing HTML containing <option> elements from untrusted sources to jQuery DOM manipulation methods may execute untrusted code.',
    },
    dedupKey: 'npm-CVE-2020-11023-jquery-frontend',
    vulnerabilityCaseId: 'case-5',
    discoveredAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'finding-13',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-1',
    scannerType: 'DAST',
    scannerName: 'OWASP ZAP',
    observations: {
      url: 'https://api.example.com',
      finding: 'TLS 1.0 enabled',
      risk: 'Medium',
    },
    dedupKey: 'zap-tls10-api-gateway',
    vulnerabilityCaseId: 'case-6',
    discoveredAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'finding-14',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-6',
    scannerType: 'VM',
    scannerName: 'Qualys',
    observations: {
      qid: 38657,
      title: 'SSL/TLS Protocol Version 1.0 Deprecated',
      port: 443,
    },
    dedupKey: 'qualys-tls10-cdn-edge',
    vulnerabilityCaseId: 'case-6',
    discoveredAt: '2026-02-02T14:00:00Z',
  },
  {
    id: 'finding-15',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-8',
    scannerType: 'VM',
    scannerName: 'Nessus',
    observations: {
      pluginId: 104743,
      pluginName: 'TLS Version 1.0 Protocol Detection',
      port: 8443,
    },
    dedupKey: 'nessus-tls10-payment',
    vulnerabilityCaseId: 'case-6',
    discoveredAt: '2026-02-03T09:00:00Z',
  },
  {
    id: 'finding-16',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-5',
    scannerType: 'DAST',
    scannerName: 'Burp Suite',
    observations: {
      url: 'https://dev-auth.internal/debug/pprof',
      statusCode: 200,
      finding: 'Go pprof debug endpoint accessible without authentication',
    },
    dedupKey: 'burp-debug-pprof-auth-dev',
    vulnerabilityCaseId: 'case-7',
    discoveredAt: '2026-02-10T14:00:00Z',
  },
  {
    id: 'finding-17',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-4',
    scannerType: 'CONTAINER',
    scannerName: 'Trivy',
    observations: {
      image: 'internal-registry/worker-service:v1.8.0',
      misconfiguration: 'Running as root user',
      severity: 'MEDIUM',
    },
    dedupKey: 'trivy-root-user-worker-1',
    vulnerabilityCaseId: 'case-8',
    discoveredAt: '2026-03-12T10:00:00Z',
  },
  {
    id: 'finding-18',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-4',
    scannerType: 'CONTAINER',
    scannerName: 'Trivy',
    observations: {
      image: 'internal-registry/api-service:v2.3.1',
      misconfiguration: 'Running as root user',
      severity: 'MEDIUM',
    },
    dedupKey: 'trivy-root-user-api-1',
    vulnerabilityCaseId: 'case-8',
    discoveredAt: '2026-03-12T10:30:00Z',
  },
  {
    id: 'finding-19',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-4',
    scannerType: 'IAC',
    scannerName: 'Checkov',
    observations: {
      file: 'k8s/deployments/worker.yaml',
      check: 'CKV_K8S_6',
      checkName: 'Ensure that the container is not running as root',
      guideline: 'https://docs.bridgecrew.io/docs/bc_k8s_6',
    },
    dedupKey: 'checkov-root-user-worker-iac',
    vulnerabilityCaseId: 'case-8',
    discoveredAt: '2026-03-13T08:00:00Z',
  },
  {
    id: 'finding-20',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-4',
    scannerType: 'IAC',
    scannerName: 'Checkov',
    observations: {
      file: 'k8s/deployments/api.yaml',
      check: 'CKV_K8S_6',
      checkName: 'Ensure that the container is not running as root',
    },
    dedupKey: 'checkov-root-user-api-iac',
    vulnerabilityCaseId: 'case-8',
    discoveredAt: '2026-03-13T08:30:00Z',
  },
  {
    id: 'finding-21',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-4',
    scannerType: 'CONTAINER',
    scannerName: 'Grype',
    observations: {
      image: 'internal-registry/batch-processor:v3.1.0',
      misconfiguration: 'USER directive not set - defaults to root',
    },
    dedupKey: 'grype-root-user-batch-processor',
    vulnerabilityCaseId: 'case-8',
    discoveredAt: '2026-03-14T11:00:00Z',
  },
  {
    id: 'finding-22',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-2',
    scannerType: 'SCA',
    scannerName: 'Snyk',
    observations: {
      packageName: 'oracle-java-rmi',
      packageVersion: '17.0.4',
      fixVersion: '17.0.7',
    },
    dedupKey: 'snyk-CVE-2023-21931-java-rmi-db',
    vulnerabilityCaseId: 'case-9',
    discoveredAt: '2026-02-20T08:00:00Z',
  },
  {
    id: 'finding-23',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-8',
    scannerType: 'VM',
    scannerName: 'Qualys',
    observations: {
      qid: 378234,
      title: 'Oracle Java SE Insecure Deserialization',
      port: 1099,
      protocol: 'TCP',
      service: 'rmiregistry',
    },
    dedupKey: 'qualys-CVE-2023-21931-payment-rmi',
    vulnerabilityCaseId: 'case-9',
    discoveredAt: '2026-02-21T09:00:00Z',
  },
  {
    id: 'finding-24',
    organizationId: 'org-1',
    clientId: 'client-1',
    assetId: 'asset-6',
    scannerType: 'DAST',
    scannerName: 'OWASP ZAP',
    observations: {
      url: 'https://cdn.example.com',
      finding: 'Server header reveals version: cloudfront/2.x',
      risk: 'Informational',
    },
    dedupKey: 'zap-info-disclosure-cdn',
    vulnerabilityCaseId: 'case-10',
    discoveredAt: '2026-03-20T11:00:00Z',
  },
];

// --- Status Change Timeline ---

export const mockStatusChanges: StatusChange[] = [
  {
    id: 'sc-1',
    caseId: 'case-1',
    fromStatus: null,
    toStatus: 'NEW',
    reason: 'Auto-created from scanner findings',
    changedBy: 'System',
    changedAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'sc-2',
    caseId: 'case-1',
    fromStatus: 'NEW',
    toStatus: 'TRIAGE',
    reason: 'Critical vulnerability - requires immediate review',
    changedBy: 'Sarah Chen',
    changedAt: '2026-03-01T09:30:00Z',
  },
  {
    id: 'sc-3',
    caseId: 'case-1',
    fromStatus: 'TRIAGE',
    toStatus: 'IN_REMEDIATION',
    reason: 'Assigned to platform team for patching',
    changedBy: 'Sarah Chen',
    changedAt: '2026-03-02T14:00:00Z',
  },
  {
    id: 'sc-4',
    caseId: 'case-9',
    fromStatus: null,
    toStatus: 'NEW',
    reason: 'Auto-created from scanner findings',
    changedBy: 'System',
    changedAt: '2026-02-20T08:00:00Z',
  },
  {
    id: 'sc-5',
    caseId: 'case-9',
    fromStatus: 'NEW',
    toStatus: 'IN_REMEDIATION',
    reason: 'Patching Java RMI endpoints',
    changedBy: 'Mike Johnson',
    changedAt: '2026-02-22T10:00:00Z',
  },
  {
    id: 'sc-6',
    caseId: 'case-9',
    fromStatus: 'IN_REMEDIATION',
    toStatus: 'FIXED_PENDING_VERIFICATION',
    reason: 'Patch applied, awaiting verification scan',
    changedBy: 'Mike Johnson',
    changedAt: '2026-03-10T16:00:00Z',
  },
  {
    id: 'sc-7',
    caseId: 'case-9',
    fromStatus: 'FIXED_PENDING_VERIFICATION',
    toStatus: 'REOPENED',
    reason: 'Verification scan found vulnerability still present on port 1099',
    changedBy: 'System',
    changedAt: '2026-03-20T08:00:00Z',
  },
];

// --- Mock Users ---

export const mockUsers: Record<string, string> = {
  'user-1': 'Sarah Chen',
  'user-2': 'Mike Johnson',
  'user-3': 'Alex Rivera',
};

// --- Helper Functions ---

export function getAssetById(id: string): Asset | undefined {
  return mockAssets.find((a) => a.id === id);
}

export function getCaseById(id: string): VulnerabilityCase | undefined {
  return mockCases.find((c) => c.id === id);
}

export function getFindingById(id: string): Finding | undefined {
  return mockFindings.find((f) => f.id === id);
}

export function getFindingsForCase(caseId: string): Finding[] {
  return mockFindings.filter((f) => f.vulnerabilityCaseId === caseId);
}

export function getStatusChangesForCase(caseId: string): StatusChange[] {
  return mockStatusChanges.filter((sc) => sc.caseId === caseId);
}

export function getCaseForFinding(finding: Finding): VulnerabilityCase | undefined {
  if (!finding.vulnerabilityCaseId) return undefined;
  return getCaseById(finding.vulnerabilityCaseId);
}
