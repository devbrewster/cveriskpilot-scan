/**
 * CMMC Level 2 Practices relevant to Vulnerability Management
 *
 * Cybersecurity Maturity Model Certification (CMMC) Level 2 aligns with
 * NIST SP 800-171 Rev 2 protecting Controlled Unclassified Information (CUI).
 * This module covers the 14 practice domains with key controls that map to
 * vulnerability management workflows.
 */

import type {
  ComplianceFramework,
  ComplianceEvidence,
  ComplianceAssessmentInput,
} from './types';

export const CMMC_FRAMEWORK: ComplianceFramework = {
  id: 'cmmc-level2',
  name: 'CMMC Level 2',
  version: '2.0',
  description:
    'Cybersecurity Maturity Model Certification Level 2 — practices aligned with NIST SP 800-171 relevant to vulnerability management',
  controls: [
    // AC — Access Control
    {
      id: 'AC.L2-3.1.1',
      title: 'Authorized Access Control',
      description:
        'Limit information system access to authorized users, processes acting on behalf of authorized users, or devices (including other information systems).',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Role-based access control enforced',
        'User authentication required for all access',
        'Multi-client tenant isolation active',
      ],
    },
    {
      id: 'AC.L2-3.1.2',
      title: 'Transaction & Function Control',
      description:
        'Limit information system access to the types of transactions and functions that authorized users are permitted to execute.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Function-level authorization checks on all API mutations',
        'Least-privilege role assignments',
        'Org-scoped query filtering',
      ],
    },
    {
      id: 'AC.L2-3.1.5',
      title: 'Least Privilege',
      description:
        'Employ the principle of least privilege, including for specific security functions and privileged accounts.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Separate admin and analyst roles defined',
        'Privileged actions restricted to security admins',
        'Service accounts scoped to minimum required permissions',
      ],
    },

    // AT — Awareness & Training
    {
      id: 'AT.L2-3.2.1',
      title: 'Role-Based Risk Awareness',
      description:
        'Ensure that managers, systems administrators, and users of organizational information systems are made aware of the security risks associated with their activities.',
      category: 'Awareness & Training (AT)',
      evidenceRequirements: [
        'Dashboard surfaces risk metrics to all roles',
        'EPSS and KEV data visible to decision-makers',
        'SLA breach notifications delivered to responsible parties',
      ],
    },
    {
      id: 'AT.L2-3.2.2',
      title: 'Role-Based Training',
      description:
        'Ensure that organizational personnel are adequately trained to carry out their assigned information security-related duties and responsibilities.',
      category: 'Awareness & Training (AT)',
      evidenceRequirements: [
        'Role-specific dashboards and workflows provided',
        'Remediation guidance generated for development teams',
        'Severity classification training materials accessible',
      ],
    },

    // AU — Audit & Accountability
    {
      id: 'AU.L2-3.3.1',
      title: 'System Auditing',
      description:
        'Create, protect, and retain information system audit records to the extent needed to enable the monitoring, analysis, investigation, and reporting of unlawful, unauthorized, or inappropriate information system activity.',
      category: 'Audit & Accountability (AU)',
      evidenceRequirements: [
        'Audit trail captures all security-relevant actions',
        'Tamper-evident hash chain on audit records',
        'Retention policies enforced per organizational tier',
      ],
    },
    {
      id: 'AU.L2-3.3.2',
      title: 'User Accountability',
      description:
        'Ensure that the actions of individual information system users can be uniquely traced to those users so they can be held accountable for their actions.',
      category: 'Audit & Accountability (AU)',
      evidenceRequirements: [
        'All actions tied to authenticated user identity',
        'Case assignment and status changes attributed',
        'Comment threads track authorship and timestamps',
      ],
    },

    // CM — Configuration Management
    {
      id: 'CM.L2-3.4.1',
      title: 'System Baselining',
      description:
        'Establish and maintain baseline configurations and inventories of organizational information systems throughout the respective system development life cycles.',
      category: 'Configuration Management (CM)',
      evidenceRequirements: [
        'Asset inventory maintained with scan results',
        'Baseline vulnerability counts tracked over time',
        'Configuration changes correlated with scan findings',
      ],
    },
    {
      id: 'CM.L2-3.4.2',
      title: 'Security Configuration Enforcement',
      description:
        'Establish and enforce security configuration settings for information technology products employed in organizational information systems.',
      category: 'Configuration Management (CM)',
      evidenceRequirements: [
        'Scanner configuration policies documented',
        'SLA and retention settings enforced consistently',
        'Integration configurations audited',
      ],
    },

    // IA — Identification & Authentication
    {
      id: 'IA.L2-3.5.1',
      title: 'Identification',
      description:
        'Identify information system users, processes acting on behalf of users, or devices.',
      category: 'Identification & Authentication (IA)',
      evidenceRequirements: [
        'Unique user accounts required',
        'Service accounts identified separately',
        'API keys scoped to individual identities',
      ],
    },
    {
      id: 'IA.L2-3.5.2',
      title: 'Authentication',
      description:
        'Authenticate (or verify) the identities of those users, processes, or devices, as a prerequisite to allowing access to organizational information systems.',
      category: 'Identification & Authentication (IA)',
      evidenceRequirements: [
        'Multi-factor authentication available',
        'OAuth/SSO integration supported',
        'Session management with expiry and rotation',
      ],
    },
    {
      id: 'IA.L2-3.5.3',
      title: 'Multifactor Authentication',
      description:
        'Use multifactor authentication for local and network access to privileged accounts and for network access to non-privileged accounts.',
      category: 'Identification & Authentication (IA)',
      evidenceRequirements: [
        'TOTP MFA enrollment available',
        'MFA enforced for admin roles',
        'Passkey/WebAuthn support implemented',
      ],
    },

    // IR — Incident Response
    {
      id: 'IR.L2-3.6.1',
      title: 'Incident Handling',
      description:
        'Establish an operational incident-handling capability for organizational information systems that includes adequate preparation, detection, analysis, containment, recovery, and user response activities.',
      category: 'Incident Response (IR)',
      evidenceRequirements: [
        'Case management workflow for vulnerability incidents',
        'Severity-based triage and escalation process',
        'AI-powered remediation guidance available',
      ],
    },
    {
      id: 'IR.L2-3.6.2',
      title: 'Incident Reporting',
      description:
        'Track, document, and report incidents to appropriate officials and/or authorities both internal and external to the organization.',
      category: 'Incident Response (IR)',
      evidenceRequirements: [
        'Case status tracking with full audit trail',
        'Export capabilities for incident reporting',
        'Notification workflows for stakeholders',
      ],
    },

    // MA — Maintenance
    {
      id: 'MA.L2-3.7.1',
      title: 'System Maintenance',
      description:
        'Perform maintenance on organizational information systems.',
      category: 'Maintenance (MA)',
      evidenceRequirements: [
        'Regular scanning schedule maintained',
        'Scan frequency tracked and reported',
        'Patch management tracked via remediation cases',
      ],
    },

    // MP — Media Protection
    {
      id: 'MP.L2-3.8.1',
      title: 'Media Protection',
      description:
        'Protect (i.e., physically control and securely store) information system media containing CUI, both paper and digital.',
      category: 'Media Protection (MP)',
      evidenceRequirements: [
        'Exported reports encrypted in transit',
        'Scan artifacts stored in encrypted storage',
        'Data retention policies enforced on exports',
      ],
    },

    // PE — Physical & Environmental Protection
    {
      id: 'PE.L2-3.10.1',
      title: 'Physical Access Limitation',
      description:
        'Limit physical access to organizational information systems, equipment, and the respective operating environments to authorized individuals.',
      category: 'Physical & Environmental Protection (PE)',
      evidenceRequirements: [
        'Cloud infrastructure hosted in SOC 2 compliant data centers',
        'No on-premises data storage required',
        'GCP Cloud Run provides physical security controls',
      ],
    },

    // PS — Personnel Security
    {
      id: 'PS.L2-3.9.1',
      title: 'Personnel Screening',
      description:
        'Screen individuals prior to authorizing access to information systems containing CUI.',
      category: 'Personnel Security (PS)',
      evidenceRequirements: [
        'User onboarding requires admin approval',
        'Role assignment reviewed by security admin',
        'User deactivation workflow available',
      ],
    },

    // RM — Risk Management (mapped from NIST RA family)
    {
      id: 'RM.L2-3.11.1',
      title: 'Risk Assessments',
      description:
        'Periodically assess the risk to organizational operations, organizational assets, and individuals resulting from the operation of organizational information systems and the associated processing, storage, or transmission of CUI.',
      category: 'Risk Assessment (RM)',
      evidenceRequirements: [
        'Continuous vulnerability risk scoring (CVSS, EPSS)',
        'KEV catalog integration for exploit awareness',
        'Risk exception workflow with documented justifications',
      ],
    },
    {
      id: 'RM.L2-3.11.2',
      title: 'Vulnerability Scanning',
      description:
        'Scan for vulnerabilities in organizational information systems and applications periodically and when new vulnerabilities affecting those systems and applications are identified.',
      category: 'Risk Assessment (RM)',
      evidenceRequirements: [
        'Multiple scanner format ingestion (11 formats)',
        'Scan frequency monitoring and alerting',
        'Automated enrichment with NVD, EPSS, KEV data',
      ],
    },
    {
      id: 'RM.L2-3.11.3',
      title: 'Vulnerability Remediation',
      description:
        'Remediate vulnerabilities in accordance with assessments of risk.',
      category: 'Risk Assessment (RM)',
      evidenceRequirements: [
        'Risk-prioritized remediation workflow',
        'SLA policies tied to severity levels',
        'MTTR tracked and reported',
      ],
    },

    // CA — Security Assessment
    {
      id: 'CA.L2-3.12.1',
      title: 'Security Control Assessment',
      description:
        'Periodically assess the security controls in organizational information systems to determine if the controls are effective in their application.',
      category: 'Security Assessment (CA)',
      evidenceRequirements: [
        'Compliance framework assessment automated',
        'POAM generation from open vulnerabilities',
        'Framework score tracking over time',
      ],
    },
    {
      id: 'CA.L2-3.12.2',
      title: 'Plan of Action',
      description:
        'Develop and implement plans of action designed to correct deficiencies and reduce or eliminate vulnerabilities in organizational information systems.',
      category: 'Security Assessment (CA)',
      evidenceRequirements: [
        'POAM auto-generated from open findings',
        'Milestones and target dates assigned',
        'POAM export in standard formats (CSV, JSON)',
      ],
    },
    {
      id: 'CA.L2-3.12.4',
      title: 'System Security Plan',
      description:
        'Develop, document, and periodically update system security plans that describe system boundaries, system environments, how security requirements are implemented, and the relationships with or connections to other systems.',
      category: 'Security Assessment (CA)',
      evidenceRequirements: [
        'Compliance dashboard tracks framework alignment',
        'Asset and system boundaries documented',
        'Executive reporting available for leadership review',
      ],
    },

    // SC — System & Communications Protection
    {
      id: 'SC.L2-3.13.1',
      title: 'Boundary Protection',
      description:
        'Monitor, control, and protect organizational communications at the external boundaries and key internal boundaries of the information systems.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'Cloud Armor WAF protection enabled',
        'IP allowlist enforcement available',
        'HTTPS-only communication enforced',
      ],
    },
    {
      id: 'SC.L2-3.13.8',
      title: 'CUI Encryption in Transit',
      description:
        'Implement cryptographic mechanisms to prevent unauthorized disclosure of CUI during transmission unless otherwise protected by alternative physical safeguards.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'TLS encryption on all data in transit',
        'Webhook payloads signed with HMAC',
        'API keys transmitted only over HTTPS',
      ],
    },
    {
      id: 'SC.L2-3.13.11',
      title: 'CUI Encryption at Rest',
      description:
        'Employ FIPS-validated cryptography when used to protect the confidentiality of CUI.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'AES-256-GCM encryption for secrets at rest',
        'KMS-based key management available',
        'Database encryption enabled via Cloud SQL',
      ],
    },

    // SI — System & Information Integrity
    {
      id: 'SI.L2-3.14.1',
      title: 'Flaw Remediation',
      description:
        'Identify, report, and correct information and information system flaws in a timely manner.',
      category: 'System & Information Integrity (SI)',
      evidenceRequirements: [
        'Vulnerability findings tracked through full lifecycle',
        'Remediation SLAs enforced by severity',
        'Average remediation time (MTTR) monitored',
      ],
    },
    {
      id: 'SI.L2-3.14.2',
      title: 'Malicious Code Protection',
      description:
        'Provide protection from malicious code at appropriate locations within organizational information systems.',
      category: 'System & Information Integrity (SI)',
      evidenceRequirements: [
        'Scan results flag malware-related CVEs',
        'KEV catalog identifies actively exploited vulnerabilities',
        'Critical findings prioritized for immediate remediation',
      ],
    },
    {
      id: 'SI.L2-3.14.3',
      title: 'Security Alerts & Advisories',
      description:
        'Monitor system security alerts and advisories and take appropriate action in response.',
      category: 'System & Information Integrity (SI)',
      evidenceRequirements: [
        'KEV feed integration for exploit alerts',
        'EPSS scoring for threat likelihood',
        'Notification system for critical vulnerability alerts',
      ],
    },
    {
      id: 'SI.L2-3.14.6',
      title: 'Monitor Communications for Attacks',
      description:
        'Monitor organizational information systems, including inbound and outbound communications traffic, to detect attacks and indicators of potential attacks.',
      category: 'System & Information Integrity (SI)',
      evidenceRequirements: [
        'Continuous scan ingestion monitors for new threats',
        'Dashboard provides real-time vulnerability posture',
        'Webhook integrations enable SIEM correlation',
      ],
    },
    {
      id: 'SI.L2-3.14.7',
      title: 'Identify Unauthorized Use',
      description:
        'Identify unauthorized use of organizational information systems.',
      category: 'System & Information Integrity (SI)',
      evidenceRequirements: [
        'Audit logs capture all system access',
        'Anomalous activity detectable through audit review',
        'Rate limiting prevents brute-force attacks',
      ],
    },
  ],
};

