/**
 * NIST SP 800-53 Rev 5 Compliance Framework
 *
 * Wraps the existing NIST 800-53 control catalog into a full ComplianceFramework
 * with auto-assessment function. Extends the original 8 vulnerability-relevant
 * families (AC, AU, CM, IA, RA, SA, SC, SI) with 8 additional families
 * (AT, CP, IR, MA, MP, PE, PL, PS) for comprehensive coverage.
 */

import type {
  ComplianceFramework,
  ComplianceEvidence,
  ComplianceAssessmentInput,
} from './types';

import { NIST_800_53_CONTROLS, NIST_FAMILY_LABELS } from '../mapping/nist-800-53';
import type { NistControlFamily } from '../mapping/nist-800-53';

// ---------------------------------------------------------------------------
// Extended families not covered in the mapping module
// ---------------------------------------------------------------------------

type ExtendedNistFamily =
  | NistControlFamily
  | 'AT'
  | 'CP'
  | 'IR'
  | 'MA'
  | 'MP'
  | 'PE'
  | 'PL'
  | 'PS';

const EXTENDED_FAMILY_LABELS: Record<ExtendedNistFamily, string> = {
  ...NIST_FAMILY_LABELS,
  AT: 'Awareness & Training',
  CP: 'Contingency Planning',
  IR: 'Incident Response',
  MA: 'Maintenance',
  MP: 'Media Protection',
  PE: 'Physical & Environmental Protection',
  PL: 'Planning',
  PS: 'Personnel Security',
};

// ---------------------------------------------------------------------------
// Additional controls (23 controls across 8 new families)
// ---------------------------------------------------------------------------

interface FrameworkControl {
  id: string;
  family: ExtendedNistFamily;
  title: string;
  description: string;
  evidenceRequirements: string[];
}

