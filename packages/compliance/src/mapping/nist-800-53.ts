/**
 * NIST SP 800-53 Rev 5 Control Mapping
 *
 * Maps CWE weakness identifiers to relevant NIST 800-53 security controls.
 * Covers the eight most vulnerability-relevant control families:
 *   AC (Access Control), AU (Audit & Accountability), CM (Configuration Management),
 *   IA (Identification & Authentication), RA (Risk Assessment),
 *   SA (System & Services Acquisition), SC (System & Communications Protection),
 *   SI (System & Information Integrity)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NistControl {
  id: string;
  family: NistControlFamily;
  title: string;
  description: string;
}

export type NistControlFamily =
  | 'AC'
  | 'AU'
  | 'CM'
  | 'IA'
  | 'RA'
  | 'SA'
  | 'SC'
  | 'SI';

export const NIST_FAMILY_LABELS: Record<NistControlFamily, string> = {
  AC: 'Access Control',
  AU: 'Audit & Accountability',
  CM: 'Configuration Management',
  IA: 'Identification & Authentication',
  RA: 'Risk Assessment',
  SA: 'System & Services Acquisition',
  SC: 'System & Communications Protection',
  SI: 'System & Information Integrity',
};

export interface NistControlMapping {
  cveId: string;
  cweId: string;
  controls: NistControl[];
}

// ---------------------------------------------------------------------------
// Control Catalog (subset relevant to vulnerability management)
// ---------------------------------------------------------------------------

export const NIST_800_53_CONTROLS: NistControl[] = [
  // Access Control (AC)
  {
    id: 'AC-3',
    family: 'AC',
    title: 'Access Enforcement',
    description:
      'The system enforces approved authorizations for logical access to information and system resources.',
  },
  {
    id: 'AC-4',
    family: 'AC',
    title: 'Information Flow Enforcement',
    description:
      'The system enforces approved authorizations for controlling the flow of information within the system and between connected systems.',
  },
  {
    id: 'AC-6',
    family: 'AC',
    title: 'Least Privilege',
    description:
      'The organization employs the principle of least privilege, allowing only authorized accesses for users and processes.',
  },
  {
    id: 'AC-7',
    family: 'AC',
    title: 'Unsuccessful Logon Attempts',
    description:
      'The system enforces a limit of consecutive invalid logon attempts by a user and takes action when the limit is exceeded.',
  },
  {
    id: 'AC-10',
    family: 'AC',
    title: 'Concurrent Session Control',
    description:
      'The system limits the number of concurrent sessions for each system account.',
  },
  {
    id: 'AC-12',
    family: 'AC',
    title: 'Session Termination',
    description:
      'The system automatically terminates a user session after defined conditions or trigger events.',
  },
  {
    id: 'AC-17',
    family: 'AC',
    title: 'Remote Access',
    description:
      'The organization establishes and documents usage restrictions, configuration/connection requirements, and implementation guidance for each type of remote access allowed.',
  },

  // Audit & Accountability (AU)
  {
    id: 'AU-2',
    family: 'AU',
    title: 'Event Logging',
    description:
      'The organization identifies events that need to be logged and coordinates the audit function with other entities requiring audit-related information.',
  },
  {
    id: 'AU-3',
    family: 'AU',
    title: 'Content of Audit Records',
    description:
      'The system generates audit records containing information about the type of event, when it occurred, where it occurred, the source and outcome.',
  },
  {
    id: 'AU-6',
    family: 'AU',
    title: 'Audit Record Review, Analysis, and Reporting',
    description:
      'The organization reviews and analyzes audit records for indications of inappropriate or unusual activity.',
  },
  {
    id: 'AU-9',
    family: 'AU',
    title: 'Protection of Audit Information',
    description:
      'The system protects audit information and audit logging tools from unauthorized access, modification, and deletion.',
  },
  {
    id: 'AU-12',
    family: 'AU',
    title: 'Audit Record Generation',
    description:
      'The system provides audit record generation capability for auditable events and generates audit records with defined content.',
  },

  // Configuration Management (CM)
  {
    id: 'CM-2',
    family: 'CM',
    title: 'Baseline Configuration',
    description:
      'The organization develops, documents, and maintains a current baseline configuration of the system.',
  },
  {
    id: 'CM-3',
    family: 'CM',
    title: 'Configuration Change Control',
    description:
      'The organization determines and documents types of changes to the system that are configuration-controlled.',
  },
  {
    id: 'CM-6',
    family: 'CM',
    title: 'Configuration Settings',
    description:
      'The organization establishes and documents configuration settings for IT products employed within the system using security configuration checklists.',
  },
  {
    id: 'CM-7',
    family: 'CM',
    title: 'Least Functionality',
    description:
      'The organization configures the system to provide only essential capabilities and prohibits or restricts the use of non-essential functions, ports, protocols, and services.',
  },
  {
    id: 'CM-8',
    family: 'CM',
    title: 'System Component Inventory',
    description:
      'The organization develops and documents an inventory of system components that accurately reflects the system and is at the level of granularity deemed necessary for tracking.',
  },

  // Identification & Authentication (IA)
  {
    id: 'IA-2',
    family: 'IA',
    title: 'Identification and Authentication (Organizational Users)',
    description:
      'The system uniquely identifies and authenticates organizational users or processes acting on behalf of organizational users.',
  },
  {
    id: 'IA-5',
    family: 'IA',
    title: 'Authenticator Management',
    description:
      'The organization manages system authenticators by verifying identity, establishing initial content, ensuring sufficient strength, and distributing/storing/revoking authenticators.',
  },
  {
    id: 'IA-6',
    family: 'IA',
    title: 'Authentication Feedback',
    description:
      'The system obscures feedback of authentication information during the authentication process to protect the information from possible exploitation.',
  },
  {
    id: 'IA-8',
    family: 'IA',
    title: 'Identification and Authentication (Non-Organizational Users)',
    description:
      'The system uniquely identifies and authenticates non-organizational users or processes acting on behalf of non-organizational users.',
  },

  // Risk Assessment (RA)
  {
    id: 'RA-3',
    family: 'RA',
    title: 'Risk Assessment',
    description:
      'The organization conducts assessments of risk including the likelihood and magnitude of harm from unauthorized access, use, disclosure, disruption, modification, or destruction.',
  },
  {
    id: 'RA-5',
    family: 'RA',
    title: 'Vulnerability Monitoring and Scanning',
    description:
      'The organization monitors and scans for vulnerabilities in the system and hosted applications, and remediates vulnerabilities in accordance with an organizational assessment of risk.',
  },
  {
    id: 'RA-7',
    family: 'RA',
    title: 'Risk Response',
    description:
      'The organization responds to findings from security and privacy assessments, monitoring, and audits in accordance with organizational risk tolerance.',
  },

  // System & Services Acquisition (SA)
  {
    id: 'SA-3',
    family: 'SA',
    title: 'System Development Life Cycle',
    description:
      'The organization manages the system using a system development life cycle that incorporates information security and privacy considerations.',
  },
  {
    id: 'SA-8',
    family: 'SA',
    title: 'Security and Privacy Engineering Principles',
    description:
      'The organization applies systems security and privacy engineering principles in the specification, design, development, implementation, and modification of the system.',
  },
  {
    id: 'SA-10',
    family: 'SA',
    title: 'Developer Configuration Management',
    description:
      'The organization requires the developer of the system to perform configuration management during design, development, implementation, and operation.',
  },
  {
    id: 'SA-11',
    family: 'SA',
    title: 'Developer Testing and Evaluation',
    description:
      'The organization requires the developer of the system to create and implement a security and privacy assessment plan and perform testing/evaluation at defined depth and coverage.',
  },
  {
    id: 'SA-15',
    family: 'SA',
    title: 'Development Process, Standards, and Tools',
    description:
      'The organization requires the developer of the system to follow a documented development process that explicitly addresses security and privacy requirements.',
  },

  // System & Communications Protection (SC)
  {
    id: 'SC-5',
    family: 'SC',
    title: 'Denial-of-Service Protection',
    description:
      'The system protects against or limits the effects of denial-of-service attacks based on defined types.',
  },
  {
    id: 'SC-7',
    family: 'SC',
    title: 'Boundary Protection',
    description:
      'The system monitors and controls communications at external managed interfaces and key internal boundaries.',
  },
  {
    id: 'SC-8',
    family: 'SC',
    title: 'Transmission Confidentiality and Integrity',
    description:
      'The system protects the confidentiality and integrity of transmitted information.',
  },
  {
    id: 'SC-12',
    family: 'SC',
    title: 'Cryptographic Key Establishment and Management',
    description:
      'The organization establishes and manages cryptographic keys when cryptography is employed within the system.',
  },
  {
    id: 'SC-13',
    family: 'SC',
    title: 'Cryptographic Protection',
    description:
      'The system implements defined cryptographic uses and types of cryptography required for each use.',
  },
  {
    id: 'SC-18',
    family: 'SC',
    title: 'Mobile Code',
    description:
      'The organization defines acceptable and unacceptable mobile code and mobile code technologies and establishes usage restrictions and implementation guidance.',
  },
  {
    id: 'SC-23',
    family: 'SC',
    title: 'Session Authenticity',
    description:
      'The system protects the authenticity of communications sessions.',
  },
  {
    id: 'SC-28',
    family: 'SC',
    title: 'Protection of Information at Rest',
    description:
      'The system protects the confidentiality and integrity of information at rest.',
  },

  // System & Information Integrity (SI)
  {
    id: 'SI-2',
    family: 'SI',
    title: 'Flaw Remediation',
    description:
      'The organization identifies, reports, and corrects system flaws; tests software and firmware updates related to flaw remediation for effectiveness and potential side effects; and installs security-relevant updates within defined time periods.',
  },
  {
    id: 'SI-3',
    family: 'SI',
    title: 'Malicious Code Protection',
    description:
      'The organization employs malicious code protection mechanisms at system entry and exit points to detect and eradicate malicious code.',
  },
  {
    id: 'SI-4',
    family: 'SI',
    title: 'System Monitoring',
    description:
      'The organization monitors the system to detect attacks and indicators of potential attacks, unauthorized connections, and unauthorized use.',
  },
  {
    id: 'SI-5',
    family: 'SI',
    title: 'Security Alerts, Advisories, and Directives',
    description:
      'The organization receives system security alerts, advisories, and directives from external organizations on an ongoing basis and generates internal alerts as needed.',
  },
  {
    id: 'SI-7',
    family: 'SI',
    title: 'Software, Firmware, and Information Integrity',
    description:
      'The organization employs integrity verification tools to detect unauthorized changes to software, firmware, and information.',
  },
  {
    id: 'SI-10',
    family: 'SI',
    title: 'Information Input Validation',
    description:
      'The system checks the validity of information inputs to prevent injection attacks, buffer overflows, and other input-based exploits.',
  },
  {
    id: 'SI-11',
    family: 'SI',
    title: 'Error Handling',
    description:
      'The system generates error messages that provide information necessary for corrective actions without revealing information exploitable by adversaries.',
  },
  {
    id: 'SI-16',
    family: 'SI',
    title: 'Memory Protection',
    description:
      'The system implements security safeguards to protect its memory from unauthorized code execution.',
  },
];

/** Lookup table keyed by control ID for fast access. */
export const NIST_CONTROLS_BY_ID: Record<string, NistControl> = Object.fromEntries(
  NIST_800_53_CONTROLS.map((c) => [c.id, c]),
);

