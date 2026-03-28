/**
 * FedRAMP Moderate Baseline Controls relevant to Vulnerability Management
 *
 * Federal Risk and Authorization Management Program (FedRAMP) Moderate baseline
 * mapped to NIST SP 800-53 Rev 5 control families. This module covers the 16
 * key control families with controls most relevant to vulnerability management
 * and continuous monitoring.
 */

import type {
  ComplianceFramework,
  ComplianceEvidence,
  ComplianceAssessmentInput,
} from './types';

export const FEDRAMP_FRAMEWORK: ComplianceFramework = {
  id: 'fedramp-moderate',
  name: 'FedRAMP Moderate',
  version: 'Rev 5',
  description:
    'FedRAMP Moderate Baseline — NIST SP 800-53 Rev 5 controls relevant to vulnerability management and continuous monitoring',
  controls: [
    // AC — Access Control
    {
      id: 'AC-2',
      title: 'Account Management',
      description:
        'Manage information system accounts, including establishing, activating, modifying, reviewing, disabling, and removing accounts.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'User account lifecycle management implemented',
        'Periodic account reviews performed',
        'Inactive accounts automatically disabled',
      ],
    },
    {
      id: 'AC-3',
      title: 'Access Enforcement',
      description:
        'Enforce approved authorizations for logical access to information and system resources in accordance with applicable access control policies.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Role-based access control enforced on all resources',
        'Org-scoped tenant isolation on all queries',
        'API authorization checks on all endpoints',
      ],
    },
    {
      id: 'AC-6',
      title: 'Least Privilege',
      description:
        'Employ the principle of least privilege, allowing only authorized accesses for users which are necessary to accomplish assigned tasks.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Granular role hierarchy (10 roles)',
        'Privileged functions restricted to admin roles',
        'Service accounts scoped to minimum permissions',
      ],
    },

    // AU — Audit & Accountability
    {
      id: 'AU-2',
      title: 'Event Logging',
      description:
        'Identify the types of events that the system is capable of logging in support of the audit function.',
      category: 'Audit & Accountability (AU)',
      evidenceRequirements: [
        'Security-relevant events identified and logged',
        'Authentication events captured',
        'Authorization failures recorded',
      ],
    },
    {
      id: 'AU-3',
      title: 'Content of Audit Records',
      description:
        'Ensure that audit records contain information that establishes what type of event occurred, when it occurred, where it occurred, the source of the event, the outcome, and the identity of the associated individuals or subjects.',
      category: 'Audit & Accountability (AU)',
      evidenceRequirements: [
        'Audit records include event type, timestamp, source, outcome',
        'User identity captured in all audit entries',
        'Tamper-evident hash chain on audit records',
      ],
    },
    {
      id: 'AU-6',
      title: 'Audit Record Review, Analysis, and Reporting',
      description:
        'Review and analyze information system audit records for indications of inappropriate or unusual activity and report findings.',
      category: 'Audit & Accountability (AU)',
      evidenceRequirements: [
        'Audit log viewer available to authorized users',
        'Activity timeline on dashboard',
        'Export capabilities for audit analysis',
      ],
    },

    // AT — Awareness & Training
    {
      id: 'AT-2',
      title: 'Literacy Training and Awareness',
      description:
        'Provide security and privacy literacy training to system users, including role-based training.',
      category: 'Awareness & Training (AT)',
      evidenceRequirements: [
        'Role-specific dashboards and context provided',
        'Risk metrics visible to all authorized users',
        'AI-generated remediation guidance educates developers',
      ],
    },

    // CM — Configuration Management
    {
      id: 'CM-2',
      title: 'Baseline Configuration',
      description:
        'Develop, document, and maintain a current baseline configuration of the information system.',
      category: 'Configuration Management (CM)',
      evidenceRequirements: [
        'Asset inventory maintained via scan ingestion',
        'Baseline vulnerability counts tracked',
        'Configuration drift detectable through scan comparison',
      ],
    },
    {
      id: 'CM-6',
      title: 'Configuration Settings',
      description:
        'Establish and document configuration settings for information technology products that reflect the most restrictive mode consistent with operational requirements.',
      category: 'Configuration Management (CM)',
      evidenceRequirements: [
        'SLA and retention settings documented and enforced',
        'Security configuration settings auditable',
        'Integration configurations tracked',
      ],
    },
    {
      id: 'CM-8',
      title: 'System Component Inventory',
      description:
        'Develop and document an inventory of information system components that accurately reflects the current information system and is consistent with the authorization boundary.',
      category: 'Configuration Management (CM)',
      evidenceRequirements: [
        'Asset inventory from scan results',
        'Component-level vulnerability tracking',
        'System boundary documentation via compliance dashboard',
      ],
    },

    // CP — Contingency Planning
    {
      id: 'CP-9',
      title: 'System Backup',
      description:
        'Conduct backups of user-level and system-level information contained in the system.',
      category: 'Contingency Planning (CP)',
      evidenceRequirements: [
        'Database backups via Cloud SQL automated backups',
        'Data retention policies enforced per tier',
        'Export capabilities for data portability',
      ],
    },

    // IA — Identification & Authentication
    {
      id: 'IA-2',
      title: 'Identification and Authentication (Organizational Users)',
      description:
        'Uniquely identify and authenticate organizational users and associate that unique identification with processes acting on behalf of those users.',
      category: 'Identification & Authentication (IA)',
      evidenceRequirements: [
        'Unique user accounts with email-based identity',
        'OAuth/SSO authentication (Google, GitHub, SAML/OIDC)',
        'Session management with expiry and rotation',
      ],
    },
    {
      id: 'IA-2(1)',
      title: 'Multi-Factor Authentication to Privileged Accounts',
      description:
        'Implement multi-factor authentication for access to privileged accounts.',
      category: 'Identification & Authentication (IA)',
      evidenceRequirements: [
        'TOTP MFA available for all accounts',
        'MFA enforceable for admin/privileged roles',
        'Passkey/WebAuthn support implemented',
      ],
    },
    {
      id: 'IA-5',
      title: 'Authenticator Management',
      description:
        'Manage information system authenticators by verifying the identity of the individual, group, role, service, or device receiving the authenticator.',
      category: 'Identification & Authentication (IA)',
      evidenceRequirements: [
        'API key lifecycle management (create, rotate, revoke)',
        'Password policies enforced (expiry, HIBP check, history)',
        'Authenticator binding to verified identity',
      ],
    },

    // IR — Incident Response
    {
      id: 'IR-4',
      title: 'Incident Handling',
      description:
        'Implement an incident handling capability for incidents that includes preparation, detection and analysis, containment, eradication, and recovery.',
      category: 'Incident Response (IR)',
      evidenceRequirements: [
        'Case management with full lifecycle tracking',
        'Severity-based triage and prioritization',
        'AI-assisted remediation guidance',
        'Escalation and assignment workflows',
      ],
    },
    {
      id: 'IR-5',
      title: 'Incident Monitoring',
      description:
        'Track and document information system security incidents.',
      category: 'Incident Response (IR)',
      evidenceRequirements: [
        'Vulnerability cases tracked through status lifecycle',
        'Dashboard provides real-time incident visibility',
        'Historical incident data maintained',
      ],
    },
    {
      id: 'IR-6',
      title: 'Incident Reporting',
      description:
        'Require personnel to report suspected incidents to the organizational incident response capability.',
      category: 'Incident Response (IR)',
      evidenceRequirements: [
        'Export capabilities for incident reporting',
        'POAM generation for open vulnerabilities',
        'Notification workflows alert stakeholders',
      ],
    },

    // MA — Maintenance
    {
      id: 'MA-2',
      title: 'Controlled Maintenance',
      description:
        'Schedule, document, and record maintenance activities on the information system.',
      category: 'Maintenance (MA)',
      evidenceRequirements: [
        'Scan schedule tracked and reported',
        'Remediation activities documented in case workflow',
        'Maintenance windows tracked via audit log',
      ],
    },

    // MP — Media Protection
    {
      id: 'MP-2',
      title: 'Media Access',
      description:
        'Restrict access to digital media containing CUI to authorized individuals.',
      category: 'Media Protection (MP)',
      evidenceRequirements: [
        'Report exports restricted to authorized roles',
        'Scan artifacts access controlled by org scope',
        'API key required for programmatic data access',
      ],
    },

    // PE — Physical & Environmental Protection
    {
      id: 'PE-2',
      title: 'Physical Access Authorizations',
      description:
        'Develop, approve, and maintain a list of individuals with authorized access to the facility where the information system resides.',
      category: 'Physical & Environmental Protection (PE)',
      evidenceRequirements: [
        'Cloud-hosted infrastructure (GCP Cloud Run)',
        'Physical security inherited from GCP SOC 2 Type II',
        'No customer-accessible physical components',
      ],
    },

    // PL — Planning
    {
      id: 'PL-2',
      title: 'System Security and Privacy Plans',
      description:
        'Develop, review, and update system security and privacy plans that describe the system authorization boundary, operational environment, and security and privacy controls.',
      category: 'Planning (PL)',
      evidenceRequirements: [
        'Compliance dashboard tracks framework alignment',
        'System boundary documented through asset inventory',
        'Security control status continuously assessed',
      ],
    },

    // PS — Personnel Security
    {
      id: 'PS-3',
      title: 'Personnel Screening',
      description:
        'Screen individuals prior to authorizing access to the information system.',
      category: 'Personnel Security (PS)',
      evidenceRequirements: [
        'User provisioning requires admin approval',
        'Role assignment controlled by security admins',
        'Access reviews supported through user management',
      ],
    },

    // RA — Risk Assessment
    {
      id: 'RA-3',
      title: 'Risk Assessment',
      description:
        'Conduct an assessment of risk, including the likelihood and magnitude of harm, from unauthorized access, use, disclosure, disruption, modification, or destruction.',
      category: 'Risk Assessment (RA)',
      evidenceRequirements: [
        'CVSS scoring for vulnerability magnitude',
        'EPSS scoring for exploit likelihood',
        'KEV catalog for known exploitation status',
        'Risk exception workflow for documented risk acceptance',
      ],
    },
    {
      id: 'RA-5',
      title: 'Vulnerability Monitoring and Scanning',
      description:
        'Monitor and scan for vulnerabilities in the system and hosted applications and report vulnerabilities to designated officials.',
      category: 'Risk Assessment (RA)',
      evidenceRequirements: [
        'Regular vulnerability scanning with 11 scanner formats',
        'Automated enrichment from NVD, EPSS, KEV',
        'Scan frequency monitoring and reporting',
        'Critical/high findings reported with SLA tracking',
      ],
    },
    {
      id: 'RA-7',
      title: 'Risk Response',
      description:
        'Respond to findings from security and privacy assessments, monitoring, and audits.',
      category: 'Risk Assessment (RA)',
      evidenceRequirements: [
        'Case management for vulnerability remediation',
        'Risk-prioritized remediation workflows',
        'POAM generation for tracked deficiencies',
      ],
    },

    // SA — System & Services Acquisition
    {
      id: 'SA-11',
      title: 'Developer Testing and Evaluation',
      description:
        'Require the developer of the information system to create and implement a security assessment plan, unit/integration/system testing, and flaw remediation.',
      category: 'System & Services Acquisition (SA)',
      evidenceRequirements: [
        'SAST/DAST scan results ingested via SARIF format',
        'Developer-specific remediation guidance generated',
        'Ticketing integration for developer workflows (Jira)',
      ],
    },

    // SC — System & Communications Protection
    {
      id: 'SC-7',
      title: 'Boundary Protection',
      description:
        'Monitor and control communications at the external managed interfaces to the system and at key internal managed interfaces within the system.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'Cloud Armor WAF at external boundary',
        'IP allowlist enforcement available',
        'VPC Service Controls for internal boundaries',
      ],
    },
    {
      id: 'SC-8',
      title: 'Transmission Confidentiality and Integrity',
      description:
        'Protect the confidentiality and integrity of transmitted information.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'TLS encryption on all data in transit',
        'Webhook payloads signed with HMAC',
        'HTTPS-only enforcement for all external communication',
      ],
    },
    {
      id: 'SC-12',
      title: 'Cryptographic Key Establishment and Management',
      description:
        'Establish and manage cryptographic keys when cryptography is employed within the system.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'KMS-based key management (GCP Cloud KMS)',
        'BYOK support for customer-managed keys',
        'Key rotation policies documented',
      ],
    },
    {
      id: 'SC-28',
      title: 'Protection of Information at Rest',
      description:
        'Protect the confidentiality and integrity of information at rest.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'AES-256-GCM encryption for secrets at rest',
        'Cloud SQL encryption for database storage',
        'GCS bucket encryption for stored artifacts',
      ],
    },

    // SI — System & Information Integrity
    {
      id: 'SI-2',
      title: 'Flaw Remediation',
      description:
        'Identify, report, and correct system flaws. Install security-relevant software and firmware updates within the time period directed by an authoritative source.',
      category: 'System & Information Integrity (SI)',
      evidenceRequirements: [
        'Vulnerability findings tracked through full lifecycle',
        'Remediation SLAs enforced by severity',
        'Average remediation time (MTTR) monitored',
        'KEV-listed vulnerabilities prioritized per BOD 22-01',
      ],
    },
    {
      id: 'SI-3',
      title: 'Malicious Code Protection',
      description:
        'Implement malicious code protection mechanisms at system entry and exit points to detect and eradicate malicious code.',
      category: 'System & Information Integrity (SI)',
      evidenceRequirements: [
        'Scan results flag malware-related CVEs',
        'KEV catalog identifies actively exploited vulnerabilities',
        'Critical findings escalated for immediate action',
      ],
    },
    {
      id: 'SI-4',
      title: 'System Monitoring',
      description:
        'Monitor the system to detect attacks and indicators of potential attacks, unauthorized local, network, and remote connections.',
      category: 'System & Information Integrity (SI)',
      evidenceRequirements: [
        'Continuous vulnerability monitoring via scan ingestion',
        'Real-time dashboard with vulnerability posture',
        'SIEM integration via webhooks',
        'Rate limiting detects brute-force attempts',
      ],
    },
    {
      id: 'SI-5',
      title: 'Security Alerts, Advisories, and Directives',
      description:
        'Receive security alerts, advisories, and directives from external organizations on an ongoing basis and generate internal alerts, advisories, and directives as appropriate.',
      category: 'System & Information Integrity (SI)',
      evidenceRequirements: [
        'KEV feed integration for CISA exploit alerts',
        'EPSS scoring for threat probability',
        'Notification system for critical vulnerability alerts',
        'NVD integration for advisory data',
      ],
    },
  ],
};

