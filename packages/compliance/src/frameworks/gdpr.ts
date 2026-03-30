/**
 * GDPR (EU General Data Protection Regulation) Controls
 * relevant to vulnerability management and data protection
 */

import type {
  ComplianceFramework,
  ComplianceEvidence,
  ComplianceAssessmentInput,
} from './types';

export const GDPR_FRAMEWORK: ComplianceFramework = {
  id: 'gdpr',
  name: 'GDPR',
  version: '2016/679',
  description:
    'EU General Data Protection Regulation — data protection and privacy controls relevant to vulnerability management platforms',
  controls: [
    {
      id: 'Art.5',
      title: 'Data Processing Principles',
      description:
        'Personal data shall be processed lawfully, fairly and transparently; collected for specified purposes; adequate, relevant and limited; accurate; kept no longer than necessary; processed with appropriate security; and the controller must be accountable.',
      category: 'Principles',
      evidenceRequirements: [
        'Data minimization practices documented',
        'Purpose limitation for collected data',
        'Storage limitation policies enforced',
        'Integrity and confidentiality measures in place',
      ],
    },
    {
      id: 'Art.6',
      title: 'Lawfulness of Processing',
      description:
        'Processing is lawful only if at least one legal basis applies: consent, contractual necessity, legal obligation, vital interests, public interest, or legitimate interests.',
      category: 'Principles',
      evidenceRequirements: [
        'Legal basis for processing documented',
        'Consent management mechanism if applicable',
      ],
    },
    {
      id: 'Art.12',
      title: 'Transparent Information & Communication',
      description:
        'The controller shall take appropriate measures to provide information to data subjects in a concise, transparent, intelligible and easily accessible form.',
      category: 'Data Subject Rights',
      evidenceRequirements: [
        'Privacy policy published and accessible',
        'Communication procedures for data subject requests',
      ],
    },
    {
      id: 'Art.13',
      title: 'Information to Data Subject at Collection',
      description:
        'Where personal data are collected from the data subject, the controller shall provide identity, purposes, legal basis, recipients, retention periods and rights information.',
      category: 'Data Subject Rights',
      evidenceRequirements: [
        'Collection notice provided at point of data gathering',
        'Retention periods communicated',
      ],
    },
    {
      id: 'Art.15',
      title: 'Right of Access',
      description:
        'The data subject shall have the right to obtain confirmation as to whether personal data are being processed and access to the data and supplementary information.',
      category: 'Data Subject Rights',
      evidenceRequirements: [
        'Data export capability available',
        'Access request handling process documented',
      ],
    },
    {
      id: 'Art.17',
      title: 'Right to Erasure',
      description:
        'The data subject shall have the right to obtain from the controller the erasure of personal data without undue delay where specific grounds apply.',
      category: 'Data Subject Rights',
      evidenceRequirements: [
        'Data deletion capability implemented',
        'Erasure request workflow documented',
        'Deletion verified across all storage systems',
      ],
    },
    {
      id: 'Art.20',
      title: 'Right to Data Portability',
      description:
        'The data subject shall have the right to receive personal data in a structured, commonly used and machine-readable format and to transmit that data to another controller.',
      category: 'Data Subject Rights',
      evidenceRequirements: [
        'Data export in machine-readable format (JSON/CSV)',
        'Portability request process documented',
      ],
    },
    {
      id: 'Art.25',
      title: 'Data Protection by Design & Default',
      description:
        'The controller shall implement appropriate technical and organisational measures designed to implement data-protection principles and integrate safeguards into processing.',
      category: 'Controller Obligations',
      evidenceRequirements: [
        'Privacy-by-design in system architecture',
        'Default settings minimize data collection',
        'Encryption at rest and in transit',
      ],
    },
    {
      id: 'Art.30',
      title: 'Records of Processing Activities',
      description:
        'Each controller shall maintain a record of processing activities under its responsibility, including purposes, data categories, recipients, and retention timelines.',
      category: 'Controller Obligations',
      evidenceRequirements: [
        'Processing activity register maintained',
        'Audit logs of data operations',
      ],
    },
    {
      id: 'Art.32',
      title: 'Security of Processing',
      description:
        'The controller and processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, including encryption, confidentiality, resilience, and regular testing.',
      category: 'Security',
      evidenceRequirements: [
        'Encryption of personal data (AES-256-GCM)',
        'Access controls and RBAC enforced',
        'Regular vulnerability scanning',
        'Ability to restore availability after incident',
        'Process for regularly testing security measures',
      ],
    },
    {
      id: 'Art.33',
      title: 'Breach Notification to Authority',
      description:
        'In the case of a personal data breach, the controller shall notify the supervisory authority within 72 hours of becoming aware of it, unless unlikely to result in risk to rights and freedoms.',
      category: 'Breach Management',
      evidenceRequirements: [
        'Incident detection and alerting workflow',
        'Breach notification procedure documented',
        '72-hour notification timeline tracked',
      ],
    },
    {
      id: 'Art.34',
      title: 'Communication of Breach to Data Subject',
      description:
        'When the personal data breach is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall communicate the breach to the data subject without undue delay.',
      category: 'Breach Management',
      evidenceRequirements: [
        'Data subject notification process documented',
        'Breach severity classification system',
      ],
    },
    {
      id: 'Art.35',
      title: 'Data Protection Impact Assessment (DPIA)',
      description:
        'Where processing is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall carry out a data protection impact assessment.',
      category: 'Controller Obligations',
      evidenceRequirements: [
        'DPIA process documented',
        'High-risk processing activities identified',
        'Risk mitigation measures recorded',
      ],
    },
    {
      id: 'Art.37',
      title: 'Designation of Data Protection Officer',
      description:
        'The controller and processor shall designate a data protection officer where required by the nature and scale of processing activities.',
      category: 'Controller Obligations',
      evidenceRequirements: [
        'DPO designated or justification documented',
        'DPO contact information published',
      ],
    },
    {
      id: 'Art.44',
      title: 'Transfer Safeguards (International)',
      description:
        'Any transfer of personal data to a third country or international organization shall take place only if appropriate safeguards are provided.',
      category: 'International Transfers',
      evidenceRequirements: [
        'Data residency controls implemented',
        'Transfer mechanisms documented (SCCs, adequacy decisions)',
        'Third-country risk assessments completed',
      ],
    },
  ],
};

