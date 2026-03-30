/**
 * PCI-DSS v4.0 Controls relevant to Vulnerability Management
 */

import type {
  ComplianceFramework,
  ComplianceEvidence,
  ComplianceAssessmentInput,
} from './types';

export const PCI_DSS_FRAMEWORK: ComplianceFramework = {
  id: 'pci-dss',
  name: 'PCI-DSS',
  version: '4.0',
  description:
    'Payment Card Industry Data Security Standard v4.0 — security requirements relevant to vulnerability management for cardholder data environments',
  controls: [
    {
      id: 'Req-1.2',
      title: 'Network Security Controls Configured and Maintained',
      description:
        'Network security controls (NSCs) are configured and maintained to protect the cardholder data environment.',
      category: 'Build and Maintain a Secure Network',
      evidenceRequirements: [
        'NSC rulesets reviewed periodically',
        'Network diagrams maintained and current',
        'Inbound and outbound traffic restricted',
      ],
    },
    {
      id: 'Req-1.3',
      title: 'Network Access Restricted',
      description:
        'Network access to and from the cardholder data environment is restricted.',
      category: 'Build and Maintain a Secure Network',
      evidenceRequirements: [
        'CDE network segmentation implemented',
        'Traffic rules restrict access to CDE',
        'Wireless access to CDE controlled',
      ],
    },
    {
      id: 'Req-2.2',
      title: 'System Components Configured Securely',
      description:
        'System components are configured and managed securely, including removal of defaults and unnecessary services.',
      category: 'Build and Maintain a Secure Network',
      evidenceRequirements: [
        'Configuration standards documented',
        'Default credentials changed',
        'Unnecessary services removed',
        'Security parameters configured',
      ],
    },
    {
      id: 'Req-3.4',
      title: 'PAN Display Masked',
      description:
        'Primary Account Number (PAN) is masked when displayed so that only personnel with a business need can see more than the first six/last four digits.',
      category: 'Protect Account Data',
      evidenceRequirements: [
        'PAN masking implemented (first 6/last 4)',
        'Business need documented for full PAN access',
      ],
    },
    {
      id: 'Req-3.5',
      title: 'PAN Secured Wherever Stored',
      description:
        'Primary account number (PAN) is secured wherever it is stored through strong cryptography.',
      category: 'Protect Account Data',
      evidenceRequirements: [
        'Strong cryptography for stored PAN',
        'Key management procedures documented',
        'Encryption key rotation schedule',
      ],
    },
    {
      id: 'Req-5.2',
      title: 'Malicious Software Detected and Addressed',
      description:
        'Malicious software (malware) is prevented or detected and addressed.',
      category: 'Maintain a Vulnerability Management Program',
      evidenceRequirements: [
        'Anti-malware deployed on applicable systems',
        'Malware detection mechanisms active',
        'Malware incidents investigated',
      ],
    },
    {
      id: 'Req-5.3',
      title: 'Anti-Malware Mechanisms Active',
      description:
        'Anti-malware mechanisms and processes are active, maintained, and monitored.',
      category: 'Maintain a Vulnerability Management Program',
      evidenceRequirements: [
        'Anti-malware solutions up to date',
        'Periodic scans performed',
        'Anti-malware logs retained and reviewed',
      ],
    },
    {
      id: 'Req-6.2',
      title: 'Bespoke/Custom Software Developed Securely',
      description:
        'Bespoke and custom software is developed securely, following secure development practices.',
      category: 'Develop and Maintain Secure Systems',
      evidenceRequirements: [
        'Secure coding standards followed',
        'Code reviews performed',
        'Developer security training',
      ],
    },
    {
      id: 'Req-6.3',
      title: 'Security Vulnerabilities Identified and Addressed',
      description:
        'Security vulnerabilities are identified and addressed through a vulnerability management process.',
      category: 'Develop and Maintain Secure Systems',
      evidenceRequirements: [
        'Vulnerability scanning performed regularly',
        'Vulnerabilities ranked by risk',
        'Critical/high vulnerabilities remediated promptly',
        'Remediation timelines enforced via SLA',
      ],
    },
    {
      id: 'Req-6.4',
      title: 'Public-Facing Web Apps Protected',
      description:
        'Public-facing web applications are protected against attacks through application-level security controls.',
      category: 'Develop and Maintain Secure Systems',
      evidenceRequirements: [
        'Web application firewall (WAF) deployed',
        'Application vulnerability assessments',
        'Web app security controls reviewed annually',
      ],
    },
    {
      id: 'Req-7.2',
      title: 'Access Appropriately Defined',
      description:
        'Access to system components and data is appropriately defined and assigned based on job classification and function.',
      category: 'Implement Strong Access Control Measures',
      evidenceRequirements: [
        'Access control model documented',
        'Least privilege principle enforced',
        'Access assigned based on job function',
      ],
    },
    {
      id: 'Req-7.3',
      title: 'Access Managed via Access Control System',
      description:
        'Access to system components and data is managed via an access control system(s).',
      category: 'Implement Strong Access Control Measures',
      evidenceRequirements: [
        'Access control system implemented',
        'Default deny-all setting',
        'Access reviews performed periodically',
      ],
    },
    {
      id: 'Req-8.2',
      title: 'User Identification Managed',
      description:
        'User identification and related accounts for users and administrators are strictly managed throughout an account lifecycle.',
      category: 'Implement Strong Access Control Measures',
      evidenceRequirements: [
        'Unique IDs assigned to all users',
        'Shared/generic account use prohibited',
        'Account lifecycle management (creation, modification, deletion)',
      ],
    },
    {
      id: 'Req-8.3',
      title: 'Strong Authentication Established',
      description:
        'Strong authentication for users and administrators is established and managed.',
      category: 'Implement Strong Access Control Measures',
      evidenceRequirements: [
        'Strong password policies enforced',
        'Password/passphrase minimum complexity',
        'Authentication lockout after failed attempts',
      ],
    },
    {
      id: 'Req-8.4',
      title: 'MFA Implemented',
      description:
        'Multi-factor authentication (MFA) is implemented to secure access into the cardholder data environment.',
      category: 'Implement Strong Access Control Measures',
      evidenceRequirements: [
        'MFA for all administrative access',
        'MFA for all remote network access to CDE',
        'MFA implementation uses approved factors',
      ],
    },
    {
      id: 'Req-10.2',
      title: 'Audit Logs Implemented',
      description:
        'Audit logs are implemented to support the detection of anomalies and suspicious activity, and the forensic analysis of events.',
      category: 'Track and Monitor All Access',
      evidenceRequirements: [
        'Audit logging enabled for all system components',
        'Logs capture user identification, event type, date/time, success/failure',
        'Logs capture access to cardholder data',
      ],
    },
    {
      id: 'Req-10.3',
      title: 'Audit Logs Protected',
      description:
        'Audit logs are protected from destruction and unauthorized modifications.',
      category: 'Track and Monitor All Access',
      evidenceRequirements: [
        'Audit log integrity controls (tamper evidence)',
        'Log access restricted to need-to-know',
        'Audit log backup procedures',
      ],
    },
    {
      id: 'Req-11.3',
      title: 'Vulnerabilities Regularly Identified',
      description:
        'External and internal vulnerabilities are regularly identified, prioritized, and addressed via vulnerability scanning.',
      category: 'Regularly Test Security Systems',
      evidenceRequirements: [
        'Internal vulnerability scans at least quarterly',
        'External ASV scans at least quarterly',
        'Rescans verify remediation',
        'High-risk vulnerabilities addressed within defined timelines',
      ],
    },
    {
      id: 'Req-11.4',
      title: 'Penetration Testing Performed',
      description:
        'External and internal penetration testing is regularly performed and exploitable vulnerabilities and security weaknesses are corrected.',
      category: 'Regularly Test Security Systems',
      evidenceRequirements: [
        'Penetration testing at least annually',
        'Testing after significant changes',
        'Findings remediated and retested',
      ],
    },
    {
      id: 'Req-12.10',
      title: 'Security Incidents Responded to Immediately',
      description:
        'Suspected and confirmed security incidents that could impact the CDE are responded to immediately.',
      category: 'Maintain an Information Security Policy',
      evidenceRequirements: [
        'Incident response plan established',
        'Personnel trained on incident response',
        'Incident response tested annually',
        'Incidents documented and lessons learned captured',
      ],
    },
  ],
};

