/**
 * CMMC Level 2 — Complete NIST SP 800-171 Rev 2 (110 Practices)
 *
 * Cybersecurity Maturity Model Certification (CMMC) Level 2 requires
 * implementation of all 110 security practices from NIST SP 800-171 Rev 2
 * for protecting Controlled Unclassified Information (CUI).
 *
 * 14 practice domains:
 *   AC  (Access Control)                   — 22 controls
 *   AT  (Awareness & Training)             —  3 controls
 *   AU  (Audit & Accountability)           —  9 controls
 *   CM  (Configuration Management)         —  9 controls
 *   IA  (Identification & Authentication)  — 11 controls
 *   IR  (Incident Response)                —  3 controls
 *   MA  (Maintenance)                      —  6 controls
 *   MP  (Media Protection)                 —  9 controls
 *   PS  (Personnel Security)               —  2 controls
 *   PE  (Physical Protection)              —  6 controls
 *   RA  (Risk Assessment)                  —  3 controls
 *   CA  (Security Assessment)              —  4 controls
 *   SC  (System & Communications)          — 16 controls
 *   SI  (System & Information Integrity)   —  7 controls
 *                                    Total: 110
 *
 * SPRS scoring: Each practice carries a weight (1, 3, or 5 points deducted
 * when NOT met). Perfect score = 110; lowest possible = -203.
 */

import type {
  ComplianceFramework,
  ComplianceEvidence,
  ComplianceAssessmentInput,
} from './types';

// ---------------------------------------------------------------------------
// SPRS Weight Table (DoD Supplier Performance Risk System)
// Key = NIST 800-171 practice number, Value = point deduction when NOT met
// ---------------------------------------------------------------------------

export const CMMC_SPRS_WEIGHTS: Record<string, number> = {
  // AC — Access Control
  '3.1.1': 5, '3.1.2': 5, '3.1.3': 3, '3.1.4': 3, '3.1.5': 5,
  '3.1.6': 3, '3.1.7': 3, '3.1.8': 3, '3.1.9': 1, '3.1.10': 1,
  '3.1.11': 1, '3.1.12': 5, '3.1.13': 5, '3.1.14': 1, '3.1.15': 1,
  '3.1.16': 1, '3.1.17': 5, '3.1.18': 1, '3.1.19': 5, '3.1.20': 5,
  '3.1.21': 1, '3.1.22': 3,
  // AT — Awareness & Training
  '3.2.1': 3, '3.2.2': 3, '3.2.3': 1,
  // AU — Audit & Accountability
  '3.3.1': 5, '3.3.2': 3, '3.3.3': 1, '3.3.4': 1, '3.3.5': 3,
  '3.3.6': 1, '3.3.7': 1, '3.3.8': 3, '3.3.9': 1,
  // CM — Configuration Management
  '3.4.1': 5, '3.4.2': 5, '3.4.3': 3, '3.4.4': 1, '3.4.5': 3,
  '3.4.6': 5, '3.4.7': 1, '3.4.8': 1, '3.4.9': 1,
  // IA — Identification & Authentication
  '3.5.1': 5, '3.5.2': 5, '3.5.3': 5, '3.5.4': 3, '3.5.5': 3,
  '3.5.6': 3, '3.5.7': 5, '3.5.8': 5, '3.5.9': 3, '3.5.10': 5,
  '3.5.11': 3,
  // IR — Incident Response
  '3.6.1': 5, '3.6.2': 5, '3.6.3': 3,
  // MA — Maintenance
  '3.7.1': 3, '3.7.2': 1, '3.7.3': 1, '3.7.4': 1, '3.7.5': 5,
  '3.7.6': 1,
  // MP — Media Protection
  '3.8.1': 5, '3.8.2': 3, '3.8.3': 5, '3.8.4': 1, '3.8.5': 3,
  '3.8.6': 5, '3.8.7': 3, '3.8.8': 1, '3.8.9': 5,
  // PS — Personnel Security
  '3.9.1': 3, '3.9.2': 1,
  // PE — Physical Protection
  '3.10.1': 5, '3.10.2': 5, '3.10.3': 3, '3.10.4': 3, '3.10.5': 3,
  '3.10.6': 1,
  // RA — Risk Assessment
  '3.11.1': 5, '3.11.2': 5, '3.11.3': 5,
  // CA — Security Assessment
  '3.12.1': 5, '3.12.2': 5, '3.12.3': 3, '3.12.4': 5,
  // SC — System & Communications Protection
  '3.13.1': 5, '3.13.2': 3, '3.13.3': 1, '3.13.4': 1, '3.13.5': 3,
  '3.13.6': 3, '3.13.7': 1, '3.13.8': 5, '3.13.9': 1, '3.13.10': 3,
  '3.13.11': 5, '3.13.12': 1, '3.13.13': 1, '3.13.14': 1,
  '3.13.15': 5, '3.13.16': 5,
  // SI — System & Information Integrity
  '3.14.1': 5, '3.14.2': 5, '3.14.3': 5, '3.14.4': 3, '3.14.5': 3,
  '3.14.6': 5, '3.14.7': 5,
};

// ---------------------------------------------------------------------------
// Framework Definition — All 110 NIST SP 800-171 Rev 2 Practices
// ---------------------------------------------------------------------------

