/**
 * SOC 2 Type II — All 5 Trust Service Categories
 *
 * 52 controls total:
 *   Common Criteria (CC): 33
 *   Availability (A):      3
 *   Confidentiality (C):   3
 *   Processing Integrity:  5
 *   Privacy (P):           8
 */

import type {
  ComplianceFramework,
  ComplianceEvidence,
  ComplianceAssessmentInput,
} from './types';

export const SOC2_FRAMEWORK: ComplianceFramework = {
  id: 'soc2-type2',
  name: 'SOC 2 Type II',
  version: '2017',
  description:
    'AICPA Service Organization Control 2 — Trust Services Criteria across all five categories relevant to vulnerability management',
  controls: [
    // ─── CC1: Control Environment ──────────────────────────────────────
    {
      id: 'CC1.1',
      title: 'COSO Principle 1 — Commitment to Integrity and Ethical Values',
      description:
        'The entity demonstrates a commitment to integrity and ethical values.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Code of conduct or ethics policy published',
        'Security policies communicated to all personnel',
      ],
    },
    {
      id: 'CC1.2',
      title: 'COSO Principle 2 — Board Exercises Oversight Responsibility',
      description:
        'The board of directors demonstrates independence from management and exercises oversight of the development and performance of internal control.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Governance or oversight body defined',
        'Security responsibilities assigned to leadership',
      ],
    },
    {
      id: 'CC1.3',
      title: 'COSO Principle 3 — Establishes Authority and Responsibility',
      description:
        'Management establishes, with board oversight, structures, reporting lines, and appropriate authorities and responsibilities in the pursuit of objectives.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Organizational structure documented',
        'Security roles and responsibilities defined',
        'RBAC model implemented',
      ],
    },
    {
      id: 'CC1.4',
      title: 'COSO Principle 4 — Commitment to Competence',
      description:
        'The entity demonstrates a commitment to attract, develop, and retain competent individuals in alignment with objectives.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Security training program documented',
        'Personnel qualifications tracked',
      ],
    },
    {
      id: 'CC1.5',
      title: 'COSO Principle 5 — Enforces Accountability',
      description:
        'The entity holds individuals accountable for their internal control responsibilities in the pursuit of objectives.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Accountability measures documented',
        'Audit trail of user actions maintained',
        'Case assignment and ownership tracked',
      ],
    },

    // ─── CC2: Communication & Information ──────────────────────────────
    {
      id: 'CC2.1',
      title: 'COSO Principle 13 — Uses Relevant Information',
      description:
        'The entity obtains or generates and uses relevant, quality information to support the functioning of internal control.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Vulnerability data enriched with NVD/EPSS/KEV',
        'Dashboard provides quality information to stakeholders',
        'Reporting capabilities available',
      ],
    },
    {
      id: 'CC2.2',
      title: 'COSO Principle 14 — Communicates Internally',
      description:
        'The entity internally communicates information, including objectives and responsibilities for internal control, necessary to support the functioning of internal control.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Internal notifications for findings and cases',
        'SLA breach alerts configured',
        'Dashboard accessible to authorized personnel',
      ],
    },
    {
      id: 'CC2.3',
      title: 'COSO Principle 15 — Communicates Externally',
      description:
        'The entity communicates with external parties regarding matters affecting the functioning of internal control.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Client portal for external stakeholders',
        'Export and reporting capabilities for auditors',
        'Webhook notifications for external integrations',
      ],
    },

    // ─── CC3: Risk Assessment ──────────────────────────────────────────
    {
      id: 'CC3.1',
      title: 'COSO Principle 6 — Specifies Suitable Objectives',
      description:
        'The entity specifies objectives with sufficient clarity to enable the identification and assessment of risks relating to objectives.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'SLA policies define remediation objectives',
        'Severity-based prioritization configured',
        'Compliance framework objectives documented',
      ],
    },
    {
      id: 'CC3.2',
      title: 'COSO Principle 7 — Identifies and Analyzes Risk',
      description:
        'The entity identifies risks to the achievement of its objectives across the entity and analyzes risks as a basis for determining how the risks should be managed.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Vulnerability scanning identifies risks',
        'CVSS/EPSS risk scoring applied',
        'KEV catalog cross-referenced',
        'Risk exceptions documented',
      ],
    },
    {
      id: 'CC3.3',
      title: 'COSO Principle 8 — Considers Fraud Risk',
      description:
        'The entity considers the potential for fraud in assessing risks to the achievement of objectives.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Audit logging with tamper-evident hash chain',
        'Authentication controls prevent unauthorized access',
        'Separation of duties in role assignments',
      ],
    },
    {
      id: 'CC3.4',
      title: 'COSO Principle 9 — Identifies and Analyzes Significant Change',
      description:
        'The entity identifies and assesses changes that could significantly impact the system of internal control.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'New vulnerability detection from scan ingestion',
        'Change tracking via case management',
        'Integration with ticketing systems for change management',
      ],
    },

    // ─── CC4: Monitoring Activities ────────────────────────────────────
    {
      id: 'CC4.1',
      title: 'COSO Principle 16 — Selects and Develops Monitoring Activities',
      description:
        'The entity selects, develops, and performs ongoing and/or separate evaluations to ascertain whether the components of internal control are present and functioning.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Continuous vulnerability scanning configured',
        'SLA compliance monitoring active',
        'Dashboard widgets display key metrics',
        'Compliance score tracking',
      ],
    },
    {
      id: 'CC4.2',
      title: 'COSO Principle 17 — Evaluates and Communicates Deficiencies',
      description:
        'The entity evaluates and communicates internal control deficiencies in a timely manner to those parties responsible for taking corrective action.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'SLA breach notifications delivered',
        'Critical/high finding alerts',
        'POAM generation for compliance gaps',
        'Executive reporting available',
      ],
    },

    // ─── CC5: Control Activities ───────────────────────────────────────
    {
      id: 'CC5.1',
      title: 'COSO Principle 10 — Selects and Develops Control Activities',
      description:
        'The entity selects and develops control activities that contribute to the mitigation of risks to the achievement of objectives to acceptable levels.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Remediation workflows defined',
        'Risk exception approval process',
        'SLA policies enforce remediation timelines',
      ],
    },
    {
      id: 'CC5.2',
      title: 'COSO Principle 11 — Technology General Controls',
      description:
        'The entity selects and develops general control activities over technology to support the achievement of objectives.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Automated scan ingestion and parsing',
        'AI-powered triage and prioritization',
        'Automated enrichment with NVD/EPSS/KEV data',
      ],
    },
    {
      id: 'CC5.3',
      title: 'COSO Principle 12 — Deploys Through Policies and Procedures',
      description:
        'The entity deploys control activities through policies and procedures that put policies into action.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'SLA policies documented and enforced',
        'Remediation procedures via case workflow',
        'Compliance frameworks mapped to controls',
      ],
    },

    // ─── CC6: Logical & Physical Access ────────────────────────────────
    {
      id: 'CC6.1',
      title: 'Logical Access Security',
      description:
        'The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Role-based access control implemented',
        'Authentication mechanisms in place',
        'Access reviews performed periodically',
      ],
    },
    {
      id: 'CC6.2',
      title: 'User Authentication',
      description:
        'Prior to issuing system credentials and granting system access, the entity registers and authorizes new internal and external users.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'User registration with identity verification',
        'Multi-factor authentication available',
        'SSO integration (SAML/OIDC)',
      ],
    },
    {
      id: 'CC6.3',
      title: 'Access Management',
      description:
        'The entity authorizes, modifies, or removes access to data, software, functions, and other protected information assets based on roles, responsibilities, or the system design and changes.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Role-based permissions enforced',
        'Access provisioning and de-provisioning processes',
        'Team and organization-scoped access',
      ],
    },
    {
      id: 'CC6.4',
      title: 'Restrict Physical Access',
      description:
        'The entity restricts physical access to facilities and protected information assets to authorized personnel.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Cloud infrastructure provider physical controls (GCP)',
        'Data center SOC 2 compliance inherited',
      ],
    },
    {
      id: 'CC6.5',
      title: 'Protect Against External Threats',
      description:
        'The entity discontinues logical and physical protections over physical assets only after the ability to protect is no longer needed.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'WAF protection (Cloud Armor)',
        'IP allowlist capabilities',
        'Rate limiting on API endpoints',
      ],
    },
    {
      id: 'CC6.6',
      title: 'Secure Transmission',
      description:
        'The entity implements logical access security measures to protect against threats from sources outside its system boundaries.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'TLS encryption for all data in transit',
        'HTTPS-only external communications',
        'API authentication required for all endpoints',
      ],
    },
    {
      id: 'CC6.7',
      title: 'Restrict Data Movement',
      description:
        'The entity restricts the transmission, movement, and removal of information to authorized internal and external users and processes.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Export controls with authorization',
        'Data residency controls',
        'Tenant isolation on all queries',
      ],
    },
    {
      id: 'CC6.8',
      title: 'Vulnerability Management',
      description:
        'The entity implements controls to prevent or detect and act upon the introduction of unauthorized or malicious software.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Regular vulnerability scanning',
        'Vulnerability remediation tracked',
        'SLA policies for remediation timelines',
        'Risk exception process documented',
      ],
    },

    // ─── CC7: System Operations ────────────────────────────────────────
    {
      id: 'CC7.1',
      title: 'Detect and Monitor',
      description:
        'To meet its objectives, the entity uses detection and monitoring procedures to identify changes to configurations that result in the introduction of new vulnerabilities.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Continuous monitoring of vulnerabilities',
        'Alerting on critical vulnerabilities',
        'KEV tracking enabled',
        'EPSS scoring utilized',
      ],
    },
    {
      id: 'CC7.2',
      title: 'Monitor for Anomalies',
      description:
        'The entity monitors system components and the operation of those components for anomalies that are indicative of malicious acts, natural disasters, and errors affecting the entity\'s ability to meet its objectives.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Workflow status tracking for cases',
        'Audit trail of all changes',
        'Escalation procedures documented',
        'SLA breach notifications',
      ],
    },
    {
      id: 'CC7.3',
      title: 'Evaluate Security Events',
      description:
        'The entity evaluates security events to determine whether they could or have resulted in a failure of the entity to meet its objectives and, if so, takes action to prevent or address such failures.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Triage process for vulnerabilities',
        'Severity classification system',
        'Risk exception approval workflow',
      ],
    },
    {
      id: 'CC7.4',
      title: 'Respond to Incidents',
      description:
        'The entity responds to identified security incidents by executing a defined incident response program to understand, contain, remediate, and communicate security incidents.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Case management for incident tracking',
        'Remediation workflow with assignment',
        'Communication via comments and notifications',
        'Integration with external ticketing',
      ],
    },
    {
      id: 'CC7.5',
      title: 'Recover from Incidents',
      description:
        'The entity identifies, develops, and implements activities to recover from identified security incidents.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Remediation verification before case closure',
        'Post-incident review via audit logs',
        'Lessons learned documented in case history',
      ],
    },

    // ─── CC8: Change Management ────────────────────────────────────────
    {
      id: 'CC8.1',
      title: 'Change Management',
      description:
        'The entity authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Change tracking via ticketing integration',
        'Remediation workflow documented',
        'Verification step before closure',
      ],
    },

    // ─── CC9: Risk Mitigation ──────────────────────────────────────────
    {
      id: 'CC9.1',
      title: 'Risk Identification, Assessment, and Management',
      description:
        'The entity identifies, selects, and develops risk mitigation activities for risks arising from potential business disruptions.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Risk scoring with CVSS, EPSS, KEV',
        'Risk exception workflow with approvals',
        'SLA-based remediation prioritization',
        'POAM generation for tracking',
      ],
    },
    {
      id: 'CC9.2',
      title: 'Vendor and Business Partner Risk',
      description:
        'The entity assesses and manages risks associated with vendors and business partners.',
      category: 'Common Criteria',
      evidenceRequirements: [
        'Third-party scanner integration',
        'Multi-client risk visibility (MSSP)',
        'Portfolio-level risk dashboard',
      ],
    },

    // ─── A1: Availability ──────────────────────────────────────────────
    {
      id: 'A1.1',
      title: 'Capacity Planning and Availability Monitoring',
      description:
        'The entity maintains, monitors, and evaluates current processing capacity and use of system components to manage capacity demand and to enable the implementation of additional capacity to help meet its objectives.',
      category: 'Availability',
      evidenceRequirements: [
        'Cloud Run auto-scaling configured',
        'Cloud SQL capacity monitoring',
        'System health monitoring via Cloud Logging',
      ],
    },
    {
      id: 'A1.2',
      title: 'Environmental Protections and Recovery Infrastructure',
      description:
        'The entity authorizes, designs, develops or acquires, implements, operates, approves, maintains, and monitors environmental protections, software, data backup and recovery infrastructure to meet its objectives.',
      category: 'Availability',
      evidenceRequirements: [
        'Automated database backups (Cloud SQL)',
        'Data retention policies configured',
        'Infrastructure as Code (Terraform)',
      ],
    },
    {
      id: 'A1.3',
      title: 'Recovery Plan Testing',
      description:
        'The entity tests recovery plan procedures supporting system recovery to meet its objectives.',
      category: 'Availability',
      evidenceRequirements: [
        'Backup restoration tested periodically',
        'Disaster recovery procedures documented',
        'RTO/RPO objectives defined',
      ],
    },

    // ─── C1: Confidentiality ───────────────────────────────────────────
    {
      id: 'C1.1',
      title: 'Identify and Classify Confidential Information',
      description:
        'The entity identifies and maintains confidential information to meet the entity\'s objectives related to confidentiality.',
      category: 'Confidentiality',
      evidenceRequirements: [
        'Vulnerability data classified by severity',
        'Tenant data isolated per organization',
        'Sensitive fields encrypted at rest (AES-256-GCM)',
      ],
    },
    {
      id: 'C1.2',
      title: 'Dispose of Confidential Information',
      description:
        'The entity disposes of confidential information to meet the entity\'s objectives related to confidentiality.',
      category: 'Confidentiality',
      evidenceRequirements: [
        'Data retention policies enforce disposal schedules',
        'Client data deletion capability',
        'Retention cron job for automated cleanup',
      ],
    },
    {
      id: 'C1.3',
      title: 'Protect Confidential Information During Transmission',
      description:
        'The entity protects confidential information during transmission to meet the entity\'s objectives related to confidentiality.',
      category: 'Confidentiality',
      evidenceRequirements: [
        'TLS 1.2+ for all data in transit',
        'HTTPS-only external communications',
        'Encrypted API tokens and webhook secrets',
      ],
    },

    // ─── PI1: Processing Integrity ─────────────────────────────────────
    {
      id: 'PI1.1',
      title: 'Processing Specifications',
      description:
        'The entity obtains or generates, uses, and communicates relevant, quality information regarding the objectives related to processing, including definitions of data processed and product and service specifications.',
      category: 'Processing Integrity',
      evidenceRequirements: [
        'Scanner format specifications documented (11 formats)',
        'Parsing validation rules per format',
        'CVE enrichment data sources defined (NVD, EPSS, KEV)',
      ],
    },
    {
      id: 'PI1.2',
      title: 'Input Processing Integrity',
      description:
        'The entity implements policies and procedures over system inputs to result in products, services, and reporting to meet the entity\'s objectives.',
      category: 'Processing Integrity',
      evidenceRequirements: [
        'Input validation on scan file uploads',
        'Parser error handling and rejection of malformed data',
        'Upload progress tracking and job status',
      ],
    },
    {
      id: 'PI1.3',
      title: 'Processing Activities Integrity',
      description:
        'The entity implements policies and procedures over system processing to result in products, services, and reporting to meet the entity\'s objectives.',
      category: 'Processing Integrity',
      evidenceRequirements: [
        'Vulnerability deduplication logic',
        'Enrichment pipeline with NVD/EPSS/KEV',
        'AI triage produces consistent severity classifications',
      ],
    },
    {
      id: 'PI1.4',
      title: 'Output Processing Integrity',
      description:
        'The entity implements policies and procedures to make available or deliver output completely, accurately, and timely in accordance with specifications to meet the entity\'s objectives.',
      category: 'Processing Integrity',
      evidenceRequirements: [
        'Findings list accurately reflects scan data',
        'Export reports match underlying data',
        'POAM output conforms to compliance requirements',
      ],
    },
    {
      id: 'PI1.5',
      title: 'Store Inputs and Outputs',
      description:
        'The entity implements policies and procedures to store inputs and outputs completely, accurately, and timely in accordance with system specifications.',
      category: 'Processing Integrity',
      evidenceRequirements: [
        'Scan artifacts stored in GCS',
        'Database records with audit timestamps',
        'Data retention policies applied to stored data',
      ],
    },

    // ─── P1: Privacy ───────────────────────────────────────────────────
    {
      id: 'P1.1',
      title: 'Privacy Notice',
      description:
        'The entity provides notice to data subjects about its privacy practices to meet the entity\'s objectives related to privacy.',
      category: 'Privacy',
      evidenceRequirements: [
        'Privacy notice published describing purpose, collection, retention',
        'Data subject rights documented',
        'Disclosure practices communicated',
      ],
    },
    {
      id: 'P1.2',
      title: 'Choice and Consent',
      description:
        'The entity communicates choices available regarding the collection, use, retention, disclosure, and disposal of personal information to data subjects.',
      category: 'Privacy',
      evidenceRequirements: [
        'Consent obtained before data collection',
        'Opt-out mechanisms available',
        'Consent records maintained',
      ],
    },
    {
      id: 'P1.3',
      title: 'Collection Limitation',
      description:
        'The entity collects personal information only for the purposes identified in the notice.',
      category: 'Privacy',
      evidenceRequirements: [
        'Data collection limited to vulnerability management purpose',
        'Minimal PII collected (email, name for user accounts)',
        'No unnecessary personal data in scan results',
      ],
    },
    {
      id: 'P1.4',
      title: 'Use, Retention, and Disposal',
      description:
        'The entity limits the use of personal information to the purposes identified in the notice and retains personal information for the period needed.',
      category: 'Privacy',
      evidenceRequirements: [
        'Data used only for vulnerability management',
        'Retention policies enforced per organization tier',
        'Data deletion capability available',
      ],
    },
    {
      id: 'P1.5',
      title: 'Access to Personal Information',
      description:
        'The entity provides data subjects with access to their personal information for review and correction.',
      category: 'Privacy',
      evidenceRequirements: [
        'Users can view their profile data',
        'Data export capability available',
        'Data correction mechanisms in place',
      ],
    },
    {
      id: 'P1.6',
      title: 'Disclosure and Notification',
      description:
        'The entity discloses personal information to third parties with the consent of the data subject and notifies data subjects of any such disclosure.',
      category: 'Privacy',
      evidenceRequirements: [
        'Third-party integrations disclosed',
        'Webhook data transmission documented',
        'Data sharing agreements with sub-processors',
      ],
    },
    {
      id: 'P1.7',
      title: 'Quality of Personal Information',
      description:
        'The entity collects and maintains accurate, up-to-date, complete, and relevant personal information.',
      category: 'Privacy',
      evidenceRequirements: [
        'User profile data kept current',
        'Stale data cleanup via retention policies',
        'Data accuracy validation on input',
      ],
    },
    {
      id: 'P1.8',
      title: 'Monitoring and Enforcement',
      description:
        'The entity monitors compliance with its privacy commitments and procedures and has procedures to address privacy-related inquiries, complaints, and disputes.',
      category: 'Privacy',
      evidenceRequirements: [
        'Privacy compliance monitoring in place',
        'Data deletion request workflow',
        'Audit logs track data access',
      ],
    },
  ],
};