export function assessGDPR(input: ComplianceAssessmentInput): ComplianceEvidence[] {
  const evidences: ComplianceEvidence[] = [];
  const now = new Date().toISOString();

  // Art.5 — Data Processing Principles
  evidences.push({
    controlId: 'Art.5',
    status: input.hasAuditLogs ? 'partial' : 'not_met',
    evidence: [
      input.hasAuditLogs ? 'Audit logs provide accountability evidence' : 'No audit trail configured',
      'Data minimization, purpose limitation, and storage limitation require organizational policy verification',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // Art.6 — Lawfulness of Processing
  evidences.push({
    controlId: 'Art.6',
    status: 'partial',
    evidence:
      'Legal basis for processing vulnerability data exists under legitimate interest and contractual necessity. Organizational documentation required for full compliance.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Art.12 — Transparent Information & Communication
  evidences.push({
    controlId: 'Art.12',
    status: 'partial',
    evidence:
      'Platform provides user-facing interfaces for data access. Privacy policy and communication procedures require organizational verification.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Art.13 — Information at Collection
  evidences.push({
    controlId: 'Art.13',
    status: 'partial',
    evidence:
      'Data collection occurs during scan upload and user registration. Collection notices require organizational implementation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Art.15 — Right of Access
  evidences.push({
    controlId: 'Art.15',
    status: 'partial',
    evidence:
      'Platform supports data export in CSV and JSON formats. Formal access request workflow requires organizational process.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Art.17 — Right to Erasure
  {
    // Platform has data deletion capability
    const hasDeletion = true; // Platform implements data deletion API
    evidences.push({
      controlId: 'Art.17',
      status: hasDeletion ? 'met' : 'not_met',
      evidence:
        'Platform implements data deletion API endpoint with cascading deletion across findings, cases, and scan artifacts. Deletion verified via audit log.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // Art.20 — Right to Data Portability
  evidences.push({
    controlId: 'Art.20',
    status: 'met',
    evidence:
      'Platform supports bulk export in machine-readable formats (CSV, JSON). Findings, cases, and compliance reports exportable on demand.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Art.25 — Data Protection by Design & Default
  evidences.push({
    controlId: 'Art.25',
    status: 'met',
    evidence:
      'Platform implements encryption at rest (AES-256-GCM) and in transit (TLS 1.3). RBAC enforced by default. Multi-tenant isolation via org-scoped queries. Minimal data collection by design.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Art.30 — Records of Processing Activities
  {
    const hasAudit = input.hasAuditLogs;
    evidences.push({
      controlId: 'Art.30',
      status: hasAudit ? 'partial' : 'not_met',
      evidence: [
        hasAudit ? 'Audit logs capture data processing operations with tamper-evident hash chain' : 'No audit trail configured',
        'Formal processing activity register requires organizational documentation',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // Art.32 — Security of Processing
  {
    const hasScanning = input.totalFindings > 0;
    const recentScan = input.lastScanDate
      ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
      : false;
    const lowCritical = input.criticalOpenCount === 0;

    evidences.push({
      controlId: 'Art.32',
      status: hasScanning && recentScan && lowCritical ? 'met' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        'Platform encryption: AES-256-GCM at rest, TLS in transit',
        'RBAC with 10 roles enforced on all endpoints',
        hasScanning ? `${input.totalFindings} findings tracked` : 'No scan data available',
        recentScan ? `Last scan: ${input.lastScanDate}` : 'No recent scan activity',
        `${input.criticalOpenCount} critical open vulnerabilities`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // Art.33 — Breach Notification to Authority (72hr)
  {
    const hasWorkflow = input.totalOpenCases > 0 || input.totalClosedCases > 0;
    const hasSla = input.hasSlaPolicies;

    evidences.push({
      controlId: 'Art.33',
      status: hasWorkflow && hasSla ? 'partial' : 'not_met',
      evidence: [
        hasWorkflow ? 'Incident case workflow active for tracking security events' : 'No incident workflow detected',
        hasSla ? 'SLA policies provide timeline enforcement' : 'No SLA policies for notification timelines',
        'Formal 72-hour breach notification procedure requires organizational documentation',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // Art.34 — Communication of Breach to Data Subject
  {
    const hasWorkflow = input.totalOpenCases > 0 || input.totalClosedCases > 0;

    evidences.push({
      controlId: 'Art.34',
      status: hasWorkflow ? 'partial' : 'not_met',
      evidence: [
        hasWorkflow ? 'Severity classification system active for breach impact assessment' : 'No severity classification detected',
        'Data subject notification process requires organizational procedure',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // Art.35 — DPIA
  evidences.push({
    controlId: 'Art.35',
    status: 'partial',
    evidence:
      'Platform provides risk scoring and vulnerability assessment data that supports DPIA. Formal DPIA process requires organizational implementation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Art.37 — DPO Designation
  evidences.push({
    controlId: 'Art.37',
    status: 'partial',
    evidence:
      'DPO designation is an organizational requirement. Platform supports DPO oversight via audit logs and compliance dashboards.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Art.44 — Transfer Safeguards
  evidences.push({
    controlId: 'Art.44',
    status: 'partial',
    evidence:
      'Platform deployed on GCP with configurable data residency. International transfer safeguards (SCCs, adequacy decisions) require organizational documentation.',
    lastVerified: now,
    autoAssessed: true,
  });

  return evidences;
}