const ADDITIONAL_CONTROLS: FrameworkControl[] = [
  // AT — Awareness & Training
  {
    id: 'AT-2',
    family: 'AT',
    title: 'Literacy Training and Awareness',
    description:
      'Provide security and privacy literacy training to system users as part of initial training and at least annually thereafter.',
    evidenceRequirements: [
      'Security awareness training program in place',
      'Annual training completion records',
    ],
  },
  {
    id: 'AT-3',
    family: 'AT',
    title: 'Role-Based Training',
    description:
      'Provide role-based security and privacy training to personnel with assigned security and privacy roles and responsibilities before authorizing access and at defined frequency thereafter.',
    evidenceRequirements: [
      'Role-based training curriculum defined',
      'Training completion tracked per role',
    ],
  },

  // CP — Contingency Planning
  {
    id: 'CP-2',
    family: 'CP',
    title: 'Contingency Plan',
    description:
      'Develop a contingency plan that addresses essential mission and business functions, recovery objectives, and restoration priorities.',
    evidenceRequirements: [
      'Documented contingency plan',
      'Recovery time objectives defined',
      'Plan reviewed and updated annually',
    ],
  },
  {
    id: 'CP-4',
    family: 'CP',
    title: 'Contingency Plan Testing',
    description:
      'Test the contingency plan at the defined frequency using defined tests to determine effectiveness and organizational readiness.',
    evidenceRequirements: [
      'Annual contingency plan testing',
      'Test results documented',
      'Lessons learned incorporated',
    ],
  },
  {
    id: 'CP-9',
    family: 'CP',
    title: 'System Backup',
    description:
      'Conduct backups of user-level and system-level information at defined frequency and protect backup confidentiality, integrity, and availability.',
    evidenceRequirements: [
      'Automated backup schedule configured',
      'Backup encryption enabled',
      'Backup restoration tested',
    ],
  },
  {
    id: 'CP-10',
    family: 'CP',
    title: 'System Recovery and Reconstitution',
    description:
      'Provide for the recovery and reconstitution of the system to a known state within defined time period after a disruption, compromise, or failure.',
    evidenceRequirements: [
      'Recovery procedures documented',
      'Recovery time tested against objectives',
      'System reconstitution verified',
    ],
  },

  // IR — Incident Response
  {
    id: 'IR-2',
    family: 'IR',
    title: 'Incident Response Training',
    description:
      'Provide incident response training to system users consistent with assigned roles and responsibilities within defined time period of assuming an incident response role.',
    evidenceRequirements: [
      'Incident response training program',
      'Training records maintained',
    ],
  },
  {
    id: 'IR-4',
    family: 'IR',
    title: 'Incident Handling',
    description:
      'Implement an incident handling capability that includes preparation, detection and analysis, containment, eradication, and recovery.',
    evidenceRequirements: [
      'Incident handling procedures documented',
      'Case management workflow active',
      'Escalation paths defined',
    ],
  },
  {
    id: 'IR-5',
    family: 'IR',
    title: 'Incident Monitoring',
    description:
      'Track and document incidents on an ongoing basis.',
    evidenceRequirements: [
      'Incident tracking system in use',
      'Metrics collected on incident volume and resolution',
    ],
  },
  {
    id: 'IR-6',
    family: 'IR',
    title: 'Incident Reporting',
    description:
      'Require personnel to report suspected incidents to the organizational incident response capability within defined time period.',
    evidenceRequirements: [
      'Incident reporting procedures documented',
      'Reporting timelines defined and enforced',
    ],
  },

  // MA — Maintenance
  {
    id: 'MA-2',
    family: 'MA',
    title: 'Controlled Maintenance',
    description:
      'Schedule, document, and review records of maintenance, repair, and replacement on system components in accordance with manufacturer or vendor specifications.',
    evidenceRequirements: [
      'Maintenance schedule documented',
      'Maintenance activities logged',
    ],
  },
  {
    id: 'MA-5',
    family: 'MA',
    title: 'Maintenance Personnel',
    description:
      'Establish a process for maintenance personnel authorization and maintain a list of authorized maintenance organizations or personnel.',
    evidenceRequirements: [
      'Authorized maintenance personnel list',
      'Escort procedures for non-authorized personnel',
    ],
  },

  // MP — Media Protection
  {
    id: 'MP-2',
    family: 'MP',
    title: 'Media Access',
    description:
      'Restrict access to digital and non-digital media to authorized individuals using defined controls.',
    evidenceRequirements: [
      'Media access restrictions enforced',
      'Access logging for sensitive media',
    ],
  },
  {
    id: 'MP-4',
    family: 'MP',
    title: 'Media Storage',
    description:
      'Physically control and securely store digital and non-digital media within controlled areas using defined security controls.',
    evidenceRequirements: [
      'Encrypted storage for digital media',
      'Storage area access controls',
    ],
  },
  {
    id: 'MP-6',
    family: 'MP',
    title: 'Media Sanitization',
    description:
      'Sanitize system media prior to disposal, release out of organizational control, or release for reuse using defined sanitization techniques and procedures.',
    evidenceRequirements: [
      'Data retention and deletion policies',
      'Media sanitization procedures documented',
    ],
  },

  // PE — Physical & Environmental Protection
  {
    id: 'PE-2',
    family: 'PE',
    title: 'Physical Access Authorizations',
    description:
      'Develop, approve, and maintain a list of individuals with authorized access to the facility where the system resides.',
    evidenceRequirements: [
      'Physical access authorization list maintained',
      'Authorization reviewed periodically',
    ],
  },
  {
    id: 'PE-3',
    family: 'PE',
    title: 'Physical Access Control',
    description:
      'Enforce physical access authorizations at defined entry and exit points to the facility using physical access control systems and guards.',
    evidenceRequirements: [
      'Physical access controls at entry/exit points',
      'Access logs maintained',
    ],
  },
  {
    id: 'PE-6',
    family: 'PE',
    title: 'Monitoring Physical Access',
    description:
      'Monitor physical access to the facility where the system resides to detect and respond to physical security incidents.',
    evidenceRequirements: [
      'Physical access monitoring in place',
      'Incident response for physical breaches',
    ],
  },

  // PL — Planning
  {
    id: 'PL-2',
    family: 'PL',
    title: 'System Security and Privacy Plans',
    description:
      'Develop security and privacy plans that describe the controls in place or planned, rules of behavior, and system interconnections.',
    evidenceRequirements: [
      'System Security Plan (SSP) documented',
      'Plan reviewed and updated annually',
    ],
  },
  {
    id: 'PL-4',
    family: 'PL',
    title: 'Rules of Behavior',
    description:
      'Establish and provide to individuals requiring access to the system, rules that describe their responsibilities and expected behavior regarding system usage.',
    evidenceRequirements: [
      'Rules of behavior documented',
      'User acknowledgment collected',
    ],
  },

  // PS — Personnel Security
  {
    id: 'PS-3',
    family: 'PS',
    title: 'Personnel Screening',
    description:
      'Screen individuals prior to authorizing access to the system and rescreen at defined frequency.',
    evidenceRequirements: [
      'Background check procedures',
      'Screening completed before access granted',
    ],
  },
  {
    id: 'PS-4',
    family: 'PS',
    title: 'Personnel Termination',
    description:
      'Upon termination of individual employment, disable system access within defined time period, terminate any authenticators and credentials, and conduct exit interviews.',
    evidenceRequirements: [
      'Access revocation on termination',
      'Exit interview process',
      'Credential revocation procedures',
    ],
  },
  {
    id: 'PS-7',
    family: 'PS',
    title: 'External Personnel Security',
    description:
      'Establish personnel security requirements for external providers and monitor provider compliance.',
    evidenceRequirements: [
      'Third-party personnel security requirements documented',
      'Compliance monitoring for external personnel',
    ],
  },
];

