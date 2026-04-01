/**
 * NIS2 Directive (EU) — Article 21 Cybersecurity Risk-Management Measures
 * Network and Information Security requirements for essential and important entities
 */

import type {
  ComplianceFramework,
  ComplianceEvidence,
  ComplianceAssessmentInput,
} from './types';

export const NIS2_FRAMEWORK: ComplianceFramework = {
  id: 'nis2',
  name: 'NIS2 Directive',
  version: '2022/2555',
  description:
    'EU NIS2 Directive — cybersecurity risk-management measures under Article 21 for essential and important entities operating network and information systems',
  controls: [
    {
      id: 'NIS2-21.2a',
      title: 'Risk Analysis and Information Security Policies',
      description:
        'Entities shall adopt policies on risk analysis and information system security, including risk assessment methodologies, risk treatment plans, and security policies proportionate to the risks.',
      category: 'Governance',
      evidenceRequirements: [
        'Risk analysis methodology documented',
        'Information security policy established',
        'Risk treatment plans maintained',
        'Regular risk reassessment performed',
      ],
    },
    {
      id: 'NIS2-21.2b',
      title: 'Incident Handling',
      description:
        'Entities shall establish incident handling procedures, including detection, analysis, containment, and response to security incidents affecting network and information systems.',
      category: 'Incident Response',
      evidenceRequirements: [
        'Incident response plan documented',
        'Incident detection mechanisms active',
        'Incident classification and escalation procedures',
        'Post-incident review process',
      ],
    },
    {
      id: 'NIS2-21.2c',
      title: 'Business Continuity and Crisis Management',
      description:
        'Entities shall maintain business continuity capabilities, including backup management, disaster recovery, and crisis management procedures.',
      category: 'Resilience',
      evidenceRequirements: [
        'Business continuity plan documented',
        'Backup and restore procedures active',
        'Disaster recovery plan tested',
        'Crisis management procedures established',
      ],
    },
    {
      id: 'NIS2-21.2d',
      title: 'Supply Chain Security',
      description:
        'Entities shall address security-related aspects concerning the relationships between each entity and its direct suppliers or service providers, including SBOM tracking and third-party risk assessment.',
      category: 'Supply Chain',
      evidenceRequirements: [
        'Supply chain risk assessment performed',
        'Supplier security requirements defined',
        'SBOM tracking for dependencies',
        'Third-party security monitoring active',
      ],
    },
    {
      id: 'NIS2-21.2e',
      title: 'Security in Network and Information Systems Acquisition',
      description:
        'Security in the acquisition, development, and maintenance of network and information systems, including vulnerability handling and disclosure.',
      category: 'Development Security',
      evidenceRequirements: [
        'Secure development lifecycle implemented',
        'Vulnerability handling in acquisition process',
        'Security testing in development pipeline',
        'Vendor security assessment for procured systems',
      ],
    },
    {
      id: 'NIS2-21.2f',
      title: 'Policies for Assessing Effectiveness',
      description:
        'Policies and procedures to assess the effectiveness of cybersecurity risk-management measures, including regular security assessments and metrics tracking.',
      category: 'Governance',
      evidenceRequirements: [
        'Security metrics defined and tracked',
        'Regular effectiveness assessments conducted',
        'Compliance score monitoring active',
        'Continuous improvement process documented',
      ],
    },
    {
      id: 'NIS2-21.2g',
      title: 'Cybersecurity Hygiene and Training',
      description:
        'Basic cyber hygiene practices and cybersecurity training for all personnel, ensuring awareness of threats and security responsibilities.',
      category: 'People',
      evidenceRequirements: [
        'Cybersecurity awareness training program',
        'Cyber hygiene practices documented',
        'Training records maintained',
        'Phishing awareness exercises conducted',
      ],
    },
    {
      id: 'NIS2-21.2h',
      title: 'Cryptography and Encryption',
      description:
        'Policies and procedures regarding the use of cryptography and, where appropriate, encryption to protect the confidentiality and integrity of data.',
      category: 'Data Protection',
      evidenceRequirements: [
        'Encryption policy documented',
        'Encryption at rest implemented',
        'Encryption in transit enforced',
        'Key management procedures established',
      ],
    },
    {
      id: 'NIS2-21.2i',
      title: 'Human Resources Security and Access Control',
      description:
        'Human resources security policies including vetting, access management, and asset management for personnel with access to network and information systems.',
      category: 'Access Control',
      evidenceRequirements: [
        'Access control policies enforced',
        'Role-based access control implemented',
        'Access reviews performed periodically',
        'Onboarding and offboarding procedures documented',
      ],
    },
    {
      id: 'NIS2-21.2j',
      title: 'Multi-Factor Authentication and Secure Communication',
      description:
        'Use of multi-factor authentication or continuous authentication solutions, secured voice, video, and text communications, and secured emergency communication systems.',
      category: 'Access Control',
      evidenceRequirements: [
        'Multi-factor authentication enforced',
        'Secure communication channels established',
        'Emergency communication procedures documented',
        'Authentication strength appropriate to risk',
      ],
    },
    {
      id: 'NIS2-21.2k',
      title: 'Vulnerability Handling and Disclosure',
      description:
        'Policies and procedures for vulnerability handling and disclosure, including vulnerability identification, assessment, remediation tracking, and coordinated disclosure.',
      category: 'Vulnerability Management',
      evidenceRequirements: [
        'Vulnerability identification and scanning active',
        'Vulnerability prioritization methodology defined',
        'Remediation tracking and SLA enforcement',
        'Coordinated vulnerability disclosure policy',
      ],
    },
    {
      id: 'NIS2-21.2l',
      title: 'Use of Approved ICT Products',
      description:
        'Policies regarding the use of certified or approved ICT products, services, and processes, including cybersecurity certification schemes.',
      category: 'Supply Chain',
      evidenceRequirements: [
        'ICT product approval process documented',
        'Certified products preferred where available',
        'Product security assessment performed',
        'Approved product registry maintained',
      ],
    },
  ],
};

