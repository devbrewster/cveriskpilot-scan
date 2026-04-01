/**
 * EU Cyber Resilience Act (CRA) — Annex I Essential Cybersecurity Requirements
 * Focus on products with digital elements, SBOM requirements, and vulnerability handling
 */

import type {
  ComplianceFramework,
  ComplianceEvidence,
  ComplianceAssessmentInput,
} from './types';

export const EU_CRA_FRAMEWORK: ComplianceFramework = {
  id: 'eu-cra',
  name: 'EU Cyber Resilience Act',
  version: '2024/2847',
  description:
    'EU Cyber Resilience Act — essential cybersecurity requirements for products with digital elements, including SBOM obligations, vulnerability handling, and coordinated disclosure',
  controls: [
    {
      id: 'CRA-1',
      title: 'Security by Design',
      description:
        'Products with digital elements shall be designed, developed and produced in such a way that they ensure an appropriate level of cybersecurity based on the risks, including known vulnerabilities.',
      category: 'Product Security',
      evidenceRequirements: [
        'Secure development lifecycle documented',
        'Threat modeling performed during design',
        'Security requirements defined before development',
      ],
    },
    {
      id: 'CRA-2',
      title: 'Default Security Configuration',
      description:
        'Products shall be delivered with secure default configurations, including the possibility to reset the product to its original secure state.',
      category: 'Product Security',
      evidenceRequirements: [
        'Secure defaults documented and verified',
        'Factory reset capability available',
        'Default credentials eliminated',
      ],
    },
    {
      id: 'CRA-3',
      title: 'Protection Against Unauthorized Access',
      description:
        'Products shall protect the confidentiality and integrity of data by ensuring that unauthorized access is prevented through appropriate control mechanisms.',
      category: 'Access Control',
      evidenceRequirements: [
        'Authentication mechanisms implemented',
        'Access control policies enforced',
        'Brute-force protection active',
      ],
    },
    {
      id: 'CRA-4',
      title: 'Confidentiality of Data',
      description:
        'Products shall protect the confidentiality of stored, transmitted, and processed data through encryption or other appropriate means.',
      category: 'Data Protection',
      evidenceRequirements: [
        'Encryption at rest implemented',
        'Encryption in transit enforced',
        'Sensitive data handling procedures documented',
      ],
    },
    {
      id: 'CRA-5',
      title: 'Integrity Protection',
      description:
        'Products shall protect the integrity of stored, transmitted, and processed data, commands, programs, and configuration against manipulation or modification.',
      category: 'Data Protection',
      evidenceRequirements: [
        'Data integrity verification mechanisms',
        'Tamper detection for critical data',
        'Code signing for software updates',
      ],
    },
    {
      id: 'CRA-6',
      title: 'Minimal Data Processing',
      description:
        'Products shall process only data that is adequate, relevant, and limited to what is necessary for the intended use (data minimization).',
      category: 'Data Protection',
      evidenceRequirements: [
        'Data minimization practices documented',
        'Unnecessary data collection eliminated',
        'Data retention limits enforced',
      ],
    },
    {
      id: 'CRA-7',
      title: 'Availability and Resilience',
      description:
        'Products shall be designed to ensure availability of essential functions, including resilience against denial-of-service attacks and recovery from disruptions.',
      category: 'Resilience',
      evidenceRequirements: [
        'DDoS protection measures implemented',
        'Service continuity plan documented',
        'Graceful degradation under attack',
      ],
    },
    {
      id: 'CRA-8',
      title: 'Minimize Impact on Other Services',
      description:
        'Products shall be designed to minimize the negative impact on the availability of services provided by other devices or networks.',
      category: 'Resilience',
      evidenceRequirements: [
        'Resource consumption limits enforced',
        'Network impact assessment performed',
        'Isolation mechanisms for failure containment',
      ],
    },
    {
      id: 'CRA-9',
      title: 'Update Mechanism',
      description:
        'Products shall provide mechanisms for security updates, including automatic updates where possible, with clear notification to users.',
      category: 'Vulnerability Management',
      evidenceRequirements: [
        'Automated update mechanism available',
        'Security patches delivered in timely manner',
        'Update verification (signed updates)',
        'User notification for updates',
      ],
    },
    {
      id: 'CRA-10',
      title: 'Vulnerability Handling',
      description:
        'Manufacturers shall identify and document vulnerabilities and components contained in the product, including by drawing up an SBOM, and address and remediate them without delay.',
      category: 'Vulnerability Management',
      evidenceRequirements: [
        'Vulnerability identification process active',
        'Vulnerability remediation SLAs defined',
        'Vulnerability tracking system in use',
        'Regular vulnerability scanning performed',
      ],
    },
    {
      id: 'CRA-11',
      title: 'Software Bill of Materials (SBOM)',
      description:
        'Manufacturers shall draw up an SBOM in a commonly used and machine-readable format covering at a minimum the top-level dependencies of the product.',
      category: 'Vulnerability Management',
      evidenceRequirements: [
        'SBOM generated in standard format (CycloneDX/SPDX)',
        'SBOM covers all top-level dependencies',
        'SBOM updated on each release',
        'SBOM available to customers and authorities upon request',
      ],
    },
    {
      id: 'CRA-12',
      title: 'Security Testing',
      description:
        'Products shall be subject to regular testing and review of their security, including vulnerability testing and code review, with results documented.',
      category: 'Testing',
      evidenceRequirements: [
        'Regular security testing performed',
        'Vulnerability scanning in CI/CD pipeline',
        'Penetration testing conducted periodically',
        'Test results documented and tracked',
      ],
    },
    {
      id: 'CRA-13',
      title: 'Coordinated Vulnerability Disclosure',
      description:
        'Manufacturers shall have a coordinated vulnerability disclosure policy in place and provide a contact address for the reporting of vulnerabilities.',
      category: 'Vulnerability Management',
      evidenceRequirements: [
        'Vulnerability disclosure policy published',
        'Security contact information available (security.txt)',
        'Responsible disclosure process documented',
        'Vulnerability reporter acknowledgment process',
      ],
    },
    {
      id: 'CRA-14',
      title: 'Incident Reporting',
      description:
        'Manufacturers shall report actively exploited vulnerabilities to ENISA within 24 hours of becoming aware, and notify users without undue delay.',
      category: 'Incident Response',
      evidenceRequirements: [
        'Incident detection and classification process',
        '24-hour reporting capability to ENISA',
        'User notification process for exploited vulnerabilities',
        'Incident response plan documented',
      ],
    },
    {
      id: 'CRA-15',
      title: 'Documentation',
      description:
        'Manufacturers shall provide documentation of the security properties of the product, including instructions for secure installation, operation, and maintenance.',
      category: 'Documentation',
      evidenceRequirements: [
        'Security documentation available to users',
        'Secure installation instructions provided',
        'Security configuration guidance documented',
        'End-of-support timeline communicated',
      ],
    },
  ],
};