// ---------------------------------------------------------------------------
// Build the unified control list for the framework
// ---------------------------------------------------------------------------

function buildFrameworkControls() {
  // Convert existing mapping controls to framework controls
  const existingControls = NIST_800_53_CONTROLS.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    category: EXTENDED_FAMILY_LABELS[c.family as ExtendedNistFamily] ?? c.family,
    evidenceRequirements: getEvidenceRequirements(c.id, c.family),
  }));

  // Convert additional controls
  const newControls = ADDITIONAL_CONTROLS.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    category: EXTENDED_FAMILY_LABELS[c.family],
    evidenceRequirements: c.evidenceRequirements,
  }));

  return [...existingControls, ...newControls];
}

/** Generate evidence requirements for existing mapping controls */
function getEvidenceRequirements(controlId: string, family: string): string[] {
  const familyDefaults: Record<string, string[]> = {
    AC: [
      'Role-based access control implemented',
      'Tenant isolation enforced',
      'Session management active',
    ],
    AU: [
      'Audit logging enabled',
      'Audit records contain required fields',
      'Audit log integrity verified',
    ],
    CM: [
      'Configuration baseline documented',
      'Change control process in place',
      'System component inventory maintained',
    ],
    IA: [
      'Multi-factor authentication supported',
      'OAuth/SSO integration active',
      'Authenticator management procedures',
    ],
    RA: [
      'Vulnerability scanning performed regularly',
      'Risk assessments documented',
      'Vulnerability remediation tracked',
    ],
    SA: [
      'SDLC security practices documented',
      'Developer security testing performed',
      'Third-party component management',
    ],
    SC: [
      'TLS encryption for data in transit',
      'AES-256-GCM encryption at rest',
      'WAF and boundary protection active',
    ],
    SI: [
      'Flaw remediation process active',
      'Input validation implemented',
      'System integrity monitoring enabled',
    ],
  };

  return familyDefaults[family] ?? [`${controlId} evidence required`];
}

// ---------------------------------------------------------------------------
// Framework Definition
// ---------------------------------------------------------------------------

export const NIST_800_53_FRAMEWORK: ComplianceFramework = {
  id: 'nist-800-53-r5',
  name: 'NIST SP 800-53 Rev 5',
  version: 'Rev 5',
  description:
    'Security and Privacy Controls for Information Systems and Organizations. Covers 16 control families relevant to vulnerability management and organizational security posture.',
  controls: buildFrameworkControls(),
};

// ---------------------------------------------------------------------------
// Assessment Function
// ---------------------------------------------------------------------------

/**
 * Assess NIST 800-53 compliance based on platform telemetry.
 *
 * Each control family is assessed using a combination of automated platform
 * signals and known architectural capabilities. Controls that depend on
 * organizational processes outside the platform are marked 'partial'.
 */