export function assessNIS2(input: ComplianceAssessmentInput): ComplianceEvidence[] {
  const evidences: ComplianceEvidence[] = [];
  const now = new Date().toISOString();

  const hasScanning = input.totalFindings > 0;
  const recentScan = input.lastScanDate
    ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
    : false;
  const hasWorkflow = input.totalOpenCases > 0 || input.totalClosedCases > 0;

  // NIS2-21.2a — Risk Analysis and Information Security Policies
  {
    const hasRiskMgmt = hasScanning && input.hasSlaPolicies;
    evidences.push({
      controlId: 'NIS2-21.2a',
      status: hasRiskMgmt ? 'partial' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? 'Risk analysis active via vulnerability scanning with CVSS/EPSS risk scoring' : 'No risk analysis data from vulnerability scanning',
        input.hasSlaPolicies ? 'Security policies include SLA-enforced remediation timelines' : 'No SLA policies defined',
        input.hasRiskExceptions ? 'Risk treatment documented via risk exceptions' : 'No risk exception process configured',
        'Formal information security policy requires organizational documentation',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // NIS2-21.2b — Incident Handling
  {
    const hasSla = input.hasSlaPolicies;
    evidences.push({
      controlId: 'NIS2-21.2b',
      status: hasWorkflow && hasSla ? 'partial' : hasWorkflow ? 'partial' : 'not_met',
      evidence: [
        hasWorkflow ? `Incident handling via case workflow: ${input.totalOpenCases} open, ${input.totalClosedCases} resolved` : 'No incident handling workflow configured',
        hasSla ? `SLA enforcement for response timelines. Compliance rate: ${input.slaComplianceRate}%` : 'No SLA policies for incident response timelines',
        input.hasAuditLogs ? 'Incident actions logged in audit trail' : 'No audit logging for incident tracking',
        'Formal incident classification, escalation, and post-incident review require organizational documentation',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // NIS2-21.2c — Business Continuity and Crisis Management
  evidences.push({
    controlId: 'NIS2-21.2c',
    status: 'partial',
    evidence:
      'Platform supports backup and restore with configurable retention policies. Cloud Run provides auto-scaling and high availability. Health check endpoints (liveness, readiness) monitor service continuity. Formal business continuity plan, disaster recovery testing, and crisis management procedures require organizational documentation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // NIS2-21.2d — Supply Chain Security
  evidences.push({
    controlId: 'NIS2-21.2d',
    status: hasScanning ? 'partial' : 'not_met',
    evidence: [
      hasScanning ? 'SBOM ingestion supported (CycloneDX, SPDX) for dependency vulnerability tracking' : 'No SBOM or dependency data ingested',
      'Platform integrates with scanner connectors (Tenable, Qualys, CrowdStrike, Rapid7, Snyk) for third-party monitoring',
      'Formal supply chain risk assessment and supplier security requirements require organizational documentation',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // NIS2-21.2e — Security in Acquisition, Development, Maintenance
  {
    const scanFreqOk = input.scanFrequencyDays > 0 && input.scanFrequencyDays <= 30;
    evidences.push({
      controlId: 'NIS2-21.2e',
      status: hasScanning && recentScan ? 'partial' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? `Vulnerability scanning active: ${input.totalFindings} findings tracked` : 'No vulnerability scanning data',
        recentScan ? `Last scan: ${input.lastScanDate}` : 'No recent security scan',
        scanFreqOk ? `Scan frequency: every ${input.scanFrequencyDays} days` : 'Scan frequency does not meet 30-day threshold',
        'Pipeline compliance scanner supports CI/CD security testing integration',
        'Formal secure development lifecycle requires organizational adoption',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // NIS2-21.2f — Policies for Assessing Effectiveness
  {
    const hasMetrics = hasScanning && hasWorkflow;
    evidences.push({
      controlId: 'NIS2-21.2f',
      status: hasMetrics ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? `Security metrics tracked: ${input.totalFindings} findings, ${input.criticalOpenCount} critical open` : 'No security metrics available',
        hasWorkflow ? `Remediation effectiveness: ${input.averageRemediationDays} days average, ${input.slaComplianceRate}% SLA compliance` : 'No remediation effectiveness data',
        'Compliance scores computed across 10+ frameworks for posture assessment',
        'Formal effectiveness assessment policies require organizational documentation',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // NIS2-21.2g — Cybersecurity Hygiene and Training
  evidences.push({
    controlId: 'NIS2-21.2g',
    status: 'partial',
    evidence:
      'Platform enforces basic cyber hygiene through RBAC, MFA, password policies (expiry, HIBP check, history). Formal cybersecurity training program, awareness exercises, and training records require organizational implementation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // NIS2-21.2h — Cryptography and Encryption
  evidences.push({
    controlId: 'NIS2-21.2h',
    status: 'met',
    evidence:
      'AES-256-GCM encryption at rest for secrets and sensitive data. TLS 1.3 enforced in transit. KMS-backed key management with BYOK support. HMAC signing for webhook integrity. Encryption policy applied consistently across all data stores.',
    lastVerified: now,
    autoAssessed: true,
  });

  // NIS2-21.2i — Human Resources Security and Access Control
  evidences.push({
    controlId: 'NIS2-21.2i',
    status: 'met',
    evidence:
      'RBAC with 10 roles and granular permissions enforced on all API routes. Org-scoped tenant isolation. Session management with revocation. IP allowlist for access restriction. Onboarding flow with role assignment.',
    lastVerified: now,
    autoAssessed: true,
  });

  // NIS2-21.2j — Multi-Factor Authentication and Secure Communication
  evidences.push({
    controlId: 'NIS2-21.2j',
    status: 'met',
    evidence:
      'MFA supported via TOTP with backup codes. SSO via SAML/OIDC (WorkOS) for enterprise authentication. OAuth providers (Google, GitHub). TLS-encrypted communication for all data exchange. Session security with timeout and revocation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // NIS2-21.2k — Vulnerability Handling and Disclosure
  {
    const lowCritical = input.criticalOpenCount === 0;
    const status = hasScanning && recentScan && lowCritical && input.hasSlaPolicies
      ? 'met'
      : hasScanning
        ? 'partial'
        : 'not_met';
    evidences.push({
      controlId: 'NIS2-21.2k',
      status,
      evidence: [
        hasScanning ? `Vulnerability handling active: ${input.totalFindings} findings identified` : 'No vulnerability handling data',
        `${input.criticalOpenCount} critical, ${input.highOpenCount} high, ${input.kevOpenCount} KEV open findings`,
        input.hasSlaPolicies ? `SLA-enforced remediation. Average: ${input.averageRemediationDays} days` : 'No remediation SLAs defined',
        'AI-powered triage provides prioritization with CVSS, EPSS, and KEV enrichment',
        'POAM generation supports remediation tracking and auditor reporting',
        'Coordinated vulnerability disclosure policy requires organizational publication',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // NIS2-21.2l — Use of Approved ICT Products
  evidences.push({
    controlId: 'NIS2-21.2l',
    status: 'partial',
    evidence: [
      hasScanning ? 'SBOM analysis tracks software components and versions for approval assessment' : 'No software component tracking',
      'ICT product approval process, certified product preferences, and approved registry require organizational implementation',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  return evidences;
}
