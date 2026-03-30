/**
 * HIPAA Security Rule (45 CFR Part 164) Controls
 * relevant to vulnerability management of systems handling ePHI
 */

import type {
  ComplianceFramework,
  ComplianceEvidence,
  ComplianceAssessmentInput,
} from './types';

export const HIPAA_FRAMEWORK: ComplianceFramework = {
  id: 'hipaa',
  name: 'HIPAA Security Rule',
  version: '45 CFR 164',
  description:
    'Health Insurance Portability and Accountability Act — Security Rule safeguards for electronic protected health information (ePHI)',
  controls: [
    // Administrative Safeguards (164.308)
    {
      id: '164.308(a)(1)',
      title: 'Security Management Process',
      description:
        'Implement policies and procedures to prevent, detect, contain, and correct security violations. Includes risk analysis, risk management, sanction policy, and information system activity review.',
      category: 'Administrative Safeguards',
      evidenceRequirements: [
        'Risk analysis conducted and documented',
        'Risk management program in place',
        'Sanction policy for workforce violations',
        'Information system activity review process',
      ],
    },
    {
      id: '164.308(a)(3)',
      title: 'Workforce Security',
      description:
        'Implement policies and procedures to ensure all members of the workforce have appropriate access to ePHI. Includes authorization/supervision, workforce clearance, and termination procedures.',
      category: 'Administrative Safeguards',
      evidenceRequirements: [
        'Authorization and supervision procedures',
        'Workforce clearance process',
        'Termination procedures for access removal',
      ],
    },
    {
      id: '164.308(a)(4)',
      title: 'Information Access Management',
      description:
        'Implement policies and procedures for authorizing access to ePHI. Includes access authorization and access establishment and modification.',
      category: 'Administrative Safeguards',
      evidenceRequirements: [
        'Access authorization policies documented',
        'Access establishment and modification procedures',
        'Role-based access control implemented',
      ],
    },
    {
      id: '164.308(a)(5)',
      title: 'Security Awareness & Training',
      description:
        'Implement a security awareness and training program for all members of the workforce including management.',
      category: 'Administrative Safeguards',
      evidenceRequirements: [
        'Security awareness training program',
        'Training records maintained',
        'Periodic security reminders',
      ],
    },
    {
      id: '164.308(a)(6)',
      title: 'Security Incident Procedures',
      description:
        'Implement policies and procedures to address security incidents. Identify, respond to, mitigate, and document security incidents.',
      category: 'Administrative Safeguards',
      evidenceRequirements: [
        'Incident response procedures documented',
        'Incident identification and reporting mechanism',
        'Incident mitigation and documentation process',
      ],
    },
    {
      id: '164.308(a)(7)',
      title: 'Contingency Plan',
      description:
        'Establish policies and procedures for responding to an emergency or other occurrence that damages systems containing ePHI. Includes data backup, disaster recovery, and emergency mode operation.',
      category: 'Administrative Safeguards',
      evidenceRequirements: [
        'Data backup plan implemented',
        'Disaster recovery plan documented',
        'Emergency mode operation plan',
        'Testing and revision procedures',
      ],
    },
    {
      id: '164.308(a)(8)',
      title: 'Evaluation',
      description:
        'Perform periodic technical and nontechnical evaluation based on standards, in response to environmental or operational changes affecting ePHI security.',
      category: 'Administrative Safeguards',
      evidenceRequirements: [
        'Periodic security evaluations conducted',
        'Evaluation results documented',
        'Remediation actions tracked',
      ],
    },
    // Physical Safeguards (164.310)
    {
      id: '164.310(a)',
      title: 'Facility Access Controls',
      description:
        'Implement policies and procedures to limit physical access to electronic information systems and the facilities in which they are housed.',
      category: 'Physical Safeguards',
      evidenceRequirements: [
        'Facility access controls documented',
        'Facility security plan',
        'Access control and validation procedures',
      ],
    },
    {
      id: '164.310(b)',
      title: 'Workstation Use',
      description:
        'Implement policies and procedures that specify the proper functions to be performed, the manner in which those functions are to be performed, and the physical attributes of the surroundings of a specific workstation or class of workstation.',
      category: 'Physical Safeguards',
      evidenceRequirements: [
        'Workstation use policies documented',
        'Acceptable use standards defined',
      ],
    },
    {
      id: '164.310(c)',
      title: 'Workstation Security',
      description:
        'Implement physical safeguards for all workstations that access ePHI to restrict access to authorized users.',
      category: 'Physical Safeguards',
      evidenceRequirements: [
        'Physical workstation security measures',
        'Screen lock and timeout policies',
      ],
    },
    {
      id: '164.310(d)',
      title: 'Device & Media Controls',
      description:
        'Implement policies and procedures governing receipt and removal of hardware and electronic media containing ePHI. Includes disposal, media re-use, accountability, and data backup and storage.',
      category: 'Physical Safeguards',
      evidenceRequirements: [
        'Media disposal procedures',
        'Media re-use sanitization procedures',
        'Hardware and media accountability records',
        'Data backup and storage procedures',
      ],
    },
    // Technical Safeguards (164.312)
    {
      id: '164.312(a)',
      title: 'Access Control',
      description:
        'Implement technical policies and procedures for systems maintaining ePHI to allow access only to authorized persons or software programs. Includes unique user identification, emergency access, automatic logoff, and encryption.',
      category: 'Technical Safeguards',
      evidenceRequirements: [
        'Unique user identification assigned',
        'Emergency access procedure',
        'Automatic logoff implemented',
        'Encryption and decryption of ePHI',
      ],
    },
    {
      id: '164.312(b)',
      title: 'Audit Controls',
      description:
        'Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use ePHI.',
      category: 'Technical Safeguards',
      evidenceRequirements: [
        'Audit logging implemented',
        'Audit log review process',
        'Tamper-evident audit records',
      ],
    },
    {
      id: '164.312(c)',
      title: 'Integrity',
      description:
        'Implement policies and procedures to protect ePHI from improper alteration or destruction. Implement mechanism to authenticate ePHI.',
      category: 'Technical Safeguards',
      evidenceRequirements: [
        'Data integrity validation mechanisms',
        'ePHI authentication mechanism',
        'Error detection and correction procedures',
      ],
    },
    {
      id: '164.312(d)',
      title: 'Person or Entity Authentication',
      description:
        'Implement procedures to verify that a person or entity seeking access to ePHI is the one claimed.',
      category: 'Technical Safeguards',
      evidenceRequirements: [
        'Multi-factor authentication available',
        'Authentication mechanism documented',
        'Identity verification procedures',
      ],
    },
    {
      id: '164.312(e)',
      title: 'Transmission Security',
      description:
        'Implement technical security measures to guard against unauthorized access to ePHI being transmitted over an electronic communications network. Includes integrity controls and encryption.',
      category: 'Technical Safeguards',
      evidenceRequirements: [
        'Encryption for data in transit (TLS)',
        'Integrity controls for transmitted data',
        'Network security measures documented',
      ],
    },
    // Organizational Requirements (164.314)
    {
      id: '164.314(a)',
      title: 'Business Associate Contracts',
      description:
        'A covered entity may permit a business associate to create, receive, maintain, or transmit ePHI only if satisfactory assurances are obtained through a written contract or arrangement.',
      category: 'Organizational Requirements',
      evidenceRequirements: [
        'Business Associate Agreements (BAAs) executed',
        'BAA terms include security requirements',
        'Subcontractor BAAs in place',
      ],
    },
    // Documentation Requirements (164.316)
    {
      id: '164.316(a)',
      title: 'Policies & Procedures',
      description:
        'Implement reasonable and appropriate policies and procedures to comply with the Security Rule standards and implementation specifications.',
      category: 'Documentation Requirements',
      evidenceRequirements: [
        'Security policies documented',
        'Procedures for each safeguard implemented',
        'Policies reviewed and updated periodically',
      ],
    },
    {
      id: '164.316(b)',
      title: 'Documentation Requirements',
      description:
        'Maintain documentation of policies and procedures in written (electronic) form. Retain documentation for six years from date of creation or last effective date.',
      category: 'Documentation Requirements',
      evidenceRequirements: [
        'Documentation retained for 6 years',
        'Documentation available to responsible persons',
        'Periodic review and update of documentation',
      ],
    },
  ],
};