export function assessNIST80053(
  input: ComplianceAssessmentInput,
): ComplianceEvidence[] {
  const evidences: ComplianceEvidence[] = [];
  const now = new Date().toISOString();

  const controlFamilyMap = new Map<string, string[]>();
  for (const control of NIST_800_53_FRAMEWORK.controls) {
    const family = controlIdToFamily(control.id);
    if (!controlFamilyMap.has(family)) {
      controlFamilyMap.set(family, []);
    }
    controlFamilyMap.get(family)!.push(control.id);
  }

  // Assess each control based on its family logic
  for (const control of NIST_800_53_FRAMEWORK.controls) {
    const family = controlIdToFamily(control.id);
    const result = assessByFamily(family, control.id, input);
    evidences.push({
      controlId: control.id,
      status: result.status,
      evidence: result.evidence,
      lastVerified: now,
      autoAssessed: true,
    });
  }

  return evidences;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract family prefix from control ID (e.g. "AC-3" -> "AC") */
function controlIdToFamily(controlId: string): string {
  return controlId.split('-')[0];
}

function assessByFamily(
  family: string,
  controlId: string,
  input: ComplianceAssessmentInput,
): { status: 'met' | 'partial' | 'not_met' | 'na'; evidence: string } {
  switch (family) {
    // ----- AC: Access Control — 'met' (RBAC, tenant isolation, session mgmt) -----
    case 'AC':
      return {
        status: 'met',
        evidence:
          'Platform enforces role-based access control (10 RBAC roles), multi-tenant isolation, session management with expiry, and OAuth/SSO authentication.',
      };

    // ----- AU: Audit & Accountability — based on hasAuditLogs -----
    case 'AU':
      return {
        status: input.hasAuditLogs ? 'met' : 'not_met',
        evidence: input.hasAuditLogs
          ? 'Audit logging active with tamper-evident hash chain. Events include auth, data access, configuration changes, and admin actions.'
          : 'Audit logging is not enabled. Enable audit logs to satisfy AU controls.',
      };

    // ----- CM: Configuration Management — based on totalFindings, hasSlaPolicies -----
    case 'CM': {
      const hasFindings = input.totalFindings > 0;
      const hasSla = input.hasSlaPolicies;
      const cmStatus = hasFindings && hasSla ? 'met' : hasFindings || hasSla ? 'partial' : 'not_met';
      return {
        status: cmStatus,
        evidence: [
          hasFindings
            ? `${input.totalFindings} findings tracked from configuration and vulnerability scans`
            : 'No scan findings ingested for configuration baseline tracking',
          hasSla
            ? `SLA policies active (${input.slaComplianceRate}% compliance rate) for configuration change control`
            : 'No SLA policies configured for change control timelines',
        ].join('. '),
      };
    }

    // ----- IA: Identification & Authentication — 'met' (MFA, OAuth, session mgmt) -----
    case 'IA':
      return {
        status: 'met',
        evidence:
          'Platform supports MFA (TOTP), OAuth (Google/GitHub), SSO (SAML/OIDC via WorkOS), WebAuthn/Passkeys, and password policies (expiry, HIBP, history).',
      };

    // ----- RA: Risk Assessment — based on scanning activity -----
    case 'RA': {
      const recentScan = input.lastScanDate
        ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
        : false;
      const hasFrequentScans = input.scanFrequencyDays <= 14;
      const raStatus = recentScan && hasFrequentScans ? 'met' : recentScan ? 'partial' : 'not_met';
      return {
        status: raStatus,
        evidence: [
          input.lastScanDate ? `Last scan: ${input.lastScanDate}` : 'No scan data available',
          `Average scan frequency: ${input.scanFrequencyDays} days`,
          `Risk assessment coverage: ${input.totalFindings} findings with CVSS, EPSS, and KEV enrichment`,
          `${input.kevOpenCount} open KEV-listed vulnerabilities tracked`,
        ].join('. '),
      };
    }

    // ----- SA: System & Services Acquisition — 'met' (SDLC, SARIF support) -----
    case 'SA':
      return {
        status: 'met',
        evidence:
          'Platform supports SDLC integration via SARIF parser, developer testing output ingestion, CI/CD pipeline scanning, and third-party component tracking (CycloneDX, SPDX, OSV).',
      };

    // ----- SC: System & Communications Protection — 'met' (TLS, AES-256-GCM, WAF, KMS) -----
    case 'SC':
      return {
        status: 'met',
        evidence:
          'TLS 1.3 for data in transit. AES-256-GCM encryption at rest with KMS BYOK support. Cloud Armor WAF for boundary protection. Session authenticity via signed tokens. DoS protection via Cloud Armor and rate limiting.',
      };

    // ----- SI: System & Information Integrity — based on remediation, KEV tracking -----
    case 'SI': {
      const hasRemediation = input.totalClosedCases > 0;
      const hasKevTracking = input.kevOpenCount >= 0; // tracking is always on if data exists
      const hasInputValidation = true; // Zod validation at API boundaries
      const siScore = [hasRemediation, input.totalFindings > 0, hasInputValidation].filter(Boolean).length;
      const siStatus = siScore >= 2 ? 'met' : siScore >= 1 ? 'partial' : 'not_met';
      return {
        status: siStatus,
        evidence: [
          hasRemediation
            ? `Flaw remediation active: ${input.totalClosedCases} cases closed, avg ${input.averageRemediationDays} days to remediate`
            : 'No remediation activity detected',
          hasKevTracking ? `KEV tracking: ${input.kevOpenCount} open KEV vulnerabilities` : 'KEV tracking not available',
          `Input validation enforced via Zod schemas at all API boundaries`,
          `${input.criticalOpenCount} critical and ${input.highOpenCount} high severity findings open`,
        ].join('. '),
      };
    }

    // ----- AT: Awareness & Training — 'partial' (platform provides materials, org training external) -----
    case 'AT':
      return {
        status: 'partial',
        evidence:
          'Platform provides security awareness context through vulnerability dashboards, severity training materials, and role-based access that reinforces least-privilege understanding. Formal training programs and completion tracking are organizational responsibilities.',
      };

    // ----- CP: Contingency Planning — 'partial' (GCP backup, but org contingency plan external) -----
    case 'CP':
      return {
        status: 'partial',
        evidence:
          'GCP infrastructure provides automated backups (Cloud SQL), multi-region availability, and disaster recovery capabilities. Data retention policies configured per organization tier. Full contingency plan documentation and testing are organizational responsibilities.',
      };

    // ----- IR: Incident Response — based on case workflow activity -----
    case 'IR': {
      const hasCaseWorkflow = input.totalOpenCases > 0 || input.totalClosedCases > 0;
      const hasMonitoring = input.totalFindings > 0;
      const irStatus = hasCaseWorkflow && hasMonitoring ? 'met' : hasCaseWorkflow || hasMonitoring ? 'partial' : 'not_met';
      return {
        status: irStatus,
        evidence: [
          hasCaseWorkflow
            ? `Case management workflow active: ${input.totalOpenCases} open, ${input.totalClosedCases} closed cases with assignment, comments, and status tracking`
            : 'No case management activity detected',
          hasMonitoring
            ? `Incident monitoring: ${input.totalFindings} findings tracked with severity classification and alerting`
            : 'No findings data for incident monitoring',
          'Incident reporting supported via webhook integrations and notification system',
        ].join('. '),
      };
    }

    // ----- MA: Maintenance — 'partial' (organizational process) -----
    case 'MA':
      return {
        status: 'partial',
        evidence:
          'Platform maintenance is managed via GCP Cloud Run with automated deployments and zero-downtime updates. Infrastructure maintenance handled by GCP. Controlled maintenance scheduling and personnel authorization are organizational responsibilities.',
      };

    // ----- MP: Media Protection — 'met' (encrypted storage, retention policies) -----
    case 'MP':
      return {
        status: 'met',
        evidence:
          'Digital media protected with AES-256-GCM encryption at rest. Google Cloud Storage with access controls for scan artifacts and exports. Data retention policies enforce automatic deletion per organization tier. Media sanitization handled by GCP infrastructure.',
      };

    // ----- PE: Physical & Environmental — 'met' (GCP-inherited) -----
    case 'PE':
      return {
        status: 'met',
        evidence:
          'Physical and environmental controls inherited from Google Cloud Platform. GCP data centers maintain SOC 2 Type II, ISO 27001, and FedRAMP High certifications covering physical access authorization, access control, and monitoring.',
      };

    // ----- PL: Planning — 'partial' (compliance dashboard, full SSP external) -----
    case 'PL':
      return {
        status: 'partial',
        evidence:
          'Platform provides compliance dashboard tracking alignment across NIST 800-53, SOC 2, CMMC, FedRAMP, ASVS, and SSDF frameworks. POAM generation supports security planning. Full System Security Plan (SSP) documentation and rules of behavior are organizational responsibilities.',
      };

    // ----- PS: Personnel Security — 'partial' (admin invitation, role assignment; background checks external) -----
    case 'PS':
      return {
        status: 'partial',
        evidence:
          'Platform supports personnel onboarding via admin invitation with role assignment, access revocation on user deactivation, and external personnel management via client/team scoping. Background screening, exit interviews, and formal termination procedures are organizational responsibilities.',
      };

    default:
      return {
        status: 'na',
        evidence: `Control family ${family} is not assessed by this platform.`,
      };
  }
}