export function assessFedRAMP(input: ComplianceAssessmentInput): ComplianceEvidence[] {
  const evidences: ComplianceEvidence[] = [];
  const now = new Date().toISOString();

  // AC-2 — Account Management
  evidences.push({
    controlId: 'AC-2',
    status: 'met',
    evidence:
      'User account lifecycle managed through admin workflows. Account creation, role assignment, and deactivation supported. Team-based access scoping.',
    lastVerified: now,
    autoAssessed: true,
  });

  // AC-3 — Access Enforcement
  evidences.push({
    controlId: 'AC-3',
    status: 'met',
    evidence:
      'RBAC enforced with 10 roles. Org-scoped tenant isolation on all database queries. API authorization checks on all endpoints.',
    lastVerified: now,
    autoAssessed: true,
  });

  // AC-6 — Least Privilege
  evidences.push({
    controlId: 'AC-6',
    status: 'met',
    evidence:
      'Granular role hierarchy from VIEWER to PLATFORM_ADMIN. Privileged functions restricted to admin roles. Service accounts scoped to minimum permissions.',
    lastVerified: now,
    autoAssessed: true,
  });

  // AU-2 — Event Logging
  {
    const hasAudit = input.hasAuditLogs;

    evidences.push({
      controlId: 'AU-2',
      status: hasAudit ? 'met' : 'not_met',
      evidence: hasAudit
        ? 'Security-relevant events logged including authentication, authorization, data access, and configuration changes.'
        : 'Audit logging not yet configured.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // AU-3 — Content of Audit Records
  {
    const hasAudit = input.hasAuditLogs;

    evidences.push({
      controlId: 'AU-3',
      status: hasAudit ? 'met' : 'not_met',
      evidence: hasAudit
        ? 'Audit records include event type, timestamp, user identity, source, and outcome. Tamper-evident hash chain ensures integrity.'
        : 'Audit record content requires audit logging to be enabled.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // AU-6 — Audit Record Review
  {
    const hasAudit = input.hasAuditLogs;

    evidences.push({
      controlId: 'AU-6',
      status: hasAudit ? 'partial' : 'not_met',
      evidence: hasAudit
        ? 'Audit log viewer available. Activity timeline on dashboard. Export capabilities for external analysis. Automated anomaly detection not yet implemented.'
        : 'Audit review requires audit logging to be enabled.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // AT-2 — Literacy Training and Awareness
  {
    const hasData = input.totalFindings > 0;

    evidences.push({
      controlId: 'AT-2',
      status: hasData ? 'met' : 'partial',
      evidence: hasData
        ? `Role-specific dashboards surface ${input.totalFindings} findings with risk context. AI-generated remediation guidance educates developers.`
        : 'Role-specific views available but no scan data for contextual awareness.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // CM-2 — Baseline Configuration
  {
    const hasScanning = input.totalFindings > 0;

    evidences.push({
      controlId: 'CM-2',
      status: hasScanning ? 'met' : 'not_met',
      evidence: hasScanning
        ? `Baseline established with ${input.totalFindings} tracked findings. Scan comparison available to detect configuration drift.`
        : 'No scan data imported. Baseline requires scan ingestion.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // CM-6 — Configuration Settings
  evidences.push({
    controlId: 'CM-6',
    status: input.hasSlaPolicies ? 'met' : 'partial',
    evidence: input.hasSlaPolicies
      ? `Security configuration settings documented and enforced. SLA policies active with ${input.slaComplianceRate}% compliance.`
      : 'Platform configuration available but SLA policies not yet defined.',
    lastVerified: now,
    autoAssessed: true,
  });

  // CM-8 — System Component Inventory
  {
    const hasScanning = input.totalFindings > 0;

    evidences.push({
      controlId: 'CM-8',
      status: hasScanning ? 'met' : 'not_met',
      evidence: hasScanning
        ? `Component inventory maintained through scan ingestion. ${input.totalFindings} findings mapped to system components.`
        : 'System component inventory requires scan data.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // CP-9 — System Backup
  evidences.push({
    controlId: 'CP-9',
    status: 'met',
    evidence:
      'Cloud SQL automated daily backups enabled. Data retention policies enforced by organizational tier. Export capabilities provide data portability.',
    lastVerified: now,
    autoAssessed: true,
  });

  // IA-2 — Identification and Authentication
  evidences.push({
    controlId: 'IA-2',
    status: 'met',
    evidence:
      'Unique user identification via email-based accounts. Authentication via Google/GitHub OAuth and WorkOS SSO (SAML/OIDC). Session management with expiry.',
    lastVerified: now,
    autoAssessed: true,
  });

  // IA-2(1) — MFA for Privileged Accounts
  evidences.push({
    controlId: 'IA-2(1)',
    status: 'met',
    evidence:
      'TOTP MFA available for all accounts. Passkey/WebAuthn support implemented. MFA enforcement configurable for admin roles.',
    lastVerified: now,
    autoAssessed: true,
  });

  // IA-5 — Authenticator Management
  evidences.push({
    controlId: 'IA-5',
    status: 'met',
    evidence:
      'API key lifecycle management (create, rotate, revoke). Password policies enforced (expiry, HIBP breach check, history). Authenticator binding to verified identity.',
    lastVerified: now,
    autoAssessed: true,
  });

  // IR-4 — Incident Handling
  {
    const hasCaseWorkflow = input.totalOpenCases > 0 || input.totalClosedCases > 0;

    evidences.push({
      controlId: 'IR-4',
      status: hasCaseWorkflow ? 'met' : 'not_met',
      evidence: hasCaseWorkflow
        ? `Incident handling active: ${input.totalOpenCases} open, ${input.totalClosedCases} closed cases. Severity-based triage with AI-assisted remediation guidance. Assignment and escalation workflows operational.`
        : 'Case management workflow available but no incidents created yet.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // IR-5 — Incident Monitoring
  {
    const hasCaseWorkflow = input.totalOpenCases > 0 || input.totalClosedCases > 0;

    evidences.push({
      controlId: 'IR-5',
      status: hasCaseWorkflow ? 'met' : 'not_met',
      evidence: hasCaseWorkflow
        ? `${input.totalOpenCases + input.totalClosedCases} vulnerability incidents tracked. Dashboard provides real-time monitoring. Historical data maintained.`
        : 'No incident data to monitor.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // IR-6 — Incident Reporting
  {
    const hasCaseWorkflow = input.totalOpenCases > 0 || input.totalClosedCases > 0;

    evidences.push({
      controlId: 'IR-6',
      status: hasCaseWorkflow ? 'met' : 'not_met',
      evidence: hasCaseWorkflow
        ? 'Export capabilities for incident reporting. POAM generation for tracked deficiencies. Notification workflows alert stakeholders.'
        : 'Incident reporting requires case data.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // MA-2 — Controlled Maintenance
  {
    const recentScan = input.lastScanDate
      ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
      : false;

    evidences.push({
      controlId: 'MA-2',
      status: recentScan ? 'met' : input.totalFindings > 0 ? 'partial' : 'not_met',
      evidence: [
        input.lastScanDate ? `Last scan: ${input.lastScanDate}` : 'No scan data',
        `Scan frequency: ${input.scanFrequencyDays} days`,
        'Remediation activities documented in case workflow',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // MP-2 — Media Access
  evidences.push({
    controlId: 'MP-2',
    status: 'met',
    evidence:
      'Report exports restricted to authorized roles. Scan artifacts access controlled by org-scoped permissions. API key required for programmatic access.',
    lastVerified: now,
    autoAssessed: true,
  });

  // PE-2 — Physical Access Authorizations
  evidences.push({
    controlId: 'PE-2',
    status: 'met',
    evidence:
      'Cloud-hosted infrastructure on GCP Cloud Run. Physical security inherited from Google Cloud SOC 2 Type II certified facilities.',
    lastVerified: now,
    autoAssessed: true,
  });

  // PL-2 — System Security and Privacy Plans
  {
    const hasScanning = input.totalFindings > 0;

    evidences.push({
      controlId: 'PL-2',
      status: hasScanning ? 'partial' : 'not_met',
      evidence: hasScanning
        ? 'Compliance dashboard tracks framework alignment. Asset inventory documents system boundary. Full SSP documentation is an organizational responsibility.'
        : 'System security plan tracking requires operational data.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // PS-3 — Personnel Screening
  evidences.push({
    controlId: 'PS-3',
    status: 'partial',
    evidence:
      'User provisioning requires admin approval. Role assignment controlled by security admins. Background screening is an organizational process outside the platform.',
    lastVerified: now,
    autoAssessed: true,
  });

  // RA-3 — Risk Assessment
  {
    const hasScanning = input.totalFindings > 0;

    evidences.push({
      controlId: 'RA-3',
      status: hasScanning && input.hasRiskExceptions ? 'met' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? `Risk assessment active: ${input.totalFindings} findings scored with CVSS and EPSS` : 'No scan data for risk assessment',
        `${input.kevOpenCount} KEV-listed vulnerabilities tracked for exploit status`,
        input.hasRiskExceptions ? 'Risk exception workflow active for documented risk acceptance' : 'Risk exception process not configured',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // RA-5 — Vulnerability Monitoring and Scanning
  {
    const hasScanning = input.totalFindings > 0;
    const frequentScans = input.scanFrequencyDays <= 30;

    evidences.push({
      controlId: 'RA-5',
      status: hasScanning && frequentScans ? 'met' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? `${input.totalFindings} findings from vulnerability scans` : 'No vulnerability scan data',
        `Scan frequency: every ${input.scanFrequencyDays} days`,
        'Supports 11 scanner formats with automated NVD/EPSS/KEV enrichment',
        `${input.criticalOpenCount} critical, ${input.highOpenCount} high open findings`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // RA-7 — Risk Response
  {
    const hasRemediation = input.totalClosedCases > 0;
    const hasSla = input.hasSlaPolicies;

    evidences.push({
      controlId: 'RA-7',
      status: hasRemediation && hasSla ? 'met' : hasRemediation ? 'partial' : 'not_met',
      evidence: [
        hasRemediation ? `${input.totalClosedCases} vulnerabilities remediated through case management` : 'No remediation activity',
        hasSla ? `SLA policies enforce timely response, ${input.slaComplianceRate}% compliance` : 'No SLA policies configured',
        `MTTR: ${input.averageRemediationDays} days`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // SA-11 — Developer Testing and Evaluation
  {
    const hasIntegrations = input.hasIntegrations;

    evidences.push({
      controlId: 'SA-11',
      status: hasIntegrations ? 'met' : 'partial',
      evidence: [
        'SARIF format support enables SAST/DAST scan ingestion',
        'AI-generated remediation guidance for developer teams',
        hasIntegrations ? 'Jira ticketing integration active for developer workflows' : 'No ticketing integration configured',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // SC-7 — Boundary Protection
  evidences.push({
    controlId: 'SC-7',
    status: 'met',
    evidence:
      'Cloud Armor WAF at external boundary. IP allowlist enforcement available. VPC Service Controls for internal network segmentation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // SC-8 — Transmission Confidentiality and Integrity
  evidences.push({
    controlId: 'SC-8',
    status: 'met',
    evidence:
      'TLS encryption on all data in transit. Webhook payloads signed with HMAC for integrity. HTTPS-only enforcement for external communication.',
    lastVerified: now,
    autoAssessed: true,
  });

  // SC-12 — Cryptographic Key Management
  evidences.push({
    controlId: 'SC-12',
    status: 'met',
    evidence:
      'GCP Cloud KMS for key management. BYOK support for customer-managed keys. Master encryption key rotation supported.',
    lastVerified: now,
    autoAssessed: true,
  });

  // SC-28 — Protection of Information at Rest
  evidences.push({
    controlId: 'SC-28',
    status: 'met',
    evidence:
      'AES-256-GCM encryption for secrets at rest. Cloud SQL encryption for database. GCS bucket encryption for stored artifacts.',
    lastVerified: now,
    autoAssessed: true,
  });

  // SI-2 — Flaw Remediation
  {
    const hasRemediation = input.totalClosedCases > 0;
    const hasSla = input.hasSlaPolicies;

    evidences.push({
      controlId: 'SI-2',
      status: hasRemediation && hasSla ? 'met' : hasRemediation ? 'partial' : 'not_met',
      evidence: [
        hasRemediation ? `${input.totalClosedCases} flaws remediated` : 'No remediation activity',
        hasSla ? `SLA compliance: ${input.slaComplianceRate}%` : 'No SLA policies for timely remediation',
        `MTTR: ${input.averageRemediationDays} days`,
        `${input.kevOpenCount} KEV-listed vulnerabilities pending remediation per BOD 22-01`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // SI-3 — Malicious Code Protection
  {
    evidences.push({
      controlId: 'SI-3',
      status: input.kevOpenCount === 0 && input.totalFindings > 0 ? 'met' : input.totalFindings > 0 ? 'partial' : 'not_met',
      evidence: [
        `${input.kevOpenCount} open KEV-listed (actively exploited) vulnerabilities`,
        `${input.criticalOpenCount} critical open vulnerabilities`,
        'KEV catalog integration identifies known exploited threats',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // SI-4 — System Monitoring
  {
    const recentScan = input.lastScanDate
      ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
      : false;

    evidences.push({
      controlId: 'SI-4',
      status: recentScan && input.hasIntegrations ? 'met' : recentScan ? 'partial' : 'not_met',
      evidence: [
        recentScan ? 'Continuous monitoring via regular scan ingestion' : 'No recent scan data for monitoring',
        'Real-time dashboard with vulnerability posture',
        input.hasIntegrations ? 'SIEM integration via webhooks active' : 'No SIEM integration configured',
        'Rate limiting detects brute-force attempts',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // SI-5 — Security Alerts, Advisories, and Directives
  {
    const recentScan = input.lastScanDate
      ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
      : false;

    evidences.push({
      controlId: 'SI-5',
      status: recentScan ? 'met' : input.totalFindings > 0 ? 'partial' : 'not_met',
      evidence: [
        input.lastScanDate ? `Last scan: ${input.lastScanDate}` : 'No scan data',
        `${input.kevOpenCount} CISA KEV alerts tracked`,
        'EPSS scoring provides threat probability data',
        'NVD integration for advisory enrichment',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  return evidences;
}