export function assessHIPAA(input: ComplianceAssessmentInput): ComplianceEvidence[] {
  const evidences: ComplianceEvidence[] = [];
  const now = new Date().toISOString();

  // 164.308(a)(1) — Security Management Process
  {
    const hasScanning = input.totalFindings > 0;
    const hasRemediation = input.totalClosedCases > 0;
    const hasAudit = input.hasAuditLogs;
    const score = [hasScanning, hasRemediation, hasAudit].filter(Boolean).length;

    evidences.push({
      controlId: '164.308(a)(1)',
      status: score >= 3 ? 'met' : score >= 1 ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? `Risk analysis supported: ${input.totalFindings} findings from vulnerability scans` : 'No vulnerability scan data for risk analysis',
        hasRemediation ? `Risk management: ${input.totalClosedCases} cases remediated` : 'No remediation activity tracked',
        hasAudit ? 'Information system activity review via audit logs' : 'No audit logs configured',
        'Sanction policy requires organizational documentation',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // 164.308(a)(3) — Workforce Security
  evidences.push({
    controlId: '164.308(a)(3)',
    status: 'partial',
    evidence:
      'Platform implements RBAC with role-based workforce access controls. Authorization/supervision and termination procedures require organizational documentation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 164.308(a)(4) — Information Access Management
  evidences.push({
    controlId: '164.308(a)(4)',
    status: 'met',
    evidence:
      'Platform implements role-based access control with 10 roles (PLATFORM_ADMIN through VIEWER). Multi-tenant org isolation enforced. Access establishment and modification managed via admin interface.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 164.308(a)(5) — Security Awareness & Training
  evidences.push({
    controlId: '164.308(a)(5)',
    status: 'partial',
    evidence:
      'Platform provides security dashboards and vulnerability awareness data. Formal training program requires organizational implementation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 164.308(a)(6) — Security Incident Procedures
  {
    const hasWorkflow = input.totalOpenCases > 0 || input.totalClosedCases > 0;
    const hasSla = input.hasSlaPolicies;

    evidences.push({
      controlId: '164.308(a)(6)',
      status: hasWorkflow && hasSla ? 'met' : hasWorkflow ? 'partial' : 'not_met',
      evidence: [
        hasWorkflow ? `Incident tracking active: ${input.totalOpenCases} open, ${input.totalClosedCases} closed cases` : 'No incident tracking detected',
        hasSla ? `SLA policies enforce response timelines, ${input.slaComplianceRate}% compliance` : 'No SLA policies configured',
        'Case workflow supports identification, response, mitigation, and documentation',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // 164.308(a)(7) — Contingency Plan
  evidences.push({
    controlId: '164.308(a)(7)',
    status: 'partial',
    evidence:
      'Platform deployed on GCP Cloud Run with automated backups via Cloud SQL. Disaster recovery and emergency mode plans require organizational documentation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 164.308(a)(8) — Evaluation
  {
    const hasScanning = input.totalFindings > 0;
    const recentScan = input.lastScanDate
      ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
      : false;

    evidences.push({
      controlId: '164.308(a)(8)',
      status: hasScanning && recentScan ? 'met' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? `Security evaluations supported: ${input.totalFindings} findings tracked` : 'No evaluation data available',
        recentScan ? `Last scan: ${input.lastScanDate}` : 'No recent scan activity',
        `Average scan frequency: ${input.scanFrequencyDays} days`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // 164.310(a) — Facility Access Controls
  evidences.push({
    controlId: '164.310(a)',
    status: 'met',
    evidence:
      'Infrastructure hosted on GCP with SOC 2 Type II certified data centers. Physical facility access controls inherited from Google Cloud.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 164.310(b) — Workstation Use
  evidences.push({
    controlId: '164.310(b)',
    status: 'na',
    evidence:
      'Cloud-based SaaS platform — workstation use policies are the responsibility of the covered entity, not the platform.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 164.310(c) — Workstation Security
  evidences.push({
    controlId: '164.310(c)',
    status: 'na',
    evidence:
      'Cloud-based SaaS platform — workstation security is the responsibility of the covered entity. Platform enforces session timeouts and automatic logoff.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 164.310(d) — Device & Media Controls
  evidences.push({
    controlId: '164.310(d)',
    status: 'partial',
    evidence:
      'Data disposal supported via deletion API. Media controls inherited from GCP (encrypted disks, secure disposal). Physical media accountability is organizational responsibility.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 164.312(a) — Access Control
  evidences.push({
    controlId: '164.312(a)',
    status: 'met',
    evidence:
      'Unique user identification via email-based accounts. RBAC enforced with 10 roles. Session management with automatic logoff. AES-256-GCM encryption for data at rest.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 164.312(b) — Audit Controls
  {
    const hasAudit = input.hasAuditLogs;

    evidences.push({
      controlId: '164.312(b)',
      status: hasAudit ? 'met' : 'not_met',
      evidence: hasAudit
        ? 'Audit logging active with tamper-evident hash chain. Records user actions, data access, and configuration changes.'
        : 'No audit logging configured. Enable audit logs for HIPAA compliance.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // 164.312(c) — Integrity
  evidences.push({
    controlId: '164.312(c)',
    status: 'met',
    evidence:
      'Data integrity enforced via Prisma ORM with schema validation. Audit log hash chain provides tamper detection. Database constraints prevent improper alteration.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 164.312(d) — Person or Entity Authentication
  evidences.push({
    controlId: '164.312(d)',
    status: 'met',
    evidence:
      'Multi-factor authentication (TOTP MFA) available. OAuth (Google/GitHub) and SSO (SAML/OIDC via WorkOS) supported. Session-based authentication with secure token management.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 164.312(e) — Transmission Security
  evidences.push({
    controlId: '164.312(e)',
    status: 'met',
    evidence:
      'All data transmitted over TLS 1.3. HTTPS enforced on all endpoints. Cloud Armor WAF provides additional network security. API authentication required for all data access.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 164.314(a) — Business Associate Contracts
  evidences.push({
    controlId: '164.314(a)',
    status: 'partial',
    evidence:
      'Platform supports BAA execution as a business associate. BAA terms and subcontractor agreements require organizational documentation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 164.316(a) — Policies & Procedures
  evidences.push({
    controlId: '164.316(a)',
    status: 'partial',
    evidence:
      'Platform enforces security controls programmatically (RBAC, encryption, audit). Written policy documentation requires organizational effort.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 164.316(b) — Documentation Requirements
  {
    const hasAudit = input.hasAuditLogs;

    evidences.push({
      controlId: '164.316(b)',
      status: hasAudit ? 'partial' : 'not_met',
      evidence: [
        hasAudit ? 'Audit logs retained per configured retention policy' : 'No audit log retention configured',
        'Six-year documentation retention requires organizational policy and backup verification',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  return evidences;
}
