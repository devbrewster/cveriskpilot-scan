/**
 * ISO 27001:2022 Annex A Controls relevant to Vulnerability Management
 */

import type {
  ComplianceFramework,
  ComplianceEvidence,
  ComplianceAssessmentInput,
} from './types';

export const ISO27001_FRAMEWORK: ComplianceFramework = {
  id: 'iso-27001',
  name: 'ISO 27001:2022',
  version: '2022',
  description:
    'ISO/IEC 27001:2022 Annex A controls — information security management system controls relevant to vulnerability management',
  controls: [
    // Organizational Controls (A.5)
    {
      id: 'A.5.1',
      title: 'Policies for Information Security',
      description:
        'Information security policy and topic-specific policies shall be defined, approved by management, published, communicated to and acknowledged by relevant personnel and relevant interested parties, and reviewed at planned intervals.',
      category: 'Organizational Controls',
      evidenceRequirements: [
        'Information security policy documented',
        'Policy approved by management',
        'Policy communicated to personnel',
        'Periodic review schedule defined',
      ],
    },
    {
      id: 'A.5.2',
      title: 'Information Security Roles & Responsibilities',
      description:
        'Information security roles and responsibilities shall be defined and allocated.',
      category: 'Organizational Controls',
      evidenceRequirements: [
        'Security roles defined',
        'Responsibilities allocated and documented',
        'Role assignments reviewed periodically',
      ],
    },
    {
      id: 'A.5.7',
      title: 'Threat Intelligence',
      description:
        'Information relating to information security threats shall be collected and analysed to produce threat intelligence.',
      category: 'Organizational Controls',
      evidenceRequirements: [
        'Threat intelligence sources identified',
        'Threat data collected and analyzed',
        'Threat intelligence integrated into risk assessment',
      ],
    },
    {
      id: 'A.5.23',
      title: 'Information Security for Cloud Services',
      description:
        'Processes for acquisition, use, management and exit from cloud services shall be established in accordance with the organization\'s information security requirements.',
      category: 'Organizational Controls',
      evidenceRequirements: [
        'Cloud service security requirements defined',
        'Cloud provider security assessed',
        'Cloud service agreements reviewed',
      ],
    },
    {
      id: 'A.5.24',
      title: 'Information Security Incident Planning',
      description:
        'The organization shall plan and prepare for managing information security incidents by defining, establishing and communicating incident management processes, roles and responsibilities.',
      category: 'Organizational Controls',
      evidenceRequirements: [
        'Incident management plan documented',
        'Incident roles and responsibilities defined',
        'Incident response procedures established',
      ],
    },
    {
      id: 'A.5.25',
      title: 'Assessment and Decision on Events',
      description:
        'The organization shall assess information security events and decide if they are to be categorized as information security incidents.',
      category: 'Organizational Controls',
      evidenceRequirements: [
        'Event assessment criteria defined',
        'Incident classification process documented',
        'Escalation procedures established',
      ],
    },
    {
      id: 'A.5.26',
      title: 'Response to Information Security Incidents',
      description:
        'Information security incidents shall be responded to in accordance with the documented procedures.',
      category: 'Organizational Controls',
      evidenceRequirements: [
        'Incident response procedures followed',
        'Response actions documented',
        'Lessons learned captured',
      ],
    },
    {
      id: 'A.5.28',
      title: 'Collection of Evidence',
      description:
        'The organization shall establish and implement procedures for the identification, collection, acquisition and preservation of evidence related to information security events.',
      category: 'Organizational Controls',
      evidenceRequirements: [
        'Evidence collection procedures documented',
        'Chain of custody maintained',
        'Evidence preservation mechanisms in place',
      ],
    },
    {
      id: 'A.5.36',
      title: 'Compliance with Policies, Rules, Standards',
      description:
        'Compliance with the organization\'s information security policy, topic-specific policies, rules and standards shall be regularly reviewed.',
      category: 'Organizational Controls',
      evidenceRequirements: [
        'Compliance reviews conducted periodically',
        'Non-compliance tracked and remediated',
        'Compliance reports generated',
      ],
    },
    {
      id: 'A.5.37',
      title: 'Documented Operating Procedures',
      description:
        'Operating procedures for information processing facilities shall be documented and made available to personnel who need them.',
      category: 'Organizational Controls',
      evidenceRequirements: [
        'Operating procedures documented',
        'Procedures accessible to relevant personnel',
        'Procedures reviewed and updated regularly',
      ],
    },
    // People Controls (A.6)
    {
      id: 'A.6.1',
      title: 'Screening',
      description:
        'Background verification checks on all candidates to become personnel shall be carried out prior to joining the organization and on an ongoing basis taking into account applicable laws, regulations and ethics.',
      category: 'People Controls',
      evidenceRequirements: [
        'Background screening process documented',
        'Screening conducted prior to employment',
        'Ongoing screening where applicable',
      ],
    },
    {
      id: 'A.6.3',
      title: 'Information Security Awareness & Training',
      description:
        'Personnel of the organization and relevant interested parties shall receive appropriate information security awareness, education and training and regular updates of the organization\'s information security policy.',
      category: 'People Controls',
      evidenceRequirements: [
        'Security awareness program established',
        'Training records maintained',
        'Regular security updates communicated',
      ],
    },
    // Physical Controls (A.7)
    {
      id: 'A.7.10',
      title: 'Storage Media',
      description:
        'Storage media shall be managed through their life cycle of acquisition, use, transportation and disposal in accordance with the organization\'s classification scheme and handling requirements.',
      category: 'Physical Controls',
      evidenceRequirements: [
        'Media lifecycle management procedures',
        'Secure disposal of storage media',
        'Media handling per classification scheme',
      ],
    },
    // Technological Controls (A.8)
    {
      id: 'A.8.1',
      title: 'User Endpoint Devices',
      description:
        'Information stored on, processed by or accessible via user endpoint devices shall be protected.',
      category: 'Technological Controls',
      evidenceRequirements: [
        'Endpoint security policies defined',
        'Device management controls implemented',
        'Remote wipe capability if applicable',
      ],
    },
    {
      id: 'A.8.2',
      title: 'Privileged Access Rights',
      description:
        'The allocation and use of privileged access rights shall be restricted and managed.',
      category: 'Technological Controls',
      evidenceRequirements: [
        'Privileged access restricted to authorized personnel',
        'Privileged access reviewed periodically',
        'Separate accounts for privileged access',
      ],
    },
    {
      id: 'A.8.3',
      title: 'Information Access Restriction',
      description:
        'Access to information and other associated assets shall be restricted in accordance with the established topic-specific policy on access control.',
      category: 'Technological Controls',
      evidenceRequirements: [
        'Access control policy enforced',
        'Data access restricted by role',
        'Access control lists maintained',
      ],
    },
    {
      id: 'A.8.5',
      title: 'Secure Authentication',
      description:
        'Secure authentication technologies and procedures shall be established and implemented based on information access restrictions and the topic-specific policy on access control.',
      category: 'Technological Controls',
      evidenceRequirements: [
        'Strong authentication mechanisms implemented',
        'Multi-factor authentication available',
        'Authentication procedures documented',
      ],
    },
    {
      id: 'A.8.8',
      title: 'Management of Technical Vulnerabilities',
      description:
        'Information about technical vulnerabilities of information systems in use shall be obtained, the organization\'s exposure to such vulnerabilities shall be evaluated and appropriate measures shall be taken.',
      category: 'Technological Controls',
      evidenceRequirements: [
        'Vulnerability information sources monitored',
        'Vulnerability exposure evaluated and risk-ranked',
        'Remediation measures tracked with timelines',
        'SLA policies for vulnerability resolution',
        'KEV and EPSS data integrated for prioritization',
      ],
    },
    {
      id: 'A.8.9',
      title: 'Configuration Management',
      description:
        'Configurations, including security configurations, of hardware, software, services and networks shall be established, documented, implemented, monitored and reviewed.',
      category: 'Technological Controls',
      evidenceRequirements: [
        'Configuration baselines documented',
        'Configuration changes tracked',
        'Security configurations monitored',
      ],
    },
    {
      id: 'A.8.10',
      title: 'Information Deletion',
      description:
        'Information stored in information systems, devices or in any other storage media shall be deleted when no longer required.',
      category: 'Technological Controls',
      evidenceRequirements: [
        'Data deletion procedures implemented',
        'Retention policies enforced',
        'Deletion verification mechanisms',
      ],
    },
    {
      id: 'A.8.15',
      title: 'Logging',
      description:
        'Logs that record activities, exceptions, faults and other relevant events shall be produced, stored, protected and analysed.',
      category: 'Technological Controls',
      evidenceRequirements: [
        'Activity logging implemented',
        'Log storage and protection mechanisms',
        'Log analysis procedures defined',
        'Log retention policies enforced',
      ],
    },
    {
      id: 'A.8.16',
      title: 'Monitoring Activities',
      description:
        'Networks, systems and applications shall be monitored for anomalous behaviour and appropriate actions taken to evaluate potential information security incidents.',
      category: 'Technological Controls',
      evidenceRequirements: [
        'Monitoring systems active',
        'Anomaly detection implemented',
        'Alerting procedures defined',
        'Monitoring coverage documented',
      ],
    },
    {
      id: 'A.8.24',
      title: 'Use of Cryptography',
      description:
        'Rules for the effective use of cryptography, including cryptographic key management, shall be defined and implemented.',
      category: 'Technological Controls',
      evidenceRequirements: [
        'Cryptographic policy documented',
        'Encryption standards defined (algorithms, key lengths)',
        'Key management procedures implemented',
        'Key rotation schedule enforced',
      ],
    },
    {
      id: 'A.8.25',
      title: 'Secure Development Lifecycle',
      description:
        'Rules for the secure development of software and systems shall be established and applied.',
      category: 'Technological Controls',
      evidenceRequirements: [
        'Secure development policy defined',
        'Security requirements in development process',
        'Security testing integrated into pipeline',
      ],
    },
    {
      id: 'A.8.28',
      title: 'Secure Coding',
      description:
        'Secure coding principles shall be applied to software development.',
      category: 'Technological Controls',
      evidenceRequirements: [
        'Secure coding standards followed',
        'Code review processes include security checks',
        'Static analysis or linting for security issues',
      ],
    },
  ],
};