export function assessPCIDSS(input: ComplianceAssessmentInput): ComplianceEvidence[] {
  const evidences: ComplianceEvidence[] = [];
  const now = new Date().toISOString();

  // Req-1.2 — Network Security Controls
  evidences.push({
    controlId: 'Req-1.2',
    status: 'partial',
    evidence:
      'Platform deployed behind GCP Cloud Armor WAF with VPC Service Controls. Network security control rulesets require organizational review and documentation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Req-1.3 — Network Access Restricted
  evidences.push({
    controlId: 'Req-1.3',
    status: 'partial',
    evidence:
      'GCP VPC network segmentation in place. CDE-specific network restrictions require organizational network architecture review.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Req-2.2 — Secure Configuration
  evidences.push({
    controlId: 'Req-2.2',
    status: 'partial',
    evidence:
      'Platform uses hardened container images with minimal attack surface. Configuration management tracked. Full configuration standards documentation requires organizational effort.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Req-3.4 — PAN Display Masked
  evidences.push({
    controlId: 'Req-3.4',
    status: 'na',
    evidence:
      'Vulnerability management platform does not store, process, or display Primary Account Numbers (PAN). Not applicable to this system.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Req-3.5 — PAN Secured
  evidences.push({
    controlId: 'Req-3.5',
    status: 'na',
    evidence:
      'Vulnerability management platform does not store PAN data. AES-256-GCM encryption is used for all sensitive data at rest. Not applicable for PAN-specific requirements.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Req-5.2 — Malware Detection
  evidences.push({
    controlId: 'Req-5.2',
    status: 'na',
    evidence:
      'Cloud-based SaaS platform on managed infrastructure. Anti-malware is the responsibility of endpoint owners. Platform monitors for vulnerability indicators via scan ingestion.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Req-5.3 — Anti-Malware Mechanisms
  evidences.push({
    controlId: 'Req-5.3',
    status: 'na',
    evidence:
      'Cloud-based SaaS platform. Anti-malware mechanism maintenance is endpoint owner responsibility. GCP provides infrastructure-level protections.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Req-6.2 — Secure Development
  evidences.push({
    controlId: 'Req-6.2',
    status: 'met',
    evidence:
      'Platform developed with TypeScript strict mode, ESLint enforcement, and code review process. Zod input validation at API boundaries. Dependency scanning via npm audit.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Req-6.3 — Vulnerabilities Identified and Addressed
  {
    const hasScanning = input.totalFindings > 0;
    const hasRemediation = input.totalClosedCases > 0;
    const hasSla = input.hasSlaPolicies;
    const fastRemediation = input.averageRemediationDays <= 30;
    const score = [hasScanning, hasRemediation, hasSla, fastRemediation].filter(Boolean).length;

    evidences.push({
      controlId: 'Req-6.3',
      status: score >= 3 ? 'met' : score >= 2 ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? `${input.totalFindings} vulnerabilities tracked from scan ingestion` : 'No vulnerability scan data',
        hasRemediation ? `${input.totalClosedCases} vulnerabilities remediated` : 'No remediation activity',
        hasSla ? `SLA policies enforce remediation timelines, ${input.slaComplianceRate}% compliance` : 'No SLA policies configured',
        `Average remediation: ${input.averageRemediationDays} days`,
        `${input.criticalOpenCount} critical, ${input.highOpenCount} high open vulnerabilities`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // Req-6.4 — Public-Facing Web App Protection
  evidences.push({
    controlId: 'Req-6.4',
    status: 'met',
    evidence:
      'GCP Cloud Armor WAF deployed for all public-facing endpoints. CSP headers configured. CSRF protection implemented. Application vulnerability assessments performed via scan ingestion.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Req-7.2 — Access Appropriately Defined
  evidences.push({
    controlId: 'Req-7.2',
    status: 'met',
    evidence:
      'RBAC with 10 roles enforces least privilege. Access assigned based on role: PLATFORM_ADMIN, SECURITY_ADMIN, ANALYST, DEVELOPER, VIEWER, etc. Multi-tenant org isolation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Req-7.3 — Access Control System
  evidences.push({
    controlId: 'Req-7.3',
    status: 'met',
    evidence:
      'Access control system implements default deny. All API routes require authentication. RBAC middleware enforces authorization on every request. Periodic access reviews supported via admin interface.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Req-8.2 — User Identification
  evidences.push({
    controlId: 'Req-8.2',
    status: 'met',
    evidence:
      'Unique user IDs assigned via email-based accounts. No shared/generic accounts. Account lifecycle managed through admin user management interface with creation, modification, and deletion.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Req-8.3 — Strong Authentication
  evidences.push({
    controlId: 'Req-8.3',
    status: 'met',
    evidence:
      'Password policies enforced including complexity requirements and HIBP breach checking. OAuth providers (Google/GitHub) enforce their own strong authentication. Session management with secure tokens.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Req-8.4 — MFA
  evidences.push({
    controlId: 'Req-8.4',
    status: 'met',
    evidence:
      'Multi-factor authentication available via TOTP. MFA supported for all user roles. SSO providers (SAML/OIDC) can enforce MFA at the identity provider level.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Req-10.2 — Audit Logs Implemented
  {
    const hasAudit = input.hasAuditLogs;

    evidences.push({
      controlId: 'Req-10.2',
      status: hasAudit ? 'met' : 'not_met',
      evidence: hasAudit
        ? 'Audit logging captures user identification, event type, timestamp, success/failure, and affected resources. All security-relevant actions logged.'
        : 'Audit logging not configured. Enable audit logs for PCI-DSS compliance.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // Req-10.3 — Audit Logs Protected
  {
    const hasAudit = input.hasAuditLogs;

    evidences.push({
      controlId: 'Req-10.3',
      status: hasAudit ? 'met' : 'not_met',
      evidence: hasAudit
        ? 'Audit logs use tamper-evident hash chain for integrity. Log access restricted via RBAC. Backup via GCP Cloud Logging retention.'
        : 'No audit logs to protect. Enable audit logging first.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // Req-11.3 — Vulnerability Scanning
  {
    const hasScanning = input.totalFindings > 0;
    const recentScan = input.lastScanDate
      ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 90
      : false;
    const frequentScans = input.scanFrequencyDays <= 90; // quarterly minimum

    evidences.push({
      controlId: 'Req-11.3',
      status: hasScanning && recentScan && frequentScans ? 'met' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? `${input.totalFindings} findings from vulnerability scans ingested` : 'No vulnerability scan data',
        recentScan ? `Last scan: ${input.lastScanDate}` : 'No scan within the last 90 days',
        `Average scan frequency: ${input.scanFrequencyDays} days (PCI requires quarterly minimum)`,
        `${input.criticalOpenCount} critical, ${input.highOpenCount} high, ${input.kevOpenCount} KEV-listed open`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // Req-11.4 — Penetration Testing
  evidences.push({
    controlId: 'Req-11.4',
    status: 'partial',
    evidence:
      'Platform supports tracking of penetration test findings via scan ingestion (SARIF, CSV formats). Penetration test scheduling and execution require organizational process.',
    lastVerified: now,
    autoAssessed: true,
  });

  // Req-12.10 — Incident Response
  {
    const hasWorkflow = input.totalOpenCases > 0 || input.totalClosedCases > 0;
    const hasSla = input.hasSlaPolicies;
    const hasAudit = input.hasAuditLogs;
    const score = [hasWorkflow, hasSla, hasAudit].filter(Boolean).length;

    evidences.push({
      controlId: 'Req-12.10',
      status: score >= 3 ? 'met' : score >= 1 ? 'partial' : 'not_met',
      evidence: [
        hasWorkflow ? `Incident workflow active: ${input.totalOpenCases} open, ${input.totalClosedCases} closed cases` : 'No incident workflow detected',
        hasSla ? 'SLA policies enforce response timelines' : 'No SLA policies for incident response',
        hasAudit ? 'Incidents documented via audit trail' : 'No audit trail for incident documentation',
        'Annual IR testing and personnel training require organizational process',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  return evidences;
}