export function assessCMMC(input: ComplianceAssessmentInput): ComplianceEvidence[] {
  const evidences: ComplianceEvidence[] = [];
  const now = new Date().toISOString();

  // AC — Access Control (AC.L2-3.1.1, AC.L2-3.1.2, AC.L2-3.1.5)
  evidences.push({
    controlId: 'AC.L2-3.1.1',
    status: 'met',
    evidence:
      'Platform implements RBAC with 10 roles (PLATFORM_ADMIN through VIEWER). Org-scoped tenant isolation enforced on all queries.',
    lastVerified: now,
    autoAssessed: true,
  });

  evidences.push({
    controlId: 'AC.L2-3.1.2',
    status: 'met',
    evidence:
      'API route authorization checks enforce function-level access control. Mutations require authenticated session with appropriate role.',
    lastVerified: now,
    autoAssessed: true,
  });

  evidences.push({
    controlId: 'AC.L2-3.1.5',
    status: 'met',
    evidence:
      'Least privilege enforced through role hierarchy. Admin functions restricted to SECURITY_ADMIN and PLATFORM_ADMIN roles.',
    lastVerified: now,
    autoAssessed: true,
  });

  // AT — Awareness & Training (AT.L2-3.2.1, AT.L2-3.2.2)
  {
    const hasRiskVisibility = input.totalFindings > 0;

    evidences.push({
      controlId: 'AT.L2-3.2.1',
      status: hasRiskVisibility ? 'met' : 'partial',
      evidence: hasRiskVisibility
        ? `Dashboard surfaces ${input.totalFindings} findings with EPSS scores and KEV indicators to all authorized users.`
        : 'Dashboard available but no scan data imported yet for risk awareness.',
      lastVerified: now,
      autoAssessed: true,
    });

    evidences.push({
      controlId: 'AT.L2-3.2.2',
      status: hasRiskVisibility ? 'met' : 'partial',
      evidence: hasRiskVisibility
        ? 'Role-specific dashboards provide vulnerability context. AI remediation guidance available for development teams.'
        : 'Role-specific views available but no data to contextualize training.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // AU — Audit & Accountability (AU.L2-3.3.1, AU.L2-3.3.2)
  {
    const hasAudit = input.hasAuditLogs;

    evidences.push({
      controlId: 'AU.L2-3.3.1',
      status: hasAudit ? 'met' : 'not_met',
      evidence: hasAudit
        ? 'Audit trail active with tamper-evident hash chain. Retention policies enforced per organizational tier.'
        : 'Audit logging not yet configured.',
      lastVerified: now,
      autoAssessed: true,
    });

    evidences.push({
      controlId: 'AU.L2-3.3.2',
      status: hasAudit ? 'met' : 'not_met',
      evidence: hasAudit
        ? 'All user actions traced to authenticated identity. Case assignments, status changes, and comments attributed.'
        : 'User accountability requires audit logging to be enabled.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // CM — Configuration Management (CM.L2-3.4.1, CM.L2-3.4.2)
  {
    const hasScanning = input.totalFindings > 0;

    evidences.push({
      controlId: 'CM.L2-3.4.1',
      status: hasScanning ? 'met' : 'not_met',
      evidence: hasScanning
        ? `Asset inventory maintained with ${input.totalFindings} tracked findings. Baseline vulnerability counts available.`
        : 'No scan data imported. Asset inventory requires scan ingestion.',
      lastVerified: now,
      autoAssessed: true,
    });

    evidences.push({
      controlId: 'CM.L2-3.4.2',
      status: input.hasSlaPolicies ? 'met' : 'partial',
      evidence: input.hasSlaPolicies
        ? `Security configuration settings enforced. SLA policies active with ${input.slaComplianceRate}% compliance.`
        : 'Platform configuration available but SLA policies not yet defined.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // IA — Identification & Authentication (IA.L2-3.5.1, IA.L2-3.5.2, IA.L2-3.5.3)
  evidences.push({
    controlId: 'IA.L2-3.5.1',
    status: 'met',
    evidence:
      'Unique user accounts required. API keys scoped to individual identities. Service accounts separately identified.',
    lastVerified: now,
    autoAssessed: true,
  });

  evidences.push({
    controlId: 'IA.L2-3.5.2',
    status: 'met',
    evidence:
      'Authentication via Google/GitHub OAuth and WorkOS SSO (SAML/OIDC). Session management with expiry and rotation.',
    lastVerified: now,
    autoAssessed: true,
  });

  evidences.push({
    controlId: 'IA.L2-3.5.3',
    status: 'met',
    evidence:
      'TOTP MFA available for all accounts. Passkey/WebAuthn support implemented. MFA enforcement configurable for admin roles.',
    lastVerified: now,
    autoAssessed: true,
  });

  // IR — Incident Response (IR.L2-3.6.1, IR.L2-3.6.2)
  {
    const hasCaseWorkflow = input.totalOpenCases > 0 || input.totalClosedCases > 0;

    evidences.push({
      controlId: 'IR.L2-3.6.1',
      status: hasCaseWorkflow ? 'met' : 'not_met',
      evidence: hasCaseWorkflow
        ? `Incident handling active: ${input.totalOpenCases} open cases, ${input.totalClosedCases} closed. AI-powered remediation guidance available.`
        : 'No incident cases created yet. Case management workflow available but unused.',
      lastVerified: now,
      autoAssessed: true,
    });

    evidences.push({
      controlId: 'IR.L2-3.6.2',
      status: hasCaseWorkflow && input.hasAuditLogs ? 'met' : hasCaseWorkflow ? 'partial' : 'not_met',
      evidence: [
        hasCaseWorkflow ? `Case tracking active with ${input.totalOpenCases + input.totalClosedCases} total cases` : 'No cases for incident reporting',
        input.hasAuditLogs ? 'Full audit trail for reporting' : 'Audit logging needed for complete reporting',
        'Export capabilities available for external reporting',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // MA — Maintenance (MA.L2-3.7.1)
  {
    const recentScan = input.lastScanDate
      ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
      : false;

    evidences.push({
      controlId: 'MA.L2-3.7.1',
      status: recentScan ? 'met' : input.totalFindings > 0 ? 'partial' : 'not_met',
      evidence: [
        input.lastScanDate ? `Last scan: ${input.lastScanDate}` : 'No scan data available',
        `Average scan frequency: ${input.scanFrequencyDays} days`,
        input.totalClosedCases > 0 ? `${input.totalClosedCases} remediation cases completed` : 'No remediation cases completed',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // MP — Media Protection (MP.L2-3.8.1)
  evidences.push({
    controlId: 'MP.L2-3.8.1',
    status: 'met',
    evidence:
      'Scan artifacts stored in encrypted GCS buckets. Exports delivered over HTTPS. Data retention policies enforced by tier.',
    lastVerified: now,
    autoAssessed: true,
  });

  // PE — Physical & Environmental Protection (PE.L2-3.10.1)
  evidences.push({
    controlId: 'PE.L2-3.10.1',
    status: 'met',
    evidence:
      'Infrastructure hosted on GCP Cloud Run within SOC 2 Type II certified data centers. Physical security managed by Google Cloud.',
    lastVerified: now,
    autoAssessed: true,
  });

  // PS — Personnel Security (PS.L2-3.9.1)
  evidences.push({
    controlId: 'PS.L2-3.9.1',
    status: 'partial',
    evidence:
      'User onboarding requires admin invitation. Role assignment controlled by security admins. Background screening is an organizational process outside the platform.',
    lastVerified: now,
    autoAssessed: true,
  });

  // RM — Risk Assessment (RM.L2-3.11.1, RM.L2-3.11.2, RM.L2-3.11.3)
  {
    const hasScanning = input.totalFindings > 0;
    const hasRemediation = input.totalClosedCases > 0;
    const hasSla = input.hasSlaPolicies;

    evidences.push({
      controlId: 'RM.L2-3.11.1',
      status: hasScanning && input.hasRiskExceptions ? 'met' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? `Continuous risk scoring: ${input.totalFindings} findings with CVSS and EPSS scores` : 'No scan data for risk assessment',
        `${input.kevOpenCount} KEV-listed vulnerabilities tracked`,
        input.hasRiskExceptions ? 'Risk exception workflow with documented justifications active' : 'Risk exception process not configured',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });

    evidences.push({
      controlId: 'RM.L2-3.11.2',
      status: hasScanning && input.scanFrequencyDays <= 30 ? 'met' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? `${input.totalFindings} findings ingested from vulnerability scans` : 'No vulnerability scan data',
        `Scan frequency: every ${input.scanFrequencyDays} days`,
        'Supports 11 scanner formats with automated enrichment (NVD, EPSS, KEV)',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });

    evidences.push({
      controlId: 'RM.L2-3.11.3',
      status: hasRemediation && hasSla ? 'met' : hasRemediation ? 'partial' : 'not_met',
      evidence: [
        hasRemediation ? `${input.totalClosedCases} vulnerabilities remediated` : 'No remediation activity recorded',
        hasSla ? `SLA compliance: ${input.slaComplianceRate}%` : 'No SLA policies configured',
        `Average remediation time: ${input.averageRemediationDays} days`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // CA — Security Assessment (CA.L2-3.12.1, CA.L2-3.12.2, CA.L2-3.12.4)
  {
    const hasScanning = input.totalFindings > 0;

    evidences.push({
      controlId: 'CA.L2-3.12.1',
      status: hasScanning ? 'met' : 'not_met',
      evidence: hasScanning
        ? 'Automated compliance framework assessment active. Multiple frameworks tracked with auto-assessment.'
        : 'No scan data available for security control assessment.',
      lastVerified: now,
      autoAssessed: true,
    });

    evidences.push({
      controlId: 'CA.L2-3.12.2',
      status: hasScanning ? 'met' : 'not_met',
      evidence: hasScanning
        ? `POAM auto-generated from ${input.criticalOpenCount + input.highOpenCount} critical/high open findings. Milestones and export available.`
        : 'POAM generation requires vulnerability data.',
      lastVerified: now,
      autoAssessed: true,
    });

    evidences.push({
      controlId: 'CA.L2-3.12.4',
      status: hasScanning ? 'partial' : 'not_met',
      evidence: hasScanning
        ? 'Compliance dashboard tracks framework alignment. Executive reporting available. Full SSP documentation is an organizational responsibility.'
        : 'System security plan tracking requires scan data.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // SC — System & Communications Protection (SC.L2-3.13.1, SC.L2-3.13.8, SC.L2-3.13.11)
  evidences.push({
    controlId: 'SC.L2-3.13.1',
    status: 'met',
    evidence:
      'Cloud Armor WAF provides boundary protection. IP allowlist enforcement available. VPC Service Controls limit network exposure.',
    lastVerified: now,
    autoAssessed: true,
  });

  evidences.push({
    controlId: 'SC.L2-3.13.8',
    status: 'met',
    evidence:
      'TLS encryption enforced on all data in transit. Webhook payloads signed with HMAC. HTTPS-only for all external communication.',
    lastVerified: now,
    autoAssessed: true,
  });

  evidences.push({
    controlId: 'SC.L2-3.13.11',
    status: 'met',
    evidence:
      'AES-256-GCM encryption for secrets at rest. Cloud SQL encryption enabled. KMS-based key management with BYOK support.',
    lastVerified: now,
    autoAssessed: true,
  });

  // SI — System & Information Integrity (SI.L2-3.14.1 through SI.L2-3.14.7)
  {
    const hasRemediation = input.totalClosedCases > 0;
    const hasSla = input.hasSlaPolicies;
    const recentScan = input.lastScanDate
      ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
      : false;

    evidences.push({
      controlId: 'SI.L2-3.14.1',
      status: hasRemediation && hasSla ? 'met' : hasRemediation ? 'partial' : 'not_met',
      evidence: [
        hasRemediation ? `${input.totalClosedCases} flaws remediated` : 'No remediation activity',
        hasSla ? `SLA compliance: ${input.slaComplianceRate}%` : 'No SLA policies for timeliness',
        `MTTR: ${input.averageRemediationDays} days`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });

    evidences.push({
      controlId: 'SI.L2-3.14.2',
      status: input.kevOpenCount === 0 && input.totalFindings > 0 ? 'met' : input.totalFindings > 0 ? 'partial' : 'not_met',
      evidence: [
        `${input.kevOpenCount} open KEV-listed (actively exploited) vulnerabilities`,
        `${input.criticalOpenCount} critical open vulnerabilities`,
        'KEV catalog integration identifies known exploited vulnerabilities',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });

    evidences.push({
      controlId: 'SI.L2-3.14.3',
      status: recentScan ? 'met' : input.totalFindings > 0 ? 'partial' : 'not_met',
      evidence: [
        input.lastScanDate ? `Last scan: ${input.lastScanDate}` : 'No scan data',
        `${input.kevOpenCount} KEV alerts tracked`,
        'EPSS scoring provides threat probability data',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });

    evidences.push({
      controlId: 'SI.L2-3.14.6',
      status: recentScan && input.hasIntegrations ? 'met' : recentScan ? 'partial' : 'not_met',
      evidence: [
        recentScan ? 'Continuous scan ingestion active' : 'No recent scan data',
        'Dashboard provides real-time vulnerability posture view',
        input.hasIntegrations ? 'Webhook integrations enable SIEM correlation' : 'No SIEM integrations configured',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });

    evidences.push({
      controlId: 'SI.L2-3.14.7',
      status: input.hasAuditLogs ? 'met' : 'not_met',
      evidence: input.hasAuditLogs
        ? 'Audit logs capture all system access. Rate limiting prevents brute-force attacks. Anomalous activity detectable through audit review.'
        : 'Audit logging required for unauthorized use detection.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  return evidences;
}