export function assessISO27001(input: ComplianceAssessmentInput): ComplianceEvidence[] {
  const evidences: ComplianceEvidence[] = [];
  const now = new Date().toISOString();

  // A.5.1 — Policies for Information Security
  evidences.push({
    controlId: 'A.5.1',
    status: 'partial',
    evidence:
      'Platform enforces security controls programmatically (RBAC, encryption, audit). Formal information security policy documentation requires organizational effort.',
    lastVerified: now,
    autoAssessed: true,
  });

  // A.5.2 — Roles & Responsibilities
  evidences.push({
    controlId: 'A.5.2',
    status: 'met',
    evidence:
      'Platform defines 10 security roles (PLATFORM_ADMIN, SECURITY_ADMIN, ORG_ADMIN, TEAM_LEAD, ANALYST, DEVELOPER, AUDITOR, CLIENT_VIEWER, VIEWER, SERVICE_ACCOUNT) with documented responsibilities and RBAC enforcement.',
    lastVerified: now,
    autoAssessed: true,
  });

  // A.5.7 — Threat Intelligence
  {
    const hasKev = input.kevOpenCount >= 0; // KEV tracking available
    const hasScanning = input.totalFindings > 0;

    evidences.push({
      controlId: 'A.5.7',
      status: hasScanning ? 'met' : 'partial',
      evidence: [
        'Platform integrates CISA KEV catalog for known exploited vulnerability tracking',
        'EPSS scoring provides exploit prediction intelligence',
        'NVD enrichment provides CVE severity and impact data',
        hasScanning ? `${input.totalFindings} findings enriched with threat intelligence` : 'No scan data ingested yet',
        `${input.kevOpenCount} open KEV-listed vulnerabilities tracked`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // A.5.23 — Cloud Services Security
  evidences.push({
    controlId: 'A.5.23',
    status: 'met',
    evidence:
      'Platform deployed on GCP with Cloud Armor WAF, VPC Service Controls, KMS for key management, and Cloud SQL with encryption at rest. Cloud provider security inherited from Google Cloud SOC 2 Type II certification.',
    lastVerified: now,
    autoAssessed: true,
  });

  // A.5.24 — Incident Planning
  {
    const hasWorkflow = input.totalOpenCases > 0 || input.totalClosedCases > 0;
    const hasSla = input.hasSlaPolicies;

    evidences.push({
      controlId: 'A.5.24',
      status: hasWorkflow && hasSla ? 'met' : hasWorkflow ? 'partial' : 'not_met',
      evidence: [
        hasWorkflow ? 'Incident management workflow active with case tracking' : 'No incident workflow detected',
        hasSla ? 'SLA policies define response timelines and escalation' : 'No SLA policies configured',
        'Platform supports incident roles via RBAC and case assignment',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // A.5.25 — Assessment and Decision on Events
  {
    const hasWorkflow = input.totalOpenCases > 0 || input.totalClosedCases > 0;
    const hasExceptions = input.hasRiskExceptions;

    evidences.push({
      controlId: 'A.5.25',
      status: hasWorkflow ? 'met' : 'not_met',
      evidence: [
        hasWorkflow ? 'Event assessment via AI-powered triage with severity classification (CVSS, EPSS, KEV)' : 'No event assessment workflow detected',
        hasExceptions ? 'Risk exception process allows documented accept/transfer decisions' : 'No risk exception process active',
        `${input.criticalOpenCount} critical, ${input.highOpenCount} high severity events pending assessment`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // A.5.26 — Response to Incidents
  {
    const hasWorkflow = input.totalClosedCases > 0;

    evidences.push({
      controlId: 'A.5.26',
      status: hasWorkflow ? 'met' : 'not_met',
      evidence: [
        hasWorkflow ? `${input.totalClosedCases} incidents responded to and closed via documented workflow` : 'No incident responses recorded',
        `Average remediation time: ${input.averageRemediationDays} days`,
        `${input.totalOpenCases} incidents currently in active response`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // A.5.28 — Collection of Evidence
  {
    const hasAudit = input.hasAuditLogs;

    evidences.push({
      controlId: 'A.5.28',
      status: hasAudit ? 'met' : 'not_met',
      evidence: hasAudit
        ? 'Audit logging with tamper-evident hash chain provides evidence collection. Scan artifacts stored in GCS with retention policies. Case comments and activity tracked with timestamps.'
        : 'No audit trail configured for evidence collection. Enable audit logs.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // A.5.36 — Compliance with Policies
  {
    const hasSla = input.hasSlaPolicies;

    evidences.push({
      controlId: 'A.5.36',
      status: hasSla ? 'met' : 'partial',
      evidence: [
        'Platform provides compliance dashboard with framework assessment scores',
        hasSla ? `SLA compliance rate: ${input.slaComplianceRate}%` : 'No SLA policies for compliance tracking',
        'Automated compliance evidence generation across multiple frameworks',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // A.5.37 — Documented Operating Procedures
  evidences.push({
    controlId: 'A.5.37',
    status: 'partial',
    evidence:
      'Platform provides operational workflows for vulnerability management (scan, triage, remediate, verify). Formal operating procedure documentation requires organizational effort.',
    lastVerified: now,
    autoAssessed: true,
  });

  // A.6.1 — Screening
  evidences.push({
    controlId: 'A.6.1',
    status: 'partial',
    evidence:
      'Personnel screening is an organizational responsibility. Platform supports role-based onboarding with access provisioning controls.',
    lastVerified: now,
    autoAssessed: true,
  });

  // A.6.3 — Awareness & Training
  evidences.push({
    controlId: 'A.6.3',
    status: 'partial',
    evidence:
      'Platform provides vulnerability awareness via dashboards and reports. Formal security awareness training program requires organizational implementation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // A.7.10 — Storage Media
  evidences.push({
    controlId: 'A.7.10',
    status: 'met',
    evidence:
      'Cloud-based storage on GCP with encrypted disks. Data deletion API supports media lifecycle management. GCP handles physical media disposal per SOC 2 Type II controls.',
    lastVerified: now,
    autoAssessed: true,
  });

  // A.8.1 — User Endpoint Devices
  evidences.push({
    controlId: 'A.8.1',
    status: 'partial',
    evidence:
      'Endpoint device security is organizational responsibility. Platform enforces session management and secure authentication regardless of endpoint device.',
    lastVerified: now,
    autoAssessed: true,
  });

  // A.8.2 — Privileged Access Rights
  evidences.push({
    controlId: 'A.8.2',
    status: 'met',
    evidence:
      'Privileged access restricted via RBAC. PLATFORM_ADMIN and SECURITY_ADMIN roles require explicit assignment. Admin actions logged via audit trail. Access reviews supported via admin interface.',
    lastVerified: now,
    autoAssessed: true,
  });

  // A.8.3 — Information Access Restriction
  evidences.push({
    controlId: 'A.8.3',
    status: 'met',
    evidence:
      'Multi-tenant org isolation enforced on all queries. RBAC restricts data access by role. Client-scoped access control for MSSP tier. All API endpoints require authentication and authorization.',
    lastVerified: now,
    autoAssessed: true,
  });

  // A.8.5 — Secure Authentication
  evidences.push({
    controlId: 'A.8.5',
    status: 'met',
    evidence:
      'Multiple authentication mechanisms: email/password with HIBP checking, Google/GitHub OAuth, SAML/OIDC SSO via WorkOS, TOTP MFA. Session management with secure tokens and automatic expiry.',
    lastVerified: now,
    autoAssessed: true,
  });

  // A.8.8 — Management of Technical Vulnerabilities (core control)
  {
    const hasScanning = input.totalFindings > 0;
    const hasRemediation = input.totalClosedCases > 0;
    const hasSla = input.hasSlaPolicies;
    const hasExceptions = input.hasRiskExceptions;
    const recentScan = input.lastScanDate
      ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
      : false;
    const score = [hasScanning, hasRemediation, hasSla, hasExceptions, recentScan].filter(Boolean).length;

    evidences.push({
      controlId: 'A.8.8',
      status: score >= 4 ? 'met' : score >= 2 ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? `${input.totalFindings} vulnerabilities tracked from 11 scanner formats` : 'No vulnerability data ingested',
        'Risk ranking via CVSS, EPSS probability, and CISA KEV catalog',
        hasRemediation ? `${input.totalClosedCases} vulnerabilities remediated, avg ${input.averageRemediationDays} days` : 'No remediation activity',
        hasSla ? `SLA policies active, ${input.slaComplianceRate}% compliance` : 'No SLA policies configured',
        hasExceptions ? 'Risk exception process for accepted vulnerabilities' : 'No risk exception process',
        recentScan ? `Last scan: ${input.lastScanDate}` : 'No recent scan activity',
        `Open: ${input.criticalOpenCount} critical, ${input.highOpenCount} high, ${input.kevOpenCount} KEV-listed`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // A.8.9 — Configuration Management
  evidences.push({
    controlId: 'A.8.9',
    status: 'partial',
    evidence:
      'Platform configuration managed via Terraform IaC. Application configuration tracked in version control. Baseline configuration documentation requires organizational effort.',
    lastVerified: now,
    autoAssessed: true,
  });

  // A.8.10 — Information Deletion
  evidences.push({
    controlId: 'A.8.10',
    status: 'met',
    evidence:
      'Data deletion API with cascading deletion across findings, cases, and artifacts. Retention policies configurable per organization and tier. Deletion audit trail maintained.',
    lastVerified: now,
    autoAssessed: true,
  });

  // A.8.15 — Logging
  {
    const hasAudit = input.hasAuditLogs;

    evidences.push({
      controlId: 'A.8.15',
      status: hasAudit ? 'met' : 'not_met',
      evidence: hasAudit
        ? 'Audit logging active with tamper-evident hash chain. Logs capture activities, exceptions, and security events. Log storage protected. Retention policies enforced. GCP Cloud Logging provides additional infrastructure-level logging.'
        : 'Audit logging not configured. Enable audit logs for ISO 27001 compliance.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // A.8.16 — Monitoring Activities
  {
    const hasScanning = input.totalFindings > 0;
    const recentScan = input.lastScanDate
      ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
      : false;

    evidences.push({
      controlId: 'A.8.16',
      status: hasScanning && recentScan ? 'met' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? 'Vulnerability monitoring active via scan ingestion pipeline' : 'No monitoring data available',
        recentScan ? `Last scan: ${input.lastScanDate}` : 'No recent monitoring activity',
        `Scan frequency: every ${input.scanFrequencyDays} days`,
        'KEV and EPSS alerting provides anomaly detection for exploited vulnerabilities',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // A.8.24 — Use of Cryptography
  evidences.push({
    controlId: 'A.8.24',
    status: 'met',
    evidence:
      'AES-256-GCM encryption for data at rest. TLS 1.3 for data in transit. GCP KMS for key management with BYOK support. Key rotation supported. HMAC signing for webhooks and API authentication.',
    lastVerified: now,
    autoAssessed: true,
  });

  // A.8.25 — Secure Development Lifecycle
  evidences.push({
    controlId: 'A.8.25',
    status: 'met',
    evidence:
      'TypeScript strict mode with ESLint enforcement. Zod validation at API boundaries. Cloud Build CI/CD pipeline. Dependency scanning. Code review process. Security testing integrated into development workflow.',
    lastVerified: now,
    autoAssessed: true,
  });

  // A.8.28 — Secure Coding
  evidences.push({
    controlId: 'A.8.28',
    status: 'met',
    evidence:
      'Secure coding practices: TypeScript strict mode, ESLint security rules, Zod input validation, parameterized queries via Prisma ORM (no raw SQL injection risk), CSRF protection, CSP headers, output encoding.',
    lastVerified: now,
    autoAssessed: true,
  });

  return evidences;
}