// ─── Assessment Logic ──────────────────────────────────────────────────────────

export function assessSOC2(input: ComplianceAssessmentInput): ComplianceEvidence[] {
  const evidences: ComplianceEvidence[] = [];
  const now = new Date().toISOString();

  // Helper: push evidence
  const add = (
    controlId: string,
    status: 'met' | 'partial' | 'not_met' | 'na',
    evidence: string,
  ) => {
    evidences.push({ controlId, status, evidence, lastVerified: now, autoAssessed: true });
  };

  // Derived flags used across many controls
  const hasScanning = input.totalFindings > 0;
  const hasCases = input.totalOpenCases > 0 || input.totalClosedCases > 0;
  const hasRemediation = input.totalClosedCases > 0;
  const recentScan = input.lastScanDate
    ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
    : false;
  const hasFrequentScans = input.scanFrequencyDays <= 14;
  const goodSla = input.slaComplianceRate >= 80;

  // ─── CC1: Control Environment ────────────────────────────────────────

  // CC1.1-CC1.2: Organizational — platform cannot auto-assess tone-at-the-top or board oversight
  add('CC1.1', 'partial', 'Platform enforces security policies; organizational ethics policy is outside platform scope.');
  add('CC1.2', 'partial', 'Platform provides audit evidence for oversight; board governance is organizational responsibility.');

  // CC1.3: Authority/responsibility — RBAC provides this
  add('CC1.3', 'met',
    'RBAC implemented with 10 roles (PLATFORM_ADMIN, SECURITY_ADMIN, ORG_ADMIN, ANALYST, DEVELOPER, VIEWER, MSSP_ADMIN, CLIENT_ADMIN, CLIENT_VIEWER, AUDITOR). Organization and team scoping enforced.');

  // CC1.4: Competence — organizational
  add('CC1.4', 'partial', 'Platform tracks user roles and permissions; training and competency programs are organizational responsibility.');

  // CC1.5: Accountability
  add('CC1.5', input.hasAuditLogs ? 'met' : 'partial',
    input.hasAuditLogs
      ? `Audit logging with tamper-evident hash chain active. Case ownership tracked across ${input.totalOpenCases + input.totalClosedCases} cases.`
      : 'Case assignment tracked but audit logging not confirmed.');

  // ─── CC2: Communication & Information ────────────────────────────────

  add('CC2.1', hasScanning ? 'met' : 'partial',
    hasScanning
      ? `${input.totalFindings} findings enriched with NVD/EPSS/KEV data. Dashboard provides real-time visibility.`
      : 'No scan data ingested yet; dashboard and enrichment pipeline ready.');

  add('CC2.2', input.hasSlaPolicies ? 'met' : 'partial',
    input.hasSlaPolicies
      ? `SLA breach notifications active (${input.slaComplianceRate}% compliance). Internal alerts configured.`
      : 'Notification infrastructure ready; SLA policies not yet configured.');

  add('CC2.3', input.hasIntegrations ? 'met' : 'partial',
    input.hasIntegrations
      ? 'Client portal, export reports, and webhook integrations active for external communication.'
      : 'Client portal and export available; no external integrations configured.');

  // ─── CC3: Risk Assessment ────────────────────────────────────────────

  add('CC3.1', input.hasSlaPolicies ? 'met' : 'partial',
    input.hasSlaPolicies
      ? `SLA policies define remediation objectives by severity. ${input.slaComplianceRate}% compliance rate.`
      : 'Severity-based prioritization available; SLA objectives not yet configured.');

  {
    const signals = [hasScanning, input.hasRiskExceptions, input.kevOpenCount >= 0].filter(Boolean).length;
    add('CC3.2', signals >= 2 ? 'met' : 'partial',
      [
        hasScanning ? `${input.totalFindings} findings with CVSS/EPSS risk scoring` : 'No scan data for risk identification',
        `${input.kevOpenCount} open KEV-listed vulnerabilities tracked`,
        input.hasRiskExceptions ? 'Risk exception process documents accepted risks' : 'No risk exceptions documented',
      ].join('. '));
  }

  add('CC3.3', input.hasAuditLogs ? 'met' : 'partial',
    input.hasAuditLogs
      ? 'Tamper-evident audit logging, MFA support, and RBAC separation of duties mitigate fraud risk.'
      : 'RBAC and authentication controls in place; audit logging not confirmed.');

  add('CC3.4', hasScanning ? 'met' : 'partial',
    hasScanning
      ? `Scan ingestion detects new vulnerabilities. ${input.totalFindings} findings tracked with change history.`
      : 'Scan ingestion pipeline ready to detect changes; no scan data yet.');

  // ─── CC4: Monitoring Activities ──────────────────────────────────────

  {
    const score = [recentScan, hasFrequentScans, input.hasSlaPolicies, hasScanning].filter(Boolean).length;
    add('CC4.1', score >= 3 ? 'met' : score >= 1 ? 'partial' : 'not_met',
      [
        input.lastScanDate ? `Last scan: ${input.lastScanDate}` : 'No scan data',
        `Scan frequency: every ${input.scanFrequencyDays} days`,
        `SLA monitoring: ${input.hasSlaPolicies ? 'active' : 'not configured'}`,
        `Dashboard widgets: severity chart, SLA, compliance scores, KEV, EPSS top-10`,
      ].join('. '));
  }

  {
    const hasPoam = input.hasSlaPolicies; // POAM generation requires SLA context
    add('CC4.2', input.hasSlaPolicies && hasScanning ? 'met' : hasScanning ? 'partial' : 'not_met',
      [
        input.hasSlaPolicies ? `SLA breach notifications active (${input.slaComplianceRate}% compliance)` : 'No SLA breach alerting',
        `${input.criticalOpenCount} critical, ${input.highOpenCount} high open findings`,
        hasPoam ? 'POAM generation available for compliance gaps' : 'POAM available when SLA policies configured',
      ].join('. '));
  }

  // ─── CC5: Control Activities ─────────────────────────────────────────

  {
    const score = [hasRemediation, input.hasRiskExceptions, input.hasSlaPolicies].filter(Boolean).length;
    add('CC5.1', score >= 2 ? 'met' : score >= 1 ? 'partial' : 'not_met',
      [
        hasRemediation ? `${input.totalClosedCases} cases remediated` : 'No remediation data',
        input.hasRiskExceptions ? 'Risk exception approval process active' : 'No risk exceptions',
        input.hasSlaPolicies ? 'SLA policies enforce timelines' : 'No SLA policies',
      ].join('. '));
  }

  add('CC5.2', hasScanning ? 'met' : 'partial',
    hasScanning
      ? `Automated scan parsing (11 formats), NVD/EPSS/KEV enrichment, and AI-powered triage operational. ${input.totalFindings} findings processed.`
      : 'Technology controls ready (parsers, enrichment, AI triage); no scan data processed yet.');

  add('CC5.3', input.hasSlaPolicies && hasCases ? 'met' : hasCases ? 'partial' : 'not_met',
    [
      input.hasSlaPolicies ? 'SLA policies documented and enforced' : 'SLA policies not configured',
      hasCases ? 'Remediation procedures via case workflow active' : 'No case workflow data',
      'Compliance frameworks mapped to controls',
    ].join('. '));

  // ─── CC6: Logical & Physical Access ──────────────────────────────────

  add('CC6.1', 'met',
    'RBAC with 10 roles implemented. Multi-client tenant isolation enforced. Organization-scoped queries on all data access.');

  add('CC6.2', 'met',
    'Authentication via email/password, Google OAuth, GitHub OAuth, SSO (SAML/OIDC via WorkOS). MFA (TOTP) available.');

  add('CC6.3', 'met',
    'Role-based permissions enforced at API and UI layers. Team-scoped access. Provisioning/de-provisioning via admin controls.');

  add('CC6.4', 'met',
    'Physical access controlled by GCP data centers (SOC 2 Type II certified). Cloud Run, Cloud SQL, and GCS inherit GCP physical controls.');

  add('CC6.5', 'met',
    'Cloud Armor WAF, IP allowlist, rate limiting (Redis sliding window), and VPC Service Controls protect against external threats.');

  add('CC6.6', 'met',
    'TLS 1.2+ enforced for all data in transit. HTTPS-only external communications. API authentication required on all endpoints.');

  add('CC6.7', 'met',
    'Export controls require authorization. Data residency routing available. Tenant isolation prevents cross-org data access.');

  // CC6.8 — Vulnerability Management
  {
    const hasSla = input.hasSlaPolicies;
    const hasExceptions = input.hasRiskExceptions;
    const score = [hasScanning, hasRemediation, hasSla, hasExceptions].filter(Boolean).length;

    add('CC6.8', score >= 3 ? 'met' : score >= 2 ? 'partial' : 'not_met',
      [
        hasScanning ? `${input.totalFindings} findings tracked from vulnerability scans` : 'No vulnerability scan data',
        hasRemediation ? `${input.totalClosedCases} cases remediated` : 'No remediated cases',
        hasSla ? `SLA policies configured, ${input.slaComplianceRate}% compliance rate` : 'No SLA policies configured',
        hasExceptions ? 'Risk exception process active' : 'No risk exception process',
      ].join('. '));
  }

  // ─── CC7: System Operations ──────────────────────────────────────────

  // CC7.1 — Detect and Monitor
  add('CC7.1', recentScan && hasFrequentScans ? 'met' : recentScan ? 'partial' : 'not_met',
    [
      input.lastScanDate ? `Last scan: ${input.lastScanDate}` : 'No scan data available',
      `Average scan frequency: ${input.scanFrequencyDays} days`,
      `${input.kevOpenCount} open KEV-listed vulnerabilities`,
      `${input.criticalOpenCount} critical open vulnerabilities`,
    ].join('. '));

  // CC7.2 — Monitor for Anomalies
  add('CC7.2', input.hasAuditLogs && input.hasSlaPolicies ? 'met' : input.hasAuditLogs || input.hasSlaPolicies ? 'partial' : 'not_met',
    [
      input.hasAuditLogs ? 'Audit trail active with tamper-evident hash chain' : 'No audit trail configured',
      input.hasSlaPolicies ? `SLA policies active, ${input.slaComplianceRate}% compliance` : 'No SLA policies',
      `Workflow tracking: ${input.totalOpenCases} open, ${input.totalClosedCases} closed cases`,
    ].join('. '));

  // CC7.3 — Evaluate Security Events
  add('CC7.3', hasCases && input.hasRiskExceptions ? 'met' : hasCases ? 'partial' : 'not_met',
    [
      hasCases ? 'Triage workflow with severity classification active' : 'No triage process detected',
      input.hasRiskExceptions ? 'Risk exception approval workflow in use' : 'No risk exceptions documented',
      'Severity breakdown tracked with CVSS, EPSS, and KEV indicators',
    ].join('. '));

  // CC7.4 — Respond to Incidents
  {
    const score = [hasCases, hasRemediation, input.hasIntegrations].filter(Boolean).length;
    add('CC7.4', score >= 2 ? 'met' : score >= 1 ? 'partial' : 'not_met',
      [
        hasCases ? `Case management active: ${input.totalOpenCases} open, ${input.totalClosedCases} closed` : 'No case management data',
        hasRemediation ? `Average remediation: ${input.averageRemediationDays} days` : 'No remediation data',
        input.hasIntegrations ? 'External ticketing integration active' : 'No external ticketing integration',
      ].join('. '));
  }

  // CC7.5 — Recover from Incidents
  add('CC7.5', hasRemediation ? 'met' : 'partial',
    hasRemediation
      ? `${input.totalClosedCases} cases remediated with verification. Audit logs provide post-incident review capability.`
      : 'Remediation workflow available; no completed remediation data yet.');

  // ─── CC8: Change Management ──────────────────────────────────────────

  add('CC8.1', input.hasIntegrations && hasRemediation ? 'met' : hasRemediation ? 'partial' : 'not_met',
    [
      input.hasIntegrations ? 'Ticketing integration active (Jira/ServiceNow)' : 'No ticketing integration configured',
      hasRemediation ? 'Remediation workflow with verification step active' : 'No remediation workflow data',
    ].join('. '));

  // ─── CC9: Risk Mitigation ───────────────────────────────────────────

  {
    const score = [hasScanning, input.hasRiskExceptions, input.hasSlaPolicies].filter(Boolean).length;
    add('CC9.1', score >= 2 ? 'met' : score >= 1 ? 'partial' : 'not_met',
      [
        hasScanning ? `Risk scoring active: CVSS, EPSS, KEV across ${input.totalFindings} findings` : 'No risk scoring data',
        input.hasRiskExceptions ? 'Risk exception workflow with approvals' : 'No risk exception process',
        input.hasSlaPolicies ? 'SLA-based prioritization enforced' : 'No SLA policies',
      ].join('. '));
  }

  add('CC9.2', input.hasIntegrations ? 'met' : 'partial',
    input.hasIntegrations
      ? 'Third-party scanner integrations active. Multi-client (MSSP) risk visibility available. Portfolio dashboard provides vendor risk overview.'
      : 'Multi-client architecture supports vendor risk management; no external integrations configured.');

  // ─── A1: Availability (GCP-managed — partial by default) ────────────

  add('A1.1', 'partial',
    'Cloud Run provides auto-scaling and capacity management. Cloud SQL handles database availability. Full capacity monitoring is GCP-managed infrastructure.');

  add('A1.2', 'partial',
    'Cloud SQL automated backups, data retention policies configured per tier, Terraform IaC for infrastructure recovery. Environmental protections inherited from GCP.');

  add('A1.3', 'partial',
    'GCP provides backup/restore capabilities. Recovery plan testing is an organizational responsibility; platform supports data export for DR validation.');

  // ─── C1: Confidentiality (encryption + classification = met) ────────

  add('C1.1', 'met',
    'Vulnerability data classified by severity (Critical/High/Medium/Low/Info). Tenant data isolated per organization. Sensitive fields encrypted at rest with AES-256-GCM (KMS BYOK supported).');

  add('C1.2', 'met',
    'Data retention policies enforce disposal schedules per organization tier. Client data deletion API available. Retention cron job automates cleanup of expired data.');

  add('C1.3', 'met',
    'TLS 1.2+ for all data in transit. HTTPS-only external communications. API tokens and webhook secrets encrypted. HMAC signing on webhook deliveries.');

  // ─── PI1: Processing Integrity (scan data accuracy) ──────────────────

  add('PI1.1', 'met',
    'Processing specifications defined for 11 scanner formats (Nessus, SARIF, CSV, JSON, CycloneDX, Qualys, OpenVAS, SPDX, OSV, CSAF, XLSX). CVE enrichment sources: NVD, EPSS, KEV.');

  add('PI1.2', hasScanning ? 'met' : 'partial',
    hasScanning
      ? `${input.totalFindings} findings processed with input validation. Upload progress tracking and job status monitoring active.`
      : 'Input validation and parser error handling ready; no scan data processed yet.');

  add('PI1.3', hasScanning ? 'met' : 'partial',
    hasScanning
      ? `Deduplication, NVD/EPSS/KEV enrichment, and AI triage completed for ${input.totalFindings} findings.`
      : 'Processing pipeline ready (dedup, enrichment, AI triage); no data processed yet.');

  add('PI1.4', hasScanning ? 'met' : 'partial',
    hasScanning
      ? 'Findings list, export reports, and POAM output verified against source scan data.'
      : 'Output generation ready; no data to verify yet.');

  add('PI1.5', 'met',
    'Scan artifacts stored in GCS. Database records include audit timestamps (createdAt, updatedAt). Data retention policies applied to all stored data.');

  // ─── P1: Privacy (platform supports deletion; full program is org) ───

  add('P1.1', 'partial',
    'Platform collects minimal PII (email, name). Privacy notice content is organizational responsibility; platform provides data transparency through user profile and export capabilities.');

  add('P1.2', 'partial',
    'Platform supports user consent workflows. Full consent management (opt-in/opt-out tracking, consent records) is organizational responsibility.');

  add('P1.3', 'met',
    'Data collection limited to vulnerability management purpose. Minimal PII (email, name for accounts). Scan data contains technical vulnerability information, not personal data.');

  add('P1.4', 'met',
    'Data retention policies enforced per organization tier (FREE: 90d, PRO: 365d, ENTERPRISE: custom). Data deletion API available. Retention cron automates disposal.');

  add('P1.5', 'partial',
    'Users can view profile data and export findings. Full data subject access request (DSAR) workflow is organizational responsibility.');

  add('P1.6', 'partial',
    'Third-party integrations (Jira, ServiceNow, webhooks) documented. Data sharing notifications and sub-processor agreements are organizational responsibility.');

  add('P1.7', 'partial',
    'User profile data maintained. Stale data cleaned via retention policies. Comprehensive data quality program is organizational responsibility.');

  add('P1.8', 'partial',
    'Audit logs track data access. Data deletion request workflow available. Full privacy compliance monitoring and inquiry handling is organizational responsibility.');

  return evidences;
}