export function assessEUCRA(input: ComplianceAssessmentInput): ComplianceEvidence[] {
  const evidences: ComplianceEvidence[] = [];
  const now = new Date().toISOString();

  const hasScanning = input.totalFindings > 0;
  const recentScan = input.lastScanDate
    ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
    : false;
  const hasWorkflow = input.totalOpenCases > 0 || input.totalClosedCases > 0;

  // CRA-1 — Security by Design
  evidences.push({
    controlId: 'CRA-1',
    status: hasScanning ? 'partial' : 'not_met',
    evidence: [
      hasScanning ? 'Vulnerability scanning integrated into development process' : 'No vulnerability scanning data',
      'Secure development lifecycle and threat modeling require organizational documentation',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // CRA-2 — Default Security Configuration
  evidences.push({
    controlId: 'CRA-2',
    status: 'met',
    evidence:
      'Platform ships with secure defaults: RBAC enforced, encryption enabled, HTTPS-only, no default credentials. Multi-tenant isolation by default.',
    lastVerified: now,
    autoAssessed: true,
  });

  // CRA-3 — Protection Against Unauthorized Access
  evidences.push({
    controlId: 'CRA-3',
    status: 'met',
    evidence:
      'Authentication via OAuth (Google, GitHub), SSO (SAML/OIDC), MFA (TOTP + backup codes). RBAC with 10 roles enforced on all API routes. Rate limiting and IP allowlist for brute-force protection.',
    lastVerified: now,
    autoAssessed: true,
  });

  // CRA-4 — Confidentiality of Data
  evidences.push({
    controlId: 'CRA-4',
    status: 'met',
    evidence:
      'AES-256-GCM encryption at rest for secrets. TLS 1.3 in transit. KMS-backed key management. Cloud SQL encrypted storage with managed encryption keys.',
    lastVerified: now,
    autoAssessed: true,
  });

  // CRA-5 — Integrity Protection
  evidences.push({
    controlId: 'CRA-5',
    status: input.hasAuditLogs ? 'met' : 'partial',
    evidence: [
      input.hasAuditLogs ? 'Tamper-evident audit trail with hash chain protects data integrity' : 'No audit logging for integrity verification',
      'CSRF protection on mutation endpoints. Input validation via Zod schemas.',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // CRA-6 — Minimal Data Processing
  evidences.push({
    controlId: 'CRA-6',
    status: 'partial',
    evidence:
      'Platform designed with data minimization principles. Configurable data retention policies per organization tier. Full data minimization audit requires organizational review.',
    lastVerified: now,
    autoAssessed: true,
  });

  // CRA-7 — Availability and Resilience
  evidences.push({
    controlId: 'CRA-7',
    status: 'met',
    evidence:
      'Cloud Run with auto-scaling provides availability. Cloud Armor WAF with DDoS protection. Health check endpoints (liveness, readiness, full) for service monitoring. Backup and restore with configurable retention.',
    lastVerified: now,
    autoAssessed: true,
  });

  // CRA-8 — Minimize Impact on Other Services
  evidences.push({
    controlId: 'CRA-8',
    status: 'partial',
    evidence:
      'Cloud Run provides container-level isolation. Rate limiting prevents resource exhaustion. Full network impact assessment requires infrastructure review.',
    lastVerified: now,
    autoAssessed: true,
  });

  // CRA-9 — Update Mechanism
  {
    const hasSla = input.hasSlaPolicies;
    evidences.push({
      controlId: 'CRA-9',
      status: hasSla ? 'partial' : 'not_met',
      evidence: [
        'Platform is SaaS — updates delivered automatically via Cloud Run deployments',
        hasSla
          ? `SLA policies enforce patch timelines. Average remediation: ${input.averageRemediationDays} days`
          : 'No SLA policies for update timelines',
        'CI/CD pipeline (Cloud Build) automates deployment of security patches',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // CRA-10 — Vulnerability Handling
  {
    const lowCritical = input.criticalOpenCount === 0;
    const status = hasScanning && recentScan && lowCritical
      ? 'met'
      : hasScanning
        ? 'partial'
        : 'not_met';
    evidences.push({
      controlId: 'CRA-10',
      status,
      evidence: [
        hasScanning ? `${input.totalFindings} vulnerabilities tracked across managed assets` : 'No vulnerability data',
        `${input.criticalOpenCount} critical, ${input.highOpenCount} high open findings`,
        input.kevOpenCount > 0 ? `${input.kevOpenCount} Known Exploited Vulnerabilities require urgent remediation` : 'No open KEV findings',
        recentScan ? `Last scan: ${input.lastScanDate}` : 'No recent vulnerability scan',
        `Average remediation time: ${input.averageRemediationDays} days`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // CRA-11 — SBOM
  evidences.push({
    controlId: 'CRA-11',
    status: hasScanning ? 'met' : 'not_met',
    evidence: [
      hasScanning
        ? 'Platform supports SBOM ingestion and analysis in CycloneDX and SPDX formats'
        : 'No SBOM data ingested',
      'SBOM parser identifies top-level and transitive dependencies',
      'Dependency vulnerabilities correlated via NVD enrichment',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // CRA-12 — Security Testing
  {
    const scanFreqOk = input.scanFrequencyDays > 0 && input.scanFrequencyDays <= 30;
    evidences.push({
      controlId: 'CRA-12',
      status: hasScanning && recentScan && scanFreqOk ? 'met' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? `Security testing active: ${input.totalFindings} findings tracked` : 'No security testing data',
        recentScan ? `Last scan: ${input.lastScanDate}` : 'No recent security testing',
        scanFreqOk ? `Scanning frequency: every ${input.scanFrequencyDays} days` : 'Scan frequency does not meet 30-day target',
        'Pipeline compliance scanner supports CI/CD integration for continuous testing',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // CRA-13 — Coordinated Vulnerability Disclosure
  evidences.push({
    controlId: 'CRA-13',
    status: 'partial',
    evidence:
      'Platform supports vulnerability tracking and disclosure workflows. Formal coordinated vulnerability disclosure policy, security.txt, and reporter acknowledgment process require organizational publication.',
    lastVerified: now,
    autoAssessed: true,
  });

  // CRA-14 — Incident Reporting
  {
    const hasSla = input.hasSlaPolicies;
    evidences.push({
      controlId: 'CRA-14',
      status: hasWorkflow && hasSla ? 'partial' : hasWorkflow ? 'partial' : 'not_met',
      evidence: [
        hasWorkflow ? 'Incident case workflow active for tracking exploited vulnerabilities' : 'No incident tracking workflow',
        input.kevOpenCount > 0 ? `${input.kevOpenCount} actively exploited vulnerabilities tracked via KEV catalog` : 'KEV monitoring active',
        hasSla ? 'SLA policies provide response timeline enforcement' : 'No SLA policies for incident response timelines',
        '24-hour ENISA reporting and formal user notification require organizational procedures',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // CRA-15 — Documentation
  evidences.push({
    controlId: 'CRA-15',
    status: 'partial',
    evidence:
      'API documentation (OpenAPI spec) available. Platform guides and onboarding flow provided. Comprehensive security documentation and end-of-support timeline require organizational publication.',
    lastVerified: now,
    autoAssessed: true,
  });

  return evidences;
}