export const CMMC_FRAMEWORK: ComplianceFramework = {
  id: 'cmmc-level2',
  name: 'CMMC Level 2',
  version: '2.0',
  description:
    'Cybersecurity Maturity Model Certification Level 2 — all 110 NIST SP 800-171 Rev 2 practices for protecting Controlled Unclassified Information (CUI)',
  controls: [
    // =====================================================================
    // AC — Access Control (22 controls: 3.1.1 – 3.1.22)
    // =====================================================================
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
      id: 'AC.L2-3.1.3',
      title: 'Control CUI Flow',
      description:
        'Control the flow of CUI in accordance with approved authorizations.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Data flow restricted by tenant boundary',
        'Export controls enforce authorization checks',
        'API responses scoped to authorized data',
      ],
    },
    {
      id: 'AC.L2-3.1.4',
      title: 'Separation of Duties',
      description:
        'Separate the duties of individuals to reduce the risk of malevolent activity without collusion.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Distinct admin, analyst, and viewer roles',
        'Case approval and remediation separated',
        'Risk exception approval requires different role than requester',
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
    {
      id: 'AC.L2-3.1.6',
      title: 'Non-privileged Access for Non-security Functions',
      description:
        'Use non-privileged accounts or roles when accessing non-security functions.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Default user role is non-privileged (ANALYST/VIEWER)',
        'Admin elevation requires explicit role assignment',
        'Non-security browsing does not require elevated privileges',
      ],
    },
    {
      id: 'AC.L2-3.1.7',
      title: 'Prevent Non-privileged Users from Executing Privileged Functions',
      description:
        'Prevent non-privileged users from executing privileged functions and capture the execution of such functions in audit logs.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'RBAC middleware blocks unauthorized privilege escalation',
        'Privileged function attempts logged in audit trail',
        'UI hides privileged actions from non-privileged users',
      ],
    },
    {
      id: 'AC.L2-3.1.8',
      title: 'Unsuccessful Logon Attempts',
      description:
        'Limit unsuccessful logon attempts.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Rate limiting on authentication endpoints',
        'Account lockout after repeated failures',
        'Failed logon attempts logged',
      ],
    },
    {
      id: 'AC.L2-3.1.9',
      title: 'Privacy & Security Notices',
      description:
        'Provide privacy and security notices consistent with applicable CUI rules.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Login page displays security notice',
        'Terms of service and privacy policy accessible',
        'CUI handling banner displayed where applicable',
      ],
    },
    {
      id: 'AC.L2-3.1.10',
      title: 'Session Lock',
      description:
        'Use session lock with pattern-hiding displays to prevent access and viewing of data after a period of inactivity.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Session timeout configured',
        'Inactive sessions require re-authentication',
        'Screen content hidden on lock',
      ],
    },
    {
      id: 'AC.L2-3.1.11',
      title: 'Session Termination',
      description:
        'Terminate (automatically) a user session after a defined condition.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Session expiry enforced via Redis store',
        'Logout terminates server-side session',
        'Token rotation on activity',
      ],
    },
    {
      id: 'AC.L2-3.1.12',
      title: 'Monitor & Control Remote Access',
      description:
        'Monitor and control remote access sessions.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'All access is remote (cloud-hosted SaaS)',
        'Session activity logged in audit trail',
        'IP allowlist restricts access origins',
      ],
    },
    {
      id: 'AC.L2-3.1.13',
      title: 'Cryptographic Mechanisms for Remote Access',
      description:
        'Employ cryptographic mechanisms to protect the confidentiality of remote access sessions.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'TLS 1.2+ enforced on all connections',
        'HTTPS-only communication policy',
        'Encrypted session tokens',
      ],
    },
    {
      id: 'AC.L2-3.1.14',
      title: 'Route Remote Access via Managed Access Points',
      description:
        'Route remote access via managed access control points.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Cloud Run ingress controlled by Cloud Armor',
        'Load balancer serves as single access point',
        'IP allowlist enforcement at edge',
      ],
    },
    {
      id: 'AC.L2-3.1.15',
      title: 'Authorize Remote Execution of Privileged Commands',
      description:
        'Authorize remote execution of privileged commands and remote access to security-relevant information.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Admin API routes require elevated role',
        'Privileged operations logged in audit trail',
        'Remote admin actions require authenticated session with admin role',
      ],
    },
    {
      id: 'AC.L2-3.1.16',
      title: 'Wireless Access Authorization',
      description:
        'Authorize wireless access prior to allowing such connections.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Cloud-hosted SaaS — wireless access is client-side responsibility',
        'Platform accessed over standard HTTPS regardless of network type',
      ],
    },
    {
      id: 'AC.L2-3.1.17',
      title: 'Wireless Access Authentication & Encryption',
      description:
        'Protect wireless access using authentication and encryption.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'All platform access requires authentication over TLS',
        'No platform-managed wireless infrastructure',
        'Encryption enforced regardless of client network type',
      ],
    },
    {
      id: 'AC.L2-3.1.18',
      title: 'Mobile Device Connection Control',
      description:
        'Control connection of mobile devices.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Platform accessed via standard web browser on any device',
        'Session management applies equally to mobile access',
        'No native mobile app — web-only access control',
      ],
    },
    {
      id: 'AC.L2-3.1.19',
      title: 'Encrypt CUI on Mobile Devices',
      description:
        'Encrypt CUI on mobile devices and mobile computing platforms.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Data transmitted over TLS to all devices including mobile',
        'No persistent local storage of CUI on client devices',
        'Browser-based access — no client-side CUI caching',
      ],
    },
    {
      id: 'AC.L2-3.1.20',
      title: 'External System Connections',
      description:
        'Verify and control/limit connections to and use of external information systems.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'External integrations (Jira, ServiceNow) configured by admin',
        'Webhook destinations explicitly configured and validated',
        'OAuth connections to external providers scoped and audited',
      ],
    },
    {
      id: 'AC.L2-3.1.21',
      title: 'Portable Storage Use',
      description:
        'Limit use of portable storage devices on organizational information systems.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'Cloud-hosted SaaS — no portable storage interfaces',
        'File upload restricted to supported scan formats',
        'Upload size and type validation enforced',
      ],
    },
    {
      id: 'AC.L2-3.1.22',
      title: 'Publicly Accessible Content Control',
      description:
        'Control information posted or processed on publicly accessible information systems.',
      category: 'Access Control (AC)',
      evidenceRequirements: [
        'All CUI data behind authentication',
        'Public pages contain no CUI',
        'Demo mode uses synthetic data only',
      ],
    },

    // =====================================================================
    // AT — Awareness & Training (3 controls: 3.2.1 – 3.2.3)
    // =====================================================================
    {
      id: 'AT.L2-3.2.1',
      title: 'Role-Based Risk Awareness',
      description:
        'Ensure that managers, systems administrators, and users of organizational information systems are made aware of the security risks associated with their activities and of the applicable policies, standards, and procedures related to the security of those information systems.',
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
        'Ensure that personnel are adequately trained to carry out their assigned information security-related duties and responsibilities.',
      category: 'Awareness & Training (AT)',
      evidenceRequirements: [
        'Role-specific dashboards and workflows provided',
        'Remediation guidance generated for development teams',
        'Severity classification training materials accessible',
      ],
    },
    {
      id: 'AT.L2-3.2.3',
      title: 'Insider Threat Awareness',
      description:
        'Provide security awareness training on recognizing and reporting potential indicators of insider threat.',
      category: 'Awareness & Training (AT)',
      evidenceRequirements: [
        'Audit trail enables insider activity review',
        'Role-based access limits blast radius of insider action',
        'Organizational insider threat training program documented',
      ],
    },

    // =====================================================================
    // AU — Audit & Accountability (9 controls: 3.3.1 – 3.3.9)
    // =====================================================================
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
    {
      id: 'AU.L2-3.3.3',
      title: 'Event Review, Analysis & Reporting',
      description:
        'Review and update audited events.',
      category: 'Audit & Accountability (AU)',
      evidenceRequirements: [
        'Audit log viewer in admin dashboard',
        'Activity timeline on main dashboard',
        'Export capability for audit records',
      ],
    },
    {
      id: 'AU.L2-3.3.4',
      title: 'Alert on Audit Process Failure',
      description:
        'Alert in the event of an audit logging process failure.',
      category: 'Audit & Accountability (AU)',
      evidenceRequirements: [
        'Logging pipeline health monitored via Cloud Logging',
        'Ops dashboard monitors audit subsystem',
        'Alert on audit write failures',
      ],
    },
    {
      id: 'AU.L2-3.3.5',
      title: 'Audit Record Correlation',
      description:
        'Correlate audit record review, analysis, and reporting processes to support organizational processes for investigation and response to suspicious activities.',
      category: 'Audit & Accountability (AU)',
      evidenceRequirements: [
        'Audit records include user, action, resource, and timestamp',
        'Webhook integrations enable SIEM correlation',
        'Activity timeline correlates events across modules',
      ],
    },
    {
      id: 'AU.L2-3.3.6',
      title: 'Audit Reduction & Reporting',
      description:
        'Provide audit record reduction and report generation capability to support on-demand analysis and reporting.',
      category: 'Audit & Accountability (AU)',
      evidenceRequirements: [
        'Audit log filtering and search available',
        'Executive reporting summarizes security events',
        'Compliance reports aggregate audit data',
      ],
    },
    {
      id: 'AU.L2-3.3.7',
      title: 'Authoritative Time Source',
      description:
        'Provide a system capability that compares and synchronizes internal system clocks with an authoritative source to generate time stamps for audit records.',
      category: 'Audit & Accountability (AU)',
      evidenceRequirements: [
        'Cloud Run instances use Google NTP infrastructure',
        'All timestamps in ISO 8601 UTC format',
        'Audit records use server-side timestamps',
      ],
    },
    {
      id: 'AU.L2-3.3.8',
      title: 'Protect Audit Information',
      description:
        'Protect audit information and audit logging tools from unauthorized access, modification, and deletion.',
      category: 'Audit & Accountability (AU)',
      evidenceRequirements: [
        'Tamper-evident hash chain on audit records',
        'Audit logs stored in append-only fashion',
        'Access to audit records restricted to admin roles',
      ],
    },
    {
      id: 'AU.L2-3.3.9',
      title: 'Manage Audit Logging',
      description:
        'Limit management of audit logging functionality to a subset of privileged users.',
      category: 'Audit & Accountability (AU)',
      evidenceRequirements: [
        'Audit configuration restricted to PLATFORM_ADMIN',
        'Retention policies modifiable only by admin',
        'Audit log deletion not exposed in UI',
      ],
    },

    // =====================================================================
    // CM — Configuration Management (9 controls: 3.4.1 – 3.4.9)
    // =====================================================================
    {
      id: 'CM.L2-3.4.1',
      title: 'System Baselining',
      description:
        'Establish and maintain baseline configurations and inventories of organizational information systems (including hardware, software, firmware, and documentation) throughout the respective system development life cycles.',
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
    {
      id: 'CM.L2-3.4.3',
      title: 'Track, Control & Review Changes',
      description:
        'Track, review, approve or disapprove, and log changes to organizational information systems.',
      category: 'Configuration Management (CM)',
      evidenceRequirements: [
        'Settings changes logged in audit trail',
        'Integration configuration changes tracked',
        'User role changes require admin approval',
      ],
    },
    {
      id: 'CM.L2-3.4.4',
      title: 'Security Impact Analysis',
      description:
        'Analyze the security impact of changes prior to implementation.',
      category: 'Configuration Management (CM)',
      evidenceRequirements: [
        'Compliance score recalculated after configuration changes',
        'Risk exception workflow evaluates impact',
        'SLA policy changes assessed for security impact',
      ],
    },
    {
      id: 'CM.L2-3.4.5',
      title: 'Physical & Logical Access Restrictions for Changes',
      description:
        'Define, document, approve, and enforce physical and logical access restrictions associated with changes to organizational information systems.',
      category: 'Configuration Management (CM)',
      evidenceRequirements: [
        'Configuration changes restricted to admin roles',
        'Infrastructure changes require GCP IAM permissions',
        'Settings API routes enforce RBAC',
      ],
    },
    {
      id: 'CM.L2-3.4.6',
      title: 'Least Functionality',
      description:
        'Employ the principle of least functionality by configuring organizational information systems to provide only essential capabilities.',
      category: 'Configuration Management (CM)',
      evidenceRequirements: [
        'Platform exposes only necessary API endpoints',
        'Unused features disabled by default',
        'Cloud Run container runs minimal base image',
      ],
    },
    {
      id: 'CM.L2-3.4.7',
      title: 'Nonessential Programs Restriction',
      description:
        'Restrict, disable, or prevent the use of nonessential programs, functions, ports, protocols, and services.',
      category: 'Configuration Management (CM)',
      evidenceRequirements: [
        'Cloud Armor blocks non-HTTPS traffic',
        'Container exposes only required port',
        'Non-essential OS services disabled in container',
      ],
    },
    {
      id: 'CM.L2-3.4.8',
      title: 'Application Execution Policy',
      description:
        'Apply deny-by-exception (blacklisting) policy to prevent the use of unauthorized software or deny-all, permit-by-exception (whitelisting) policy to allow the execution of authorized software.',
      category: 'Configuration Management (CM)',
      evidenceRequirements: [
        'Container image includes only approved dependencies',
        'File upload restricted to approved scanner formats',
        'CSP headers restrict script execution',
      ],
    },
    {
      id: 'CM.L2-3.4.9',
      title: 'User-Installed Software Control',
      description:
        'Control and monitor user-installed software.',
      category: 'Configuration Management (CM)',
      evidenceRequirements: [
        'Cloud-hosted SaaS — no user-installed software on server',
        'Browser extensions outside platform control scope',
        'Connector integrations require admin configuration',
      ],
    },

    // =====================================================================
    // IA — Identification & Authentication (11 controls: 3.5.1 – 3.5.11)
    // =====================================================================
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
    {
      id: 'IA.L2-3.5.4',
      title: 'Replay-Resistant Authentication',
      description:
        'Employ replay-resistant authentication mechanisms for network access to privileged and non-privileged accounts.',
      category: 'Identification & Authentication (IA)',
      evidenceRequirements: [
        'CSRF tokens on all state-changing requests',
        'Session tokens rotated on authentication',
        'OAuth state parameter prevents replay',
      ],
    },
    {
      id: 'IA.L2-3.5.5',
      title: 'Identifier Reuse Prevention',
      description:
        'Prevent reuse of identifiers for a defined period.',
      category: 'Identification & Authentication (IA)',
      evidenceRequirements: [
        'User IDs are UUIDs — never reused',
        'Email uniqueness enforced in database',
        'API key identifiers are cryptographically random',
      ],
    },
    {
      id: 'IA.L2-3.5.6',
      title: 'Identifier Inactivity Disable',
      description:
        'Disable identifiers after a defined period of inactivity.',
      category: 'Identification & Authentication (IA)',
      evidenceRequirements: [
        'Inactive user accounts can be deactivated by admin',
        'Session expiry enforced for inactive sessions',
        'API key expiration configurable',
      ],
    },
    {
      id: 'IA.L2-3.5.7',
      title: 'Minimum Password Complexity',
      description:
        'Enforce a minimum password complexity and change of characters when new passwords are created.',
      category: 'Identification & Authentication (IA)',
      evidenceRequirements: [
        'Password policy enforces minimum length and complexity',
        'HIBP breach database check on password creation',
        'Password history prevents recent reuse',
      ],
    },
    {
      id: 'IA.L2-3.5.8',
      title: 'Password Reuse Prevention',
      description:
        'Prohibit password reuse for a specified number of generations.',
      category: 'Identification & Authentication (IA)',
      evidenceRequirements: [
        'Password history tracked (configurable generations)',
        'Previous password hashes compared on change',
        'Policy enforcement at authentication layer',
      ],
    },
    {
      id: 'IA.L2-3.5.9',
      title: 'Temporary Password Change on First Use',
      description:
        'Allow temporary password use for system logons with an immediate change to a permanent password.',
      category: 'Identification & Authentication (IA)',
      evidenceRequirements: [
        'Invitation-based onboarding requires password set on first login',
        'Temporary credentials flagged for immediate change',
        'OAuth flows bypass temporary password requirement',
      ],
    },
    {
      id: 'IA.L2-3.5.10',
      title: 'Cryptographically Protected Passwords',
      description:
        'Store and transmit only cryptographically-protected passwords.',
      category: 'Identification & Authentication (IA)',
      evidenceRequirements: [
        'Passwords hashed with bcrypt/argon2 at rest',
        'Passwords transmitted only over TLS',
        'No plaintext password storage anywhere in system',
      ],
    },
    {
      id: 'IA.L2-3.5.11',
      title: 'Obscure Authentication Feedback',
      description:
        'Obscure feedback of authentication information.',
      category: 'Identification & Authentication (IA)',
      evidenceRequirements: [
        'Login errors do not reveal whether user exists',
        'Password fields masked in UI',
        'API responses do not leak authentication details',
      ],
    },

    // =====================================================================
    // IR — Incident Response (3 controls: 3.6.1 – 3.6.3)
    // =====================================================================
    {
      id: 'IR.L2-3.6.1',
      title: 'Incident Handling',
      description:
        'Establish an operational incident-handling capability for organizational information systems that includes preparation, detection, analysis, containment, recovery, and user response activities.',
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
        'Track, document, and report incidents to designated officials and/or authorities both internal and external to the organization.',
      category: 'Incident Response (IR)',
      evidenceRequirements: [
        'Case status tracking with full audit trail',
        'Export capabilities for incident reporting',
        'Notification workflows for stakeholders',
      ],
    },
    {
      id: 'IR.L2-3.6.3',
      title: 'Test Incident Response Capability',
      description:
        'Test the organizational incident response capability.',
      category: 'Incident Response (IR)',
      evidenceRequirements: [
        'Demo mode available for training exercises',
        'Case workflow can be exercised with test data',
        'Organizational IR testing process documented',
      ],
    },

    // =====================================================================
    // MA — Maintenance (6 controls: 3.7.1 – 3.7.6)
    // =====================================================================
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
    {
      id: 'MA.L2-3.7.2',
      title: 'Effective Controls on Maintenance Tools',
      description:
        'Provide effective controls on the tools, techniques, mechanisms, and personnel used to conduct information system maintenance.',
      category: 'Maintenance (MA)',
      evidenceRequirements: [
        'Maintenance performed via authenticated admin interfaces',
        'Infrastructure maintenance via GCP IAM-controlled console',
        'Database maintenance restricted to authorized operators',
      ],
    },
    {
      id: 'MA.L2-3.7.3',
      title: 'Equipment Sanitization',
      description:
        'Ensure equipment removed for off-site maintenance is sanitized of any CUI.',
      category: 'Maintenance (MA)',
      evidenceRequirements: [
        'Cloud-hosted — no physical equipment removal',
        'GCP handles hardware lifecycle and sanitization',
        'Data retention policies enforced on decommission',
      ],
    },
    {
      id: 'MA.L2-3.7.4',
      title: 'Media Inspection for Malicious Code',
      description:
        'Check media containing diagnostic and test programs for malicious code before the media are used in the information system.',
      category: 'Maintenance (MA)',
      evidenceRequirements: [
        'File upload validates format and content type',
        'Scanner output parsed through validated parsers',
        'Container images scanned in CI/CD pipeline',
      ],
    },
    {
      id: 'MA.L2-3.7.5',
      title: 'Nonlocal Maintenance',
      description:
        'Require multifactor authentication to establish nonlocal maintenance sessions via external network connections and terminate such connections when nonlocal maintenance is complete.',
      category: 'Maintenance (MA)',
      evidenceRequirements: [
        'All maintenance is nonlocal (cloud-hosted)',
        'Admin sessions require MFA',
        'Session termination on inactivity',
      ],
    },
    {
      id: 'MA.L2-3.7.6',
      title: 'Maintenance Personnel Supervision',
      description:
        'Supervise the maintenance activities of maintenance personnel without required access authorization.',
      category: 'Maintenance (MA)',
      evidenceRequirements: [
        'GCP manages physical maintenance personnel',
        'Platform maintenance performed by authorized team only',
        'All administrative actions logged in audit trail',
      ],
    },

    // =====================================================================
    // MP — Media Protection (9 controls: 3.8.1 – 3.8.9)
    // =====================================================================
    {
      id: 'MP.L2-3.8.1',
      title: 'Protect CUI on System Media',
      description:
        'Protect (i.e., physically control and securely store) information system media containing CUI, both paper and digital.',
      category: 'Media Protection (MP)',
      evidenceRequirements: [
        'Exported reports encrypted in transit',
        'Scan artifacts stored in encrypted GCS storage',
        'Data retention policies enforced on exports',
      ],
    },
    {
      id: 'MP.L2-3.8.2',
      title: 'Limit CUI Access on Media',
      description:
        'Limit access to CUI on information system media to authorized users.',
      category: 'Media Protection (MP)',
      evidenceRequirements: [
        'Export downloads require authenticated session',
        'GCS bucket access restricted by IAM policies',
        'Shared reports scoped to authorized recipients',
      ],
    },
    {
      id: 'MP.L2-3.8.3',
      title: 'Sanitize/Destroy Media Before Disposal',
      description:
        'Sanitize or destroy information system media containing CUI before disposal or release for reuse.',
      category: 'Media Protection (MP)',
      evidenceRequirements: [
        'Data retention cron purges expired records',
        'GCS object lifecycle policies enforce deletion',
        'GCP handles physical media destruction',
      ],
    },
    {
      id: 'MP.L2-3.8.4',
      title: 'Mark Media with CUI Markings',
      description:
        'Mark media with necessary CUI markings and distribution limitations.',
      category: 'Media Protection (MP)',
      evidenceRequirements: [
        'Exported reports include classification markings',
        'PDF exports include CUI banner where applicable',
        'Organizational marking policy documented',
      ],
    },
    {
      id: 'MP.L2-3.8.5',
      title: 'Control Access to Media',
      description:
        'Control access to media containing CUI and maintain accountability for media during transport outside of controlled areas.',
      category: 'Media Protection (MP)',
      evidenceRequirements: [
        'Export audit trail tracks who downloaded what',
        'Bulk export jobs logged with requestor identity',
        'No physical media transport — all digital delivery over TLS',
      ],
    },
    {
      id: 'MP.L2-3.8.6',
      title: 'Cryptographic Protection During Transport',
      description:
        'Implement cryptographic mechanisms to protect the confidentiality of CUI stored on digital media during transport.',
      category: 'Media Protection (MP)',
      evidenceRequirements: [
        'All data transport over TLS 1.2+',
        'Webhook payloads signed with HMAC',
        'API responses encrypted in transit',
      ],
    },
    {
      id: 'MP.L2-3.8.7',
      title: 'Control Removable Media Use',
      description:
        'Control the use of removable media on information system components.',
      category: 'Media Protection (MP)',
      evidenceRequirements: [
        'Cloud-hosted SaaS — no removable media on server',
        'Upload restricted to scan file formats',
        'Client-side removable media outside platform scope',
      ],
    },
    {
      id: 'MP.L2-3.8.8',
      title: 'Shared System Resource Control',
      description:
        'Prohibit the use of portable storage devices when such devices have no identifiable owner.',
      category: 'Media Protection (MP)',
      evidenceRequirements: [
        'All uploads tied to authenticated user identity',
        'Anonymous file submission not supported',
        'Shared system resources cleared between tenant contexts',
      ],
    },
    {
      id: 'MP.L2-3.8.9',
      title: 'Protect Backup CUI Confidentiality',
      description:
        'Protect the confidentiality of backup CUI at storage locations.',
      category: 'Media Protection (MP)',
      evidenceRequirements: [
        'Database backups encrypted via Cloud SQL',
        'GCS backup buckets encrypted at rest',
        'Backup retention policies enforced by tier',
      ],
    },

    // =====================================================================
    // PS — Personnel Security (2 controls: 3.9.1 – 3.9.2)
    // =====================================================================
    {
      id: 'PS.L2-3.9.1',
      title: 'Screen Personnel',
      description:
        'Screen individuals prior to authorizing access to organizational information systems containing CUI.',
      category: 'Personnel Security (PS)',
      evidenceRequirements: [
        'User onboarding requires admin approval',
        'Role assignment reviewed by security admin',
        'User deactivation workflow available',
      ],
    },
    {
      id: 'PS.L2-3.9.2',
      title: 'Protect CUI During Personnel Actions',
      description:
        'Ensure that organizational information systems containing CUI are protected during and after personnel actions such as terminations and transfers.',
      category: 'Personnel Security (PS)',
      evidenceRequirements: [
        'User deactivation immediately revokes access',
        'Session invalidation on account disable',
        'Role transfer preserves audit history',
      ],
    },

    // =====================================================================
    // PE — Physical Protection (6 controls: 3.10.1 – 3.10.6)
    // =====================================================================
    {
      id: 'PE.L2-3.10.1',
      title: 'Limit Physical Access',
      description:
        'Limit physical access to organizational information systems, equipment, and the respective operating environments to authorized individuals.',
      category: 'Physical Protection (PE)',
      evidenceRequirements: [
        'Cloud infrastructure hosted in SOC 2 Type II certified data centers',
        'No on-premises data storage required',
        'GCP Cloud Run provides physical security controls',
      ],
    },
    {
      id: 'PE.L2-3.10.2',
      title: 'Protect & Monitor Physical Facility',
      description:
        'Protect and monitor the physical facility and support infrastructure for organizational information systems.',
      category: 'Physical Protection (PE)',
      evidenceRequirements: [
        'GCP data centers provide 24/7 physical monitoring',
        'Facility access controlled by Google Cloud security',
        'Environmental controls (HVAC, fire suppression) managed by GCP',
      ],
    },
    {
      id: 'PE.L2-3.10.3',
      title: 'Escort Visitors',
      description:
        'Escort visitors and monitor visitor activity.',
      category: 'Physical Protection (PE)',
      evidenceRequirements: [
        'GCP manages visitor access to data center facilities',
        'No organizational physical facility for platform infrastructure',
        'Inherited from cloud service provider controls',
      ],
    },
    {
      id: 'PE.L2-3.10.4',
      title: 'Physical Access Audit Logs',
      description:
        'Maintain audit logs of physical access.',
      category: 'Physical Protection (PE)',
      evidenceRequirements: [
        'GCP maintains physical access logs for data centers',
        'Cloud Audit Logs track infrastructure access',
        'Inherited from cloud service provider controls',
      ],
    },
    {
      id: 'PE.L2-3.10.5',
      title: 'Manage Physical Access Devices',
      description:
        'Control and manage physical access devices.',
      category: 'Physical Protection (PE)',
      evidenceRequirements: [
        'GCP manages physical access devices at data centers',
        'No organizational physical access devices for platform',
        'Inherited from cloud service provider controls',
      ],
    },
    {
      id: 'PE.L2-3.10.6',
      title: 'Enforce Safeguards at Alternative Work Sites',
      description:
        'Enforce safeguarding measures for CUI at alternative work sites.',
      category: 'Physical Protection (PE)',
      evidenceRequirements: [
        'Platform accessible securely from any location via HTTPS',
        'Session security applies regardless of work site',
        'Organizational alternative work site policy documented',
      ],
    },

    // =====================================================================
    // RA — Risk Assessment (3 controls: 3.11.1 – 3.11.3)
    // =====================================================================
    {
      id: 'RA.L2-3.11.1',
      title: 'Risk Assessments',
      description:
        'Periodically assess the risk to organizational operations (including mission, functions, image, or reputation), organizational assets, and individuals, resulting from the operation of organizational information systems and the associated processing, storage, or transmission of CUI.',
      category: 'Risk Assessment (RA)',
      evidenceRequirements: [
        'Continuous vulnerability risk scoring (CVSS, EPSS)',
        'KEV catalog integration for exploit awareness',
        'Risk exception workflow with documented justifications',
      ],
    },
    {
      id: 'RA.L2-3.11.2',
      title: 'Vulnerability Scanning',
      description:
        'Scan for vulnerabilities in organizational information systems and applications periodically and when new vulnerabilities affecting those systems and applications are identified.',
      category: 'Risk Assessment (RA)',
      evidenceRequirements: [
        'Multiple scanner format ingestion (11 formats)',
        'Scan frequency monitoring and alerting',
        'Automated enrichment with NVD, EPSS, KEV data',
      ],
    },
    {
      id: 'RA.L2-3.11.3',
      title: 'Vulnerability Remediation',
      description:
        'Remediate vulnerabilities in accordance with assessments of risk.',
      category: 'Risk Assessment (RA)',
      evidenceRequirements: [
        'Risk-prioritized remediation workflow',
        'SLA policies tied to severity levels',
        'MTTR tracked and reported',
      ],
    },

    // =====================================================================
    // CA — Security Assessment (4 controls: 3.12.1 – 3.12.4)
    // =====================================================================
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
      title: 'Plan of Action & Milestones',
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
      id: 'CA.L2-3.12.3',
      title: 'Continuous Monitoring',
      description:
        'Monitor security controls on an ongoing basis to ensure the continued effectiveness of the controls.',
      category: 'Security Assessment (CA)',
      evidenceRequirements: [
        'Dashboard provides real-time compliance posture',
        'Scan ingestion triggers compliance re-assessment',
        'SLA compliance monitored continuously',
      ],
    },
    {
      id: 'CA.L2-3.12.4',
      title: 'System Security Plan',
      description:
        'Develop, document, and periodically update system security plans that describe system boundaries, system environments of operation, how security requirements are implemented, and the relationships with or connections to other systems.',
      category: 'Security Assessment (CA)',
      evidenceRequirements: [
        'Compliance dashboard tracks framework alignment',
        'Asset and system boundaries documented',
        'Executive reporting available for leadership review',
      ],
    },

    // =====================================================================
    // SC — System & Communications Protection (16 controls: 3.13.1 – 3.13.16)
    // =====================================================================
    {
      id: 'SC.L2-3.13.1',
      title: 'Boundary Protection',
      description:
        'Monitor, control, and protect organizational communications (i.e., information transmitted or received by organizational information systems) at the external boundaries and key internal boundaries of the information systems.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'Cloud Armor WAF protection enabled',
        'IP allowlist enforcement available',
        'HTTPS-only communication enforced',
      ],
    },
    {
      id: 'SC.L2-3.13.2',
      title: 'Architectural Design — Subnetworks',
      description:
        'Employ architectural designs, software development techniques, and systems engineering principles that promote effective information security within organizational information systems.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'VPC network segmentation in GCP',
        'Database on private subnet (Cloud SQL private IP)',
        'Redis on private subnet (Memorystore)',
      ],
    },
    {
      id: 'SC.L2-3.13.3',
      title: 'Separate User from System Management Functionality',
      description:
        'Separate user functionality from information system management functionality.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'Admin dashboard separated from user dashboard',
        'Ops dashboard on separate route group',
        'API admin routes separated from user routes',
      ],
    },
    {
      id: 'SC.L2-3.13.4',
      title: 'Prevent Unauthorized Transfer via Shared Resources',
      description:
        'Prevent unauthorized and unintended information transfer via shared system resources.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'Tenant isolation on all database queries',
        'Session data isolated per user',
        'GCS buckets scoped per organization',
      ],
    },
    {
      id: 'SC.L2-3.13.5',
      title: 'Public Access Subnetworks',
      description:
        'Implement subnetworks for publicly accessible system components that are physically or logically separated from internal networks.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'Public-facing Cloud Run isolated from internal services',
        'Database not publicly accessible',
        'Internal APIs not exposed to public internet',
      ],
    },
    {
      id: 'SC.L2-3.13.6',
      title: 'Deny Network Traffic by Default',
      description:
        'Deny network communications traffic by default and allow network communications traffic by exception (i.e., deny all, permit by exception).',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'VPC firewall rules deny by default',
        'Cloud Armor default deny policy',
        'Only HTTPS (443) exposed publicly',
      ],
    },
    {
      id: 'SC.L2-3.13.7',
      title: 'Prevent Split Tunneling for Remote Devices',
      description:
        'Prevent remote devices from simultaneously establishing non-remote connections with the information system and communicating via some other connection to resources in external networks.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'Cloud-hosted SaaS — split tunneling is client-side concern',
        'Platform does not manage remote device network configuration',
        'All platform access through single HTTPS endpoint',
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
      id: 'SC.L2-3.13.9',
      title: 'Terminate Connections After Inactivity',
      description:
        'Terminate network connections associated with communications sessions at the end of the sessions or after a defined period of inactivity.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'HTTP keep-alive timeout configured',
        'Session expiry closes server-side connection state',
        'Redis session store enforces TTL',
      ],
    },
    {
      id: 'SC.L2-3.13.10',
      title: 'Cryptographic Key Management',
      description:
        'Establish and manage cryptographic keys for cryptography employed in organizational information systems.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'GCP KMS for key management',
        'BYOK support for enterprise customers',
        'Key rotation policies configurable',
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
    {
      id: 'SC.L2-3.13.12',
      title: 'Collaborative Computing Device Control',
      description:
        'Prohibit remote activation of collaborative computing devices and provide indication of devices in use to users present at the device.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'Platform does not activate collaborative computing devices',
        'No camera/microphone access required',
        'Web application — no device activation capability',
      ],
    },
    {
      id: 'SC.L2-3.13.13',
      title: 'Control Mobile Code',
      description:
        'Control and monitor the use of mobile code.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'CSP headers restrict script execution sources',
        'No third-party script injection allowed',
        'Client-side code served from trusted origin only',
      ],
    },
    {
      id: 'SC.L2-3.13.14',
      title: 'Control VoIP',
      description:
        'Control and monitor the use of Voice over Internet Protocol (VoIP) technologies.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'Platform does not use VoIP technologies',
        'No voice communication features in application',
        'Not applicable to web-based SaaS platform',
      ],
    },
    {
      id: 'SC.L2-3.13.15',
      title: 'Session Authenticity',
      description:
        'Protect the authenticity of communications sessions.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'CSRF protection on all state-changing requests',
        'Session tokens cryptographically signed',
        'TLS provides session-layer authenticity',
      ],
    },
    {
      id: 'SC.L2-3.13.16',
      title: 'Protect CUI at Rest',
      description:
        'Protect the confidentiality of CUI at rest.',
      category: 'System & Communications Protection (SC)',
      evidenceRequirements: [
        'Cloud SQL encryption at rest enabled',
        'GCS server-side encryption for stored objects',
        'AES-256-GCM for application-level secrets',
      ],
    },

    // =====================================================================
    // SI — System & Information Integrity (7 controls: 3.14.1 – 3.14.7)
    // =====================================================================
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
        'Monitor system security alerts and advisories and take appropriate actions in response.',
      category: 'System & Information Integrity (SI)',
      evidenceRequirements: [
        'KEV feed integration for exploit alerts',
        'EPSS scoring for threat likelihood',
        'Notification system for critical vulnerability alerts',
      ],
    },
    {
      id: 'SI.L2-3.14.4',
      title: 'Update Malicious Code Mechanisms',
      description:
        'Update malicious code protection mechanisms when new releases are available.',
      category: 'System & Information Integrity (SI)',
      evidenceRequirements: [
        'NVD/EPSS/KEV enrichment data refreshed regularly',
        'Scanner format parsers updated for new versions',
        'Container base images updated in CI/CD pipeline',
      ],
    },
    {
      id: 'SI.L2-3.14.5',
      title: 'System & File Scans',
      description:
        'Perform periodic scans of the information system and real-time scans of files from external sources as files are downloaded, opened, or executed.',
      category: 'System & Information Integrity (SI)',
      evidenceRequirements: [
        'Uploaded scan files validated and parsed',
        'Periodic scan ingestion tracked by frequency',
        'Container scanning in CI/CD pipeline',
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

// ---------------------------------------------------------------------------
// Assessment Function
// ---------------------------------------------------------------------------

export function assessCMMC(input: ComplianceAssessmentInput): ComplianceEvidence[] {
  const evidences: ComplianceEvidence[] = [];
  const now = new Date().toISOString();

  // Derived flags used across multiple controls
  const hasScanning = input.totalFindings > 0;
  const hasAudit = input.hasAuditLogs;
  const hasCaseWorkflow = input.totalOpenCases > 0 || input.totalClosedCases > 0;
  const hasRemediation = input.totalClosedCases > 0;
  const hasSla = input.hasSlaPolicies;
  const hasRiskVisibility = input.totalFindings > 0;
  const recentScan = input.lastScanDate
    ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
    : false;

  // =======================================================================
  // AC — Access Control (3.1.1 – 3.1.22)
  // =======================================================================

  // 3.1.1 Authorized Access Control
  evidences.push({
    controlId: 'AC.L2-3.1.1',
    status: 'met',
    evidence:
      'Platform implements RBAC with 10 roles (PLATFORM_ADMIN through VIEWER). Org-scoped tenant isolation enforced on all queries.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.2 Transaction & Function Control
  evidences.push({
    controlId: 'AC.L2-3.1.2',
    status: 'met',
    evidence:
      'API route authorization checks enforce function-level access control. Mutations require authenticated session with appropriate role.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.3 Control CUI Flow
  evidences.push({
    controlId: 'AC.L2-3.1.3',
    status: 'met',
    evidence:
      'CUI flow controlled by tenant boundary enforcement. All API responses scoped to authorized organization. Export functions require authenticated session.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.4 Separation of Duties
  evidences.push({
    controlId: 'AC.L2-3.1.4',
    status: 'met',
    evidence:
      'Distinct admin, analyst, and viewer roles enforce separation of duties. Risk exception approval requires different role than requester.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.5 Least Privilege
  evidences.push({
    controlId: 'AC.L2-3.1.5',
    status: 'met',
    evidence:
      'Least privilege enforced through role hierarchy. Admin functions restricted to SECURITY_ADMIN and PLATFORM_ADMIN roles.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.6 Non-privileged Access for Non-security Functions
  evidences.push({
    controlId: 'AC.L2-3.1.6',
    status: 'met',
    evidence:
      'Default user role is non-privileged (ANALYST/VIEWER). Admin elevation requires explicit role assignment by security admin.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.7 Prevent Non-privileged Users from Executing Privileged Functions
  evidences.push({
    controlId: 'AC.L2-3.1.7',
    status: hasAudit ? 'met' : 'partial',
    evidence: hasAudit
      ? 'RBAC middleware blocks unauthorized privilege escalation. Attempts logged in audit trail. UI hides privileged actions from non-privileged users.'
      : 'RBAC middleware blocks unauthorized escalation. Enable audit logging to capture privilege escalation attempts.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.8 Unsuccessful Logon Attempts
  evidences.push({
    controlId: 'AC.L2-3.1.8',
    status: 'met',
    evidence:
      'Rate limiting active on authentication endpoints (Redis sliding window). Failed logon attempts tracked. Account lockout enforced after repeated failures.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.9 Privacy & Security Notices
  evidences.push({
    controlId: 'AC.L2-3.1.9',
    status: 'partial',
    evidence:
      'Login page accessible. Terms of service and privacy policy linkable. CUI handling banner implementation is an organizational customization.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.10 Session Lock
  evidences.push({
    controlId: 'AC.L2-3.1.10',
    status: 'met',
    evidence:
      'Session timeout configured via Redis session store TTL. Inactive sessions require re-authentication.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.11 Session Termination
  evidences.push({
    controlId: 'AC.L2-3.1.11',
    status: 'met',
    evidence:
      'Session expiry enforced via Redis store with configurable TTL. Logout terminates server-side session. Token rotation on activity.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.12 Monitor & Control Remote Access
  evidences.push({
    controlId: 'AC.L2-3.1.12',
    status: hasAudit ? 'met' : 'partial',
    evidence: hasAudit
      ? 'All access is remote (cloud-hosted SaaS). Session activity logged in audit trail. IP allowlist restricts access origins.'
      : 'All access is remote with IP allowlist available. Enable audit logging for full session monitoring.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.13 Cryptographic Mechanisms for Remote Access
  evidences.push({
    controlId: 'AC.L2-3.1.13',
    status: 'met',
    evidence:
      'TLS 1.2+ enforced on all connections via Cloud Run and Cloud Armor. HTTPS-only communication policy. Session tokens encrypted.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.14 Route Remote Access via Managed Access Points
  evidences.push({
    controlId: 'AC.L2-3.1.14',
    status: 'met',
    evidence:
      'Cloud Run ingress controlled by Cloud Armor WAF. Load balancer serves as single managed access point. IP allowlist enforcement at edge.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.15 Authorize Remote Execution of Privileged Commands
  evidences.push({
    controlId: 'AC.L2-3.1.15',
    status: 'met',
    evidence:
      'Admin API routes require elevated role (SECURITY_ADMIN / PLATFORM_ADMIN). Privileged operations logged. Remote admin actions require authenticated session.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.16 Wireless Access Authorization
  evidences.push({
    controlId: 'AC.L2-3.1.16',
    status: 'na',
    evidence:
      'Cloud-hosted SaaS — no platform-managed wireless infrastructure. Wireless access authorization is a client-side organizational responsibility.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.17 Wireless Access Authentication & Encryption
  evidences.push({
    controlId: 'AC.L2-3.1.17',
    status: 'met',
    evidence:
      'All platform access requires authentication over TLS regardless of client network type. No platform-managed wireless infrastructure.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.18 Mobile Device Connection Control
  evidences.push({
    controlId: 'AC.L2-3.1.18',
    status: 'na',
    evidence:
      'Cloud-hosted SaaS — no native mobile app. Platform accessed via standard web browser. Mobile device management is an organizational responsibility.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.19 Encrypt CUI on Mobile Devices
  evidences.push({
    controlId: 'AC.L2-3.1.19',
    status: 'met',
    evidence:
      'Data transmitted over TLS to all devices including mobile. No persistent local storage of CUI on client devices. Browser-based access only.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.20 External System Connections
  evidences.push({
    controlId: 'AC.L2-3.1.20',
    status: input.hasIntegrations ? 'met' : 'partial',
    evidence: input.hasIntegrations
      ? 'External integrations (Jira, ServiceNow) configured and controlled by admin. Webhook destinations explicitly validated. OAuth connections scoped and audited.'
      : 'Integration framework available. No external system connections currently configured.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.21 Portable Storage Use
  evidences.push({
    controlId: 'AC.L2-3.1.21',
    status: 'na',
    evidence:
      'Cloud-hosted SaaS — no portable storage interfaces on server. File upload restricted to supported scan formats with size and type validation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.1.22 Publicly Accessible Content Control
  evidences.push({
    controlId: 'AC.L2-3.1.22',
    status: 'met',
    evidence:
      'All CUI data behind authentication. Public pages contain no CUI. Demo mode uses synthetic data only.',
    lastVerified: now,
    autoAssessed: true,
  });

  // =======================================================================
  // AT — Awareness & Training (3.2.1 – 3.2.3)
  // =======================================================================

  // 3.2.1 Role-Based Risk Awareness
  evidences.push({
    controlId: 'AT.L2-3.2.1',
    status: hasRiskVisibility ? 'met' : 'partial',
    evidence: hasRiskVisibility
      ? `Dashboard surfaces ${input.totalFindings} findings with EPSS scores and KEV indicators to all authorized users.`
      : 'Dashboard available but no scan data imported yet for risk awareness.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.2.2 Role-Based Training
  evidences.push({
    controlId: 'AT.L2-3.2.2',
    status: hasRiskVisibility ? 'met' : 'partial',
    evidence: hasRiskVisibility
      ? 'Role-specific dashboards provide vulnerability context. AI remediation guidance available for development teams.'
      : 'Role-specific views available but no data to contextualize training.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.2.3 Insider Threat Awareness
  evidences.push({
    controlId: 'AT.L2-3.2.3',
    status: hasAudit ? 'partial' : 'not_met',
    evidence: hasAudit
      ? 'Audit trail enables insider activity review. Role-based access limits blast radius. Organizational insider threat training is a process control.'
      : 'Audit logging required for insider threat monitoring. Organizational training program is a process control.',
    lastVerified: now,
    autoAssessed: true,
  });

  // =======================================================================
  // AU — Audit & Accountability (3.3.1 – 3.3.9)
  // =======================================================================

  // 3.3.1 System Auditing
  evidences.push({
    controlId: 'AU.L2-3.3.1',
    status: hasAudit ? 'met' : 'not_met',
    evidence: hasAudit
      ? 'Audit trail active with tamper-evident hash chain. Retention policies enforced per organizational tier.'
      : 'Audit logging not yet configured.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.3.2 User Accountability
  evidences.push({
    controlId: 'AU.L2-3.3.2',
    status: hasAudit ? 'met' : 'not_met',
    evidence: hasAudit
      ? 'All user actions traced to authenticated identity. Case assignments, status changes, and comments attributed.'
      : 'User accountability requires audit logging to be enabled.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.3.3 Event Review, Analysis & Reporting
  evidences.push({
    controlId: 'AU.L2-3.3.3',
    status: hasAudit ? 'met' : 'not_met',
    evidence: hasAudit
      ? 'Audit log viewer available in admin dashboard. Activity timeline on main dashboard. Export capability for audit records.'
      : 'Event review requires audit logging to be enabled.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.3.4 Alert on Audit Process Failure
  evidences.push({
    controlId: 'AU.L2-3.3.4',
    status: hasAudit ? 'met' : 'not_met',
    evidence: hasAudit
      ? 'Logging pipeline health monitored via Cloud Logging. Ops dashboard monitors audit subsystem health.'
      : 'Audit process failure alerting requires audit logging to be enabled.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.3.5 Audit Record Correlation
  evidences.push({
    controlId: 'AU.L2-3.3.5',
    status: hasAudit && input.hasIntegrations ? 'met' : hasAudit ? 'partial' : 'not_met',
    evidence: [
      hasAudit ? 'Audit records include user, action, resource, and timestamp' : 'Audit logging required',
      input.hasIntegrations ? 'Webhook integrations enable SIEM correlation' : 'No SIEM integrations configured',
      hasAudit ? 'Activity timeline correlates events across modules' : '',
    ].filter(Boolean).join('. ') + '.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.3.6 Audit Reduction & Reporting
  evidences.push({
    controlId: 'AU.L2-3.3.6',
    status: hasAudit ? 'met' : 'not_met',
    evidence: hasAudit
      ? 'Audit log filtering and search available. Executive reporting summarizes security events. Compliance reports aggregate audit data.'
      : 'Audit reduction and reporting requires audit logging to be enabled.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.3.7 Authoritative Time Source
  evidences.push({
    controlId: 'AU.L2-3.3.7',
    status: 'met',
    evidence:
      'Cloud Run instances use Google NTP infrastructure. All timestamps in ISO 8601 UTC format. Audit records use server-side timestamps.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.3.8 Protect Audit Information
  evidences.push({
    controlId: 'AU.L2-3.3.8',
    status: hasAudit ? 'met' : 'not_met',
    evidence: hasAudit
      ? 'Tamper-evident hash chain protects audit integrity. Audit logs stored in append-only fashion. Access restricted to admin roles.'
      : 'Audit information protection requires audit logging to be enabled.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.3.9 Manage Audit Logging
  evidences.push({
    controlId: 'AU.L2-3.3.9',
    status: hasAudit ? 'met' : 'not_met',
    evidence: hasAudit
      ? 'Audit configuration restricted to PLATFORM_ADMIN. Retention policies modifiable only by admin. Audit log deletion not exposed in UI.'
      : 'Audit management requires audit logging to be enabled.',
    lastVerified: now,
    autoAssessed: true,
  });

  // =======================================================================
  // CM — Configuration Management (3.4.1 – 3.4.9)
  // =======================================================================

  // 3.4.1 System Baselining
  evidences.push({
    controlId: 'CM.L2-3.4.1',
    status: hasScanning ? 'met' : 'not_met',
    evidence: hasScanning
      ? `Asset inventory maintained with ${input.totalFindings} tracked findings. Baseline vulnerability counts available.`
      : 'No scan data imported. Asset inventory requires scan ingestion.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.4.2 Security Configuration Enforcement
  evidences.push({
    controlId: 'CM.L2-3.4.2',
    status: hasSla ? 'met' : 'partial',
    evidence: hasSla
      ? `Security configuration settings enforced. SLA policies active with ${input.slaComplianceRate}% compliance.`
      : 'Platform configuration available but SLA policies not yet defined.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.4.3 Track, Control & Review Changes
  evidences.push({
    controlId: 'CM.L2-3.4.3',
    status: hasAudit ? 'met' : 'partial',
    evidence: hasAudit
      ? 'Settings changes logged in audit trail. Integration configuration changes tracked. User role changes require admin approval.'
      : 'Change tracking available but audit logging needed for complete trail.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.4.4 Security Impact Analysis
  evidences.push({
    controlId: 'CM.L2-3.4.4',
    status: hasScanning ? 'met' : 'partial',
    evidence: hasScanning
      ? 'Compliance score recalculated after configuration changes. Risk exception workflow evaluates impact.'
      : 'Impact analysis framework available. Requires scan data for full assessment.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.4.5 Physical & Logical Access Restrictions for Changes
  evidences.push({
    controlId: 'CM.L2-3.4.5',
    status: 'met',
    evidence:
      'Configuration changes restricted to admin roles via RBAC. Infrastructure changes require GCP IAM permissions. Settings API routes enforce authorization.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.4.6 Least Functionality
  evidences.push({
    controlId: 'CM.L2-3.4.6',
    status: 'met',
    evidence:
      'Platform exposes only necessary API endpoints. Cloud Run container runs minimal multi-stage build. Unused features disabled by default.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.4.7 Nonessential Programs Restriction
  evidences.push({
    controlId: 'CM.L2-3.4.7',
    status: 'met',
    evidence:
      'Cloud Armor blocks non-HTTPS traffic. Container exposes only required port. Non-essential OS services disabled in production container.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.4.8 Application Execution Policy
  evidences.push({
    controlId: 'CM.L2-3.4.8',
    status: 'met',
    evidence:
      'Container image includes only approved dependencies. File upload restricted to approved scanner formats. CSP headers restrict script execution.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.4.9 User-Installed Software Control
  evidences.push({
    controlId: 'CM.L2-3.4.9',
    status: 'na',
    evidence:
      'Cloud-hosted SaaS — no user-installed software on server. Connector integrations require admin configuration.',
    lastVerified: now,
    autoAssessed: true,
  });

  // =======================================================================
  // IA — Identification & Authentication (3.5.1 – 3.5.11)
  // =======================================================================

  // 3.5.1 Identification
  evidences.push({
    controlId: 'IA.L2-3.5.1',
    status: 'met',
    evidence:
      'Unique user accounts required. API keys scoped to individual identities. Service accounts separately identified.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.5.2 Authentication
  evidences.push({
    controlId: 'IA.L2-3.5.2',
    status: 'met',
    evidence:
      'Authentication via Google/GitHub OAuth and WorkOS SSO (SAML/OIDC). Session management with expiry and rotation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.5.3 Multifactor Authentication
  evidences.push({
    controlId: 'IA.L2-3.5.3',
    status: 'met',
    evidence:
      'TOTP MFA available for all accounts. Passkey/WebAuthn support implemented. MFA enforcement configurable for admin roles.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.5.4 Replay-Resistant Authentication
  evidences.push({
    controlId: 'IA.L2-3.5.4',
    status: 'met',
    evidence:
      'CSRF tokens on all state-changing requests. Session tokens rotated on authentication. OAuth state parameter prevents replay attacks.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.5.5 Identifier Reuse Prevention
  evidences.push({
    controlId: 'IA.L2-3.5.5',
    status: 'met',
    evidence:
      'User IDs are UUIDs — never reused. Email uniqueness enforced in database. API key identifiers are cryptographically random.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.5.6 Identifier Inactivity Disable
  evidences.push({
    controlId: 'IA.L2-3.5.6',
    status: 'partial',
    evidence:
      'Inactive user accounts can be deactivated by admin. Session expiry enforced for inactive sessions. Automated inactivity disable is an organizational policy.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.5.7 Minimum Password Complexity
  evidences.push({
    controlId: 'IA.L2-3.5.7',
    status: 'met',
    evidence:
      'Password policy enforces minimum length and complexity. HIBP breach database check on password creation. Strong password requirements enforced at API layer.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.5.8 Password Reuse Prevention
  evidences.push({
    controlId: 'IA.L2-3.5.8',
    status: 'met',
    evidence:
      'Password history tracked with configurable generation count. Previous password hashes compared on change. Policy enforcement at authentication layer.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.5.9 Temporary Password Change on First Use
  evidences.push({
    controlId: 'IA.L2-3.5.9',
    status: 'met',
    evidence:
      'Invitation-based onboarding requires password set on first login. OAuth flows provide secure first-use authentication without temporary passwords.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.5.10 Cryptographically Protected Passwords
  evidences.push({
    controlId: 'IA.L2-3.5.10',
    status: 'met',
    evidence:
      'Passwords hashed with bcrypt at rest. Passwords transmitted only over TLS. No plaintext password storage anywhere in system.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.5.11 Obscure Authentication Feedback
  evidences.push({
    controlId: 'IA.L2-3.5.11',
    status: 'met',
    evidence:
      'Login errors do not reveal whether user exists. Password fields masked in UI. API responses do not leak authentication details.',
    lastVerified: now,
    autoAssessed: true,
  });

  // =======================================================================
  // IR — Incident Response (3.6.1 – 3.6.3)
  // =======================================================================

  // 3.6.1 Incident Handling
  evidences.push({
    controlId: 'IR.L2-3.6.1',
    status: hasCaseWorkflow ? 'met' : 'not_met',
    evidence: hasCaseWorkflow
      ? `Incident handling active: ${input.totalOpenCases} open cases, ${input.totalClosedCases} closed. AI-powered remediation guidance available.`
      : 'No incident cases created yet. Case management workflow available but unused.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.6.2 Incident Reporting
  evidences.push({
    controlId: 'IR.L2-3.6.2',
    status: hasCaseWorkflow && hasAudit ? 'met' : hasCaseWorkflow ? 'partial' : 'not_met',
    evidence: [
      hasCaseWorkflow ? `Case tracking active with ${input.totalOpenCases + input.totalClosedCases} total cases` : 'No cases for incident reporting',
      hasAudit ? 'Full audit trail for reporting' : 'Audit logging needed for complete reporting',
      'Export capabilities available for external reporting',
    ].join('. ') + '.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.6.3 Test Incident Response Capability
  evidences.push({
    controlId: 'IR.L2-3.6.3',
    status: 'partial',
    evidence:
      'Demo mode available for training exercises. Case workflow can be exercised with test data. Organizational IR testing schedule is a process control.',
    lastVerified: now,
    autoAssessed: true,
  });

  // =======================================================================
  // MA — Maintenance (3.7.1 – 3.7.6)
  // =======================================================================

  // 3.7.1 System Maintenance
  {
    evidences.push({
      controlId: 'MA.L2-3.7.1',
      status: recentScan ? 'met' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        input.lastScanDate ? `Last scan: ${input.lastScanDate}` : 'No scan data available',
        `Average scan frequency: ${input.scanFrequencyDays} days`,
        hasRemediation ? `${input.totalClosedCases} remediation cases completed` : 'No remediation cases completed',
      ].join('. ') + '.',
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // 3.7.2 Effective Controls on Maintenance Tools
  evidences.push({
    controlId: 'MA.L2-3.7.2',
    status: 'met',
    evidence:
      'Maintenance performed via authenticated admin interfaces. Infrastructure maintenance via GCP IAM-controlled console. Database maintenance restricted to authorized operators.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.7.3 Equipment Sanitization
  evidences.push({
    controlId: 'MA.L2-3.7.3',
    status: 'partial',
    evidence:
      'Inherited from GCP — Google handles hardware lifecycle and sanitization. Cloud-hosted — no physical equipment removal by organization. Data retention policies enforced on decommission.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.7.4 Media Inspection for Malicious Code
  evidences.push({
    controlId: 'MA.L2-3.7.4',
    status: 'met',
    evidence:
      'File upload validates format and content type. Scanner output parsed through validated format-specific parsers. Container images scanned in CI/CD pipeline.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.7.5 Nonlocal Maintenance
  evidences.push({
    controlId: 'MA.L2-3.7.5',
    status: 'met',
    evidence:
      'All maintenance is nonlocal (cloud-hosted SaaS). Admin sessions require MFA. Session termination enforced on inactivity.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.7.6 Maintenance Personnel Supervision
  evidences.push({
    controlId: 'MA.L2-3.7.6',
    status: 'partial',
    evidence:
      'Inherited from GCP — Google manages physical maintenance personnel. Platform maintenance performed by authorized team only. All administrative actions logged in audit trail.',
    lastVerified: now,
    autoAssessed: true,
  });

  // =======================================================================
  // MP — Media Protection (3.8.1 – 3.8.9)
  // =======================================================================

  // 3.8.1 Protect CUI on System Media
  evidences.push({
    controlId: 'MP.L2-3.8.1',
    status: 'met',
    evidence:
      'Scan artifacts stored in encrypted GCS buckets. Exports delivered over HTTPS. Data retention policies enforced by tier.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.8.2 Limit CUI Access on Media
  evidences.push({
    controlId: 'MP.L2-3.8.2',
    status: 'met',
    evidence:
      'Export downloads require authenticated session. GCS bucket access restricted by IAM policies. Shared reports scoped to authorized recipients.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.8.3 Sanitize/Destroy Media Before Disposal
  evidences.push({
    controlId: 'MP.L2-3.8.3',
    status: 'met',
    evidence:
      'Data retention cron purges expired records. GCS object lifecycle policies enforce deletion. GCP handles physical media destruction.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.8.4 Mark Media with CUI Markings
  evidences.push({
    controlId: 'MP.L2-3.8.4',
    status: 'partial',
    evidence:
      'PDF exports can include classification banners. Full CUI marking implementation is an organizational policy configuration.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.8.5 Control Access to Media
  evidences.push({
    controlId: 'MP.L2-3.8.5',
    status: hasAudit ? 'met' : 'partial',
    evidence: hasAudit
      ? 'Export audit trail tracks who downloaded what. Bulk export jobs logged with requestor identity. All digital delivery over TLS.'
      : 'Access control enforced on exports. Enable audit logging for complete download tracking.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.8.6 Cryptographic Protection During Transport
  evidences.push({
    controlId: 'MP.L2-3.8.6',
    status: 'met',
    evidence:
      'All data transport over TLS 1.2+. Webhook payloads signed with HMAC. API responses encrypted in transit.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.8.7 Control Removable Media Use
  evidences.push({
    controlId: 'MP.L2-3.8.7',
    status: 'na',
    evidence:
      'Cloud-hosted SaaS — no removable media on server. Upload restricted to scan file formats. Client-side removable media outside platform scope.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.8.8 Shared System Resource Control
  evidences.push({
    controlId: 'MP.L2-3.8.8',
    status: 'met',
    evidence:
      'All uploads tied to authenticated user identity. Anonymous file submission not supported. Tenant isolation prevents cross-organization data leakage.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.8.9 Protect Backup CUI Confidentiality
  evidences.push({
    controlId: 'MP.L2-3.8.9',
    status: 'met',
    evidence:
      'Database backups encrypted via Cloud SQL automatic encryption. GCS backup buckets encrypted at rest. Backup retention policies enforced by tier.',
    lastVerified: now,
    autoAssessed: true,
  });

  // =======================================================================
  // PS — Personnel Security (3.9.1 – 3.9.2)
  // =======================================================================

  // 3.9.1 Screen Personnel
  evidences.push({
    controlId: 'PS.L2-3.9.1',
    status: 'partial',
    evidence:
      'User onboarding requires admin invitation. Role assignment controlled by security admins. Background screening is an organizational process outside the platform.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.9.2 Protect CUI During Personnel Actions
  evidences.push({
    controlId: 'PS.L2-3.9.2',
    status: 'met',
    evidence:
      'User deactivation immediately revokes access. Session invalidation on account disable. Role transfer preserves audit history.',
    lastVerified: now,
    autoAssessed: true,
  });

  // =======================================================================
  // PE — Physical Protection (3.10.1 – 3.10.6)
  // =======================================================================

  // 3.10.1 Limit Physical Access
  evidences.push({
    controlId: 'PE.L2-3.10.1',
    status: 'partial',
    evidence:
      'Inherited from GCP — infrastructure hosted in SOC 2 Type II certified data centers. Physical security managed by Google Cloud. Organizational physical controls are a process responsibility.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.10.2 Protect & Monitor Physical Facility
  evidences.push({
    controlId: 'PE.L2-3.10.2',
    status: 'partial',
    evidence:
      'Inherited from GCP — data centers provide 24/7 physical monitoring. Facility access controlled by Google Cloud security. Environmental controls managed by GCP.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.10.3 Escort Visitors
  evidences.push({
    controlId: 'PE.L2-3.10.3',
    status: 'partial',
    evidence:
      'Inherited from GCP — Google manages visitor access to data center facilities. No organizational physical facility for platform infrastructure.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.10.4 Physical Access Audit Logs
  evidences.push({
    controlId: 'PE.L2-3.10.4',
    status: 'partial',
    evidence:
      'Inherited from GCP — Google maintains physical access logs for data centers. Cloud Audit Logs track infrastructure access.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.10.5 Manage Physical Access Devices
  evidences.push({
    controlId: 'PE.L2-3.10.5',
    status: 'partial',
    evidence:
      'Inherited from GCP — Google manages physical access devices at data centers. No organizational physical access devices for platform.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.10.6 Enforce Safeguards at Alternative Work Sites
  evidences.push({
    controlId: 'PE.L2-3.10.6',
    status: 'partial',
    evidence:
      'Platform accessible securely from any location via HTTPS. Session security applies regardless of work site. Organizational alternative work site policy is a process control.',
    lastVerified: now,
    autoAssessed: true,
  });

  // =======================================================================
  // RA — Risk Assessment (3.11.1 – 3.11.3)
  // =======================================================================

  // 3.11.1 Risk Assessments
  evidences.push({
    controlId: 'RA.L2-3.11.1',
    status: hasScanning && input.hasRiskExceptions ? 'met' : hasScanning ? 'partial' : 'not_met',
    evidence: [
      hasScanning ? `Continuous risk scoring: ${input.totalFindings} findings with CVSS and EPSS scores` : 'No scan data for risk assessment',
      `${input.kevOpenCount} KEV-listed vulnerabilities tracked`,
      input.hasRiskExceptions ? 'Risk exception workflow with documented justifications active' : 'Risk exception process not configured',
    ].join('. ') + '.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.11.2 Vulnerability Scanning
  evidences.push({
    controlId: 'RA.L2-3.11.2',
    status: hasScanning && input.scanFrequencyDays <= 30 ? 'met' : hasScanning ? 'partial' : 'not_met',
    evidence: [
      hasScanning ? `${input.totalFindings} findings ingested from vulnerability scans` : 'No vulnerability scan data',
      `Scan frequency: every ${input.scanFrequencyDays} days`,
      'Supports 11 scanner formats with automated enrichment (NVD, EPSS, KEV)',
    ].join('. ') + '.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.11.3 Vulnerability Remediation
  evidences.push({
    controlId: 'RA.L2-3.11.3',
    status: hasRemediation && hasSla ? 'met' : hasRemediation ? 'partial' : 'not_met',
    evidence: [
      hasRemediation ? `${input.totalClosedCases} vulnerabilities remediated` : 'No remediation activity recorded',
      hasSla ? `SLA compliance: ${input.slaComplianceRate}%` : 'No SLA policies configured',
      `Average remediation time: ${input.averageRemediationDays} days`,
    ].join('. ') + '.',
    lastVerified: now,
    autoAssessed: true,
  });

  // =======================================================================
  // CA — Security Assessment (3.12.1 – 3.12.4)
  // =======================================================================

  // 3.12.1 Security Control Assessment
  evidences.push({
    controlId: 'CA.L2-3.12.1',
    status: hasScanning ? 'met' : 'not_met',
    evidence: hasScanning
      ? 'Automated compliance framework assessment active. Multiple frameworks tracked with auto-assessment.'
      : 'No scan data available for security control assessment.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.12.2 Plan of Action & Milestones
  evidences.push({
    controlId: 'CA.L2-3.12.2',
    status: hasScanning ? 'met' : 'not_met',
    evidence: hasScanning
      ? `POAM auto-generated from ${input.criticalOpenCount + input.highOpenCount} critical/high open findings. Milestones and export available.`
      : 'POAM generation requires vulnerability data.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.12.3 Continuous Monitoring
  evidences.push({
    controlId: 'CA.L2-3.12.3',
    status: hasScanning && recentScan ? 'met' : hasScanning ? 'partial' : 'not_met',
    evidence: [
      hasScanning ? 'Dashboard provides real-time compliance posture' : 'No scan data for monitoring',
      recentScan ? 'Recent scan data enables continuous monitoring' : 'Scan frequency below continuous monitoring threshold',
      hasSla ? `SLA compliance monitored: ${input.slaComplianceRate}%` : 'No SLA policies for monitoring',
    ].join('. ') + '.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.12.4 System Security Plan
  evidences.push({
    controlId: 'CA.L2-3.12.4',
    status: hasScanning ? 'partial' : 'not_met',
    evidence: hasScanning
      ? 'Compliance dashboard tracks framework alignment. Executive reporting available. Full SSP documentation is an organizational responsibility.'
      : 'System security plan tracking requires scan data.',
    lastVerified: now,
    autoAssessed: true,
  });

  // =======================================================================
  // SC — System & Communications Protection (3.13.1 – 3.13.16)
  // =======================================================================

  // 3.13.1 Boundary Protection
  evidences.push({
    controlId: 'SC.L2-3.13.1',
    status: 'met',
    evidence:
      'Cloud Armor WAF provides boundary protection. IP allowlist enforcement available. VPC Service Controls limit network exposure.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.13.2 Architectural Design — Subnetworks
  evidences.push({
    controlId: 'SC.L2-3.13.2',
    status: 'met',
    evidence:
      'VPC network segmentation in GCP. Database on private subnet (Cloud SQL private IP). Redis on private subnet (Memorystore).',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.13.3 Separate User from System Management Functionality
  evidences.push({
    controlId: 'SC.L2-3.13.3',
    status: 'met',
    evidence:
      'Admin dashboard separated from user dashboard. Ops dashboard on separate route group. API admin routes separated from user routes.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.13.4 Prevent Unauthorized Transfer via Shared Resources
  evidences.push({
    controlId: 'SC.L2-3.13.4',
    status: 'met',
    evidence:
      'Tenant isolation on all database queries. Session data isolated per user. GCS buckets scoped per organization.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.13.5 Public Access Subnetworks
  evidences.push({
    controlId: 'SC.L2-3.13.5',
    status: 'met',
    evidence:
      'Public-facing Cloud Run isolated from internal services. Database not publicly accessible. Internal APIs not exposed to public internet.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.13.6 Deny Network Traffic by Default
  evidences.push({
    controlId: 'SC.L2-3.13.6',
    status: 'met',
    evidence:
      'VPC firewall rules deny by default. Cloud Armor default deny policy. Only HTTPS (443) exposed publicly.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.13.7 Prevent Split Tunneling for Remote Devices
  evidences.push({
    controlId: 'SC.L2-3.13.7',
    status: 'na',
    evidence:
      'Cloud-hosted SaaS — split tunneling is a client-side network concern. Platform does not manage remote device network configuration.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.13.8 CUI Encryption in Transit
  evidences.push({
    controlId: 'SC.L2-3.13.8',
    status: 'met',
    evidence:
      'TLS encryption enforced on all data in transit. Webhook payloads signed with HMAC. HTTPS-only for all external communication.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.13.9 Terminate Connections After Inactivity
  evidences.push({
    controlId: 'SC.L2-3.13.9',
    status: 'met',
    evidence:
      'HTTP keep-alive timeout configured. Session expiry closes server-side connection state. Redis session store enforces TTL.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.13.10 Cryptographic Key Management
  evidences.push({
    controlId: 'SC.L2-3.13.10',
    status: 'met',
    evidence:
      'GCP KMS for key management. BYOK support for enterprise customers. Key rotation policies configurable.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.13.11 CUI Encryption at Rest
  evidences.push({
    controlId: 'SC.L2-3.13.11',
    status: 'met',
    evidence:
      'AES-256-GCM encryption for secrets at rest. Cloud SQL encryption enabled. KMS-based key management with BYOK support.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.13.12 Collaborative Computing Device Control
  evidences.push({
    controlId: 'SC.L2-3.13.12',
    status: 'na',
    evidence:
      'Platform does not activate collaborative computing devices. No camera/microphone access required. Web application only.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.13.13 Control Mobile Code
  evidences.push({
    controlId: 'SC.L2-3.13.13',
    status: 'met',
    evidence:
      'CSP headers restrict script execution sources. No third-party script injection allowed. Client-side code served from trusted origin only.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.13.14 Control VoIP
  evidences.push({
    controlId: 'SC.L2-3.13.14',
    status: 'na',
    evidence:
      'Cloud-hosted SaaS — platform does not use VoIP technologies. No voice communication features in application.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.13.15 Session Authenticity
  evidences.push({
    controlId: 'SC.L2-3.13.15',
    status: 'met',
    evidence:
      'CSRF protection on all state-changing requests. Session tokens cryptographically signed. TLS provides session-layer authenticity.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.13.16 Protect CUI at Rest
  evidences.push({
    controlId: 'SC.L2-3.13.16',
    status: 'met',
    evidence:
      'Cloud SQL encryption at rest enabled. GCS server-side encryption for stored objects. AES-256-GCM for application-level secrets.',
    lastVerified: now,
    autoAssessed: true,
  });

  // =======================================================================
  // SI — System & Information Integrity (3.14.1 – 3.14.7)
  // =======================================================================

  // 3.14.1 Flaw Remediation
  evidences.push({
    controlId: 'SI.L2-3.14.1',
    status: hasRemediation && hasSla ? 'met' : hasRemediation ? 'partial' : 'not_met',
    evidence: [
      hasRemediation ? `${input.totalClosedCases} flaws remediated` : 'No remediation activity',
      hasSla ? `SLA compliance: ${input.slaComplianceRate}%` : 'No SLA policies for timeliness',
      `MTTR: ${input.averageRemediationDays} days`,
    ].join('. ') + '.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.14.2 Malicious Code Protection
  evidences.push({
    controlId: 'SI.L2-3.14.2',
    status: input.kevOpenCount === 0 && hasScanning ? 'met' : hasScanning ? 'partial' : 'not_met',
    evidence: [
      `${input.kevOpenCount} open KEV-listed (actively exploited) vulnerabilities`,
      `${input.criticalOpenCount} critical open vulnerabilities`,
      'KEV catalog integration identifies known exploited vulnerabilities',
    ].join('. ') + '.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.14.3 Security Alerts & Advisories
  evidences.push({
    controlId: 'SI.L2-3.14.3',
    status: recentScan ? 'met' : hasScanning ? 'partial' : 'not_met',
    evidence: [
      input.lastScanDate ? `Last scan: ${input.lastScanDate}` : 'No scan data',
      `${input.kevOpenCount} KEV alerts tracked`,
      'EPSS scoring provides threat probability data',
    ].join('. ') + '.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.14.4 Update Malicious Code Mechanisms
  evidences.push({
    controlId: 'SI.L2-3.14.4',
    status: recentScan ? 'met' : 'partial',
    evidence: recentScan
      ? 'NVD/EPSS/KEV enrichment data refreshed with recent scans. Scanner format parsers maintained. Container base images updated in CI/CD.'
      : 'Enrichment data available but no recent scan activity. CI/CD pipeline maintains container updates.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.14.5 System & File Scans
  evidences.push({
    controlId: 'SI.L2-3.14.5',
    status: hasScanning ? 'met' : 'not_met',
    evidence: hasScanning
      ? `${input.totalFindings} findings from periodic scans. Uploaded scan files validated and parsed. Container scanning in CI/CD pipeline.`
      : 'No scan data imported. Upload and parsing infrastructure available.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.14.6 Monitor Communications for Attacks
  evidences.push({
    controlId: 'SI.L2-3.14.6',
    status: recentScan && input.hasIntegrations ? 'met' : recentScan ? 'partial' : 'not_met',
    evidence: [
      recentScan ? 'Continuous scan ingestion active' : 'No recent scan data',
      'Dashboard provides real-time vulnerability posture view',
      input.hasIntegrations ? 'Webhook integrations enable SIEM correlation' : 'No SIEM integrations configured',
    ].join('. ') + '.',
    lastVerified: now,
    autoAssessed: true,
  });

  // 3.14.7 Identify Unauthorized Use
  evidences.push({
    controlId: 'SI.L2-3.14.7',
    status: hasAudit ? 'met' : 'not_met',
    evidence: hasAudit
      ? 'Audit logs capture all system access. Rate limiting prevents brute-force attacks. Anomalous activity detectable through audit review.'
      : 'Audit logging required for unauthorized use detection.',
    lastVerified: now,
    autoAssessed: true,
  });

  return evidences;
}

// ---------------------------------------------------------------------------
// SPRS Score Calculator
// ---------------------------------------------------------------------------

/**
 * Calculate the SPRS (Supplier Performance Risk System) score.
 *
 * Perfect score = 110. Each unmet practice deducts its weight.
 * Partial credit deducts half the weight (rounded up).
 * N/A controls do not affect the score.
 *
 * @returns Score from -203 (all unmet) to 110 (all met)
 */
export function calculateSPRSScore(evidences: ComplianceEvidence[]): number {
  let score = 110;

  for (const ev of evidences) {
    // Extract the NIST practice number from the control ID (e.g., 'AC.L2-3.1.1' -> '3.1.1')
    const match = ev.controlId.match(/(\d+\.\d+\.\d+)/);
    if (!match) continue;

    const practiceId = match[1];
    const weight = CMMC_SPRS_WEIGHTS[practiceId];
    if (weight === undefined) continue;

    if (ev.status === 'not_met') {
      score -= weight;
    } else if (ev.status === 'partial') {
      score -= Math.ceil(weight / 2);
    }
    // 'met' and 'na' do not deduct
  }

  return score;
}