// ---------------------------------------------------------------------------
// CWE → NIST 800-53 Mapping
//
// Each entry maps a CWE identifier (numeric string) to an array of 800-53
// control IDs that mitigate or detect the weakness.  Relationships are based
// on the MITRE CWE → NIST mapping guidance and NVD cross-references.
// ---------------------------------------------------------------------------

const CWE_TO_CONTROLS: Record<string, string[]> = {
  // ---- Injection family ----
  '20':   ['SI-10'],                                         // Improper Input Validation
  '77':   ['SI-10', 'SI-3'],                                 // Command Injection
  '78':   ['SI-10', 'SI-3', 'CM-7'],                         // OS Command Injection
  '79':   ['SI-10', 'SC-18'],                                // XSS
  '80':   ['SI-10', 'SC-18'],                                // Basic XSS
  '89':   ['SI-10', 'SA-11'],                                // SQL Injection
  '90':   ['SI-10', 'IA-2'],                                 // LDAP Injection
  '91':   ['SI-10'],                                         // XML Injection
  '94':   ['SI-10', 'SI-3', 'SC-18'],                        // Code Injection
  '917':  ['SI-10', 'SC-18'],                                // Expression Language Injection

  // ---- Authentication / Credential ----
  '255':  ['IA-5', 'SC-12'],                                 // Credentials Management Errors
  '256':  ['IA-5', 'SC-28'],                                 // Plaintext Storage of Password
  '257':  ['IA-5', 'SC-13'],                                 // Storing Passwords in Recoverable Format
  '259':  ['IA-5', 'CM-6'],                                  // Use of Hard-coded Password
  '261':  ['IA-5', 'SC-13'],                                 // Weak Encoding for Password
  '287':  ['IA-2', 'IA-8'],                                  // Improper Authentication
  '288':  ['IA-2', 'AC-3'],                                  // Authentication Bypass Using Alternate Path
  '290':  ['IA-2', 'SC-23'],                                 // Authentication Bypass by Spoofing
  '307':  ['AC-7', 'IA-2'],                                  // Improper Restriction of Excessive Auth Attempts
  '521':  ['IA-5'],                                          // Weak Password Requirements
  '522':  ['IA-5', 'SC-8', 'SC-28'],                         // Insufficiently Protected Credentials
  '613':  ['AC-12', 'SC-23'],                                // Insufficient Session Expiration
  '640':  ['IA-5', 'IA-6'],                                  // Weak Password Recovery Mechanism
  '798':  ['IA-5', 'CM-6', 'SA-15'],                         // Use of Hard-coded Credentials

  // ---- Authorization / Access Control ----
  '22':   ['AC-3', 'CM-7'],                                  // Path Traversal
  '23':   ['AC-3', 'CM-7'],                                  // Relative Path Traversal
  '36':   ['AC-3'],                                          // Absolute Path Traversal
  '59':   ['AC-3', 'CM-6'],                                  // Improper Link Resolution (Symlink)
  '200':  ['AC-3', 'SI-11', 'AU-3'],                         // Exposure of Sensitive Info
  '269':  ['AC-6'],                                          // Improper Privilege Management
  '276':  ['AC-3', 'AC-6'],                                  // Incorrect Default Permissions
  '284':  ['AC-3', 'AC-6'],                                  // Improper Access Control
  '285':  ['AC-3'],                                          // Improper Authorization
  '352':  ['SC-23', 'SI-10'],                                // CSRF
  '359':  ['AC-3', 'SC-28'],                                 // Exposure of Private Personal Info
  '434':  ['CM-7', 'SI-3'],                                  // Unrestricted Upload of Dangerous File Type
  '601':  ['SI-10', 'CM-7'],                                 // Open Redirect
  '639':  ['AC-3'],                                          // Authorization Bypass Through User-Controlled Key (IDOR)
  '732':  ['AC-3', 'AC-6'],                                  // Incorrect Permission Assignment
  '862':  ['AC-3'],                                          // Missing Authorization
  '863':  ['AC-3'],                                          // Incorrect Authorization

  // ---- Cryptography ----
  '310':  ['SC-13', 'SC-12'],                                // Cryptographic Issues
  '326':  ['SC-13'],                                         // Inadequate Encryption Strength
  '327':  ['SC-13', 'SC-12'],                                // Use of Broken Crypto Algorithm
  '328':  ['SC-13'],                                         // Use of Weak Hash
  '330':  ['SC-13'],                                         // Insufficient Randomness
  '338':  ['SC-13'],                                         // Use of Cryptographically Weak PRNG
  '347':  ['SC-8', 'SC-13', 'SI-7'],                         // Improper Verification of Crypto Signature

  // ---- Memory safety ----
  '119':  ['SI-16', 'SI-10'],                                // Buffer Overflow (generic)
  '120':  ['SI-16', 'SI-10'],                                // Classic Buffer Overflow
  '122':  ['SI-16'],                                         // Heap-based Buffer Overflow
  '125':  ['SI-16'],                                         // Out-of-bounds Read
  '190':  ['SI-16', 'SI-10'],                                // Integer Overflow
  '416':  ['SI-16'],                                         // Use After Free
  '476':  ['SI-16'],                                         // NULL Pointer Dereference
  '787':  ['SI-16', 'SI-10'],                                // Out-of-bounds Write

  // ---- Information Disclosure / Error Handling ----
  '209':  ['SI-11'],                                         // Generation of Error Message with Sensitive Info
  '532':  ['AU-9', 'SI-11'],                                 // Insertion of Sensitive Info into Log File
  '538':  ['AC-3', 'CM-6'],                                  // Exposure of File/Dir Info through Listing

  // ---- Session management ----
  '384':  ['SC-23', 'AC-12'],                                // Session Fixation
  '614':  ['SC-8', 'SC-23'],                                 // Sensitive Cookie Without Secure Attribute

  // ---- Deserialization ----
  '502':  ['SI-10', 'SI-3'],                                 // Deserialization of Untrusted Data

  // ---- SSRF / XXE ----
  '611':  ['SI-10', 'CM-7'],                                 // Improper Restriction of XML External Entity (XXE)
  '918':  ['SI-10', 'SC-7', 'AC-4'],                         // SSRF

  // ---- Configuration / Deployment ----
  '16':   ['CM-6', 'CM-2'],                                  // Configuration
  '250':  ['AC-6'],                                          // Execution with Unnecessary Privileges
  '400':  ['SC-5'],                                          // Uncontrolled Resource Consumption (DoS)
  '770':  ['SC-5', 'CM-7'],                                  // Allocation of Resources Without Limits
  '1021': ['SC-18', 'SI-10'],                                // Improper Restriction of Rendered UI Layers (Clickjacking)

  // ---- Supply chain / Integrity ----
  '829':  ['SA-10', 'SA-15', 'SI-7'],                        // Inclusion of Functionality from Untrusted Source
  '1104': ['SA-10', 'CM-8'],                                 // Use of Unmaintained Third-Party Components
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Given a CWE identifier, returns the list of relevant NIST 800-53 control IDs.
 *
 * Accepts formats: "CWE-79", "79", "cwe-79"
 */
export function mapFindingToControls(cweId: string): string[] {
  const normalized = cweId.replace(/^cwe-/i, '');
  return CWE_TO_CONTROLS[normalized] ?? [];
}

/**
 * Given a CVE ID and its associated CWE IDs, returns full NistControlMapping
 * objects with resolved control details.
 */
export function mapCveToControls(
  cveId: string,
  cweIds: string[],
): NistControlMapping[] {
  return cweIds.map((cweId) => {
    const controlIds = mapFindingToControls(cweId);
    const controls = controlIds
      .map((id) => NIST_CONTROLS_BY_ID[id])
      .filter((c): c is NistControl => c !== undefined);

    return {
      cveId,
      cweId: cweId.replace(/^cwe-/i, ''),
      controls,
    };
  });
}

/**
 * Returns all unique control IDs that are triggered by a set of CWE IDs.
 * Useful for computing "affected controls" across an entire findings set.
 */
export function getAffectedControlIds(cweIds: string[]): Set<string> {
  const affected = new Set<string>();
  for (const cwe of cweIds) {
    for (const controlId of mapFindingToControls(cwe)) {
      affected.add(controlId);
    }
  }
  return affected;
}

/**
 * Returns controls grouped by family, with an "affected" flag for each control
 * based on the provided set of CWE IDs from current findings.
 *
 * This is the primary function used by the dashboard to show coverage/gaps.
 */
export function getControlCoverageByFamily(
  cweIds: string[],
): {
  family: NistControlFamily;
  familyLabel: string;
  controls: (NistControl & { affected: boolean })[];
  affectedCount: number;
  totalCount: number;
}[] {
  const affected = getAffectedControlIds(cweIds);

  const grouped = new Map<
    NistControlFamily,
    (NistControl & { affected: boolean })[]
  >();

  for (const control of NIST_800_53_CONTROLS) {
    if (!grouped.has(control.family)) {
      grouped.set(control.family, []);
    }
    grouped.get(control.family)!.push({
      ...control,
      affected: affected.has(control.id),
    });
  }

  const familyOrder: NistControlFamily[] = [
    'SI',
    'SC',
    'AC',
    'IA',
    'CM',
    'RA',
    'AU',
    'SA',
  ];

  return familyOrder
    .filter((f) => grouped.has(f))
    .map((family) => {
      const controls = grouped.get(family)!;
      return {
        family,
        familyLabel: NIST_FAMILY_LABELS[family],
        controls,
        affectedCount: controls.filter((c) => c.affected).length,
        totalCount: controls.length,
      };
    });
}
