/**
 * Cross-Framework CWE Mapping Engine
 *
 * Extends the existing NIST 800-53 CWE mapping to bridge across CMMC, SOC2,
 * FedRAMP, and ASVS frameworks.  The NIST 800-53 control catalog acts as the
 * canonical hub: CWE -> NIST 800-53 control -> equivalent controls in other
 * frameworks.
 */

import type { CanonicalFinding } from '../../parsers/types.js';
import { mapFindingToControls, NIST_CONTROLS_BY_ID } from './nist-800-53.js';
import type { NistControl } from './nist-800-53.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrossFrameworkMapping {
  cweId: string;
  nistControlId: string;
  nistControlTitle: string;
  mappedControls: FrameworkControlRef[];
}

export interface FrameworkControlRef {
  frameworkId: string;
  frameworkName: string;
  controlId: string;
  controlTitle: string;
}

export interface ComplianceImpactEntry {
  framework: string;
  controlId: string;
  controlTitle: string;
  affectedBy: string[]; // CWE IDs
}

export interface ComplianceImpactReport {
  entries: ComplianceImpactEntry[];
  frameworkSummary: FrameworkImpactSummary[];
  totalAffectedControls: number;
  severityDistribution: Record<string, number>;
}

export interface FrameworkImpactSummary {
  frameworkId: string;
  frameworkName: string;
  affectedControlCount: number;
  affectedControlIds: string[];
}

// ---------------------------------------------------------------------------
// NIST 800-53 to Cross-Framework Bridge Table
//
// Maps ~30 key NIST 800-53 controls to their equivalents in CMMC Level 2,
// SOC 2 Type II, FedRAMP Moderate, and OWASP ASVS.
// ---------------------------------------------------------------------------

interface BridgeEntry {
  cmmc?: { id: string; title: string };
  soc2?: { id: string; title: string };
  fedramp?: { id: string; title: string };
  asvs?: { id: string; title: string };
}

const NIST_TO_FRAMEWORK_BRIDGE: Record<string, BridgeEntry> = {
  // Access Control family
  'AC-3': {
    cmmc: { id: 'AC.L2-3.1.2', title: 'Transaction & Function Control' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'AC-3', title: 'Access Enforcement' },
    asvs: { id: 'V1.2', title: 'Authentication Architecture' },
  },
  'AC-4': {
    cmmc: { id: 'SC.L2-3.13.1', title: 'Boundary Protection' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'SC-7', title: 'Boundary Protection' },
  },
  'AC-6': {
    cmmc: { id: 'AC.L2-3.1.5', title: 'Least Privilege' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'AC-6', title: 'Least Privilege' },
  },
  'AC-7': {
    cmmc: { id: 'IA.L2-3.5.2', title: 'Authentication' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'IA-2', title: 'Identification and Authentication (Organizational Users)' },
    asvs: { id: 'V1.2', title: 'Authentication Architecture' },
  },
  'AC-10': {
    cmmc: { id: 'AC.L2-3.1.1', title: 'Authorized Access Control' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'AC-2', title: 'Account Management' },
  },
  'AC-12': {
    cmmc: { id: 'AC.L2-3.1.1', title: 'Authorized Access Control' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'AC-2', title: 'Account Management' },
  },
  'AC-17': {
    cmmc: { id: 'AC.L2-3.1.1', title: 'Authorized Access Control' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'AC-2', title: 'Account Management' },
  },

  // Audit & Accountability family
  'AU-2': {
    cmmc: { id: 'AU.L2-3.3.1', title: 'System Auditing' },
    soc2: { id: 'CC7.2', title: 'Incident and Change Management' },
    fedramp: { id: 'AU-2', title: 'Event Logging' },
  },
  'AU-3': {
    cmmc: { id: 'AU.L2-3.3.1', title: 'System Auditing' },
    soc2: { id: 'CC7.2', title: 'Incident and Change Management' },
    fedramp: { id: 'AU-3', title: 'Content of Audit Records' },
  },
  'AU-6': {
    cmmc: { id: 'AU.L2-3.3.1', title: 'System Auditing' },
    soc2: { id: 'CC7.2', title: 'Incident and Change Management' },
    fedramp: { id: 'AU-6', title: 'Audit Record Review, Analysis, and Reporting' },
  },
  'AU-9': {
    cmmc: { id: 'AU.L2-3.3.1', title: 'System Auditing' },
    soc2: { id: 'CC7.2', title: 'Incident and Change Management' },
    fedramp: { id: 'AU-2', title: 'Event Logging' },
  },
  'AU-12': {
    cmmc: { id: 'AU.L2-3.3.1', title: 'System Auditing' },
    fedramp: { id: 'AU-2', title: 'Event Logging' },
  },

  // Configuration Management family
  'CM-2': {
    cmmc: { id: 'CM.L2-3.4.1', title: 'System Baselining' },
    soc2: { id: 'CC8.1', title: 'Change Management' },
    fedramp: { id: 'CM-2', title: 'Baseline Configuration' },
    asvs: { id: 'V14.2', title: 'Dependency Security' },
  },
  'CM-6': {
    cmmc: { id: 'CM.L2-3.4.2', title: 'Security Configuration Enforcement' },
    soc2: { id: 'CC8.1', title: 'Change Management' },
    fedramp: { id: 'CM-6', title: 'Configuration Settings' },
    asvs: { id: 'V14.2', title: 'Dependency Security' },
  },
  'CM-7': {
    cmmc: { id: 'CM.L2-3.4.2', title: 'Security Configuration Enforcement' },
    soc2: { id: 'CC6.8', title: 'Vulnerability Management' },
    fedramp: { id: 'CM-6', title: 'Configuration Settings' },
  },
  'CM-8': {
    cmmc: { id: 'CM.L2-3.4.1', title: 'System Baselining' },
    soc2: { id: 'CC8.1', title: 'Change Management' },
    fedramp: { id: 'CM-8', title: 'System Component Inventory' },
    asvs: { id: 'V14.2', title: 'Dependency Security' },
  },

  // Identification & Authentication family
  'IA-2': {
    cmmc: { id: 'IA.L2-3.5.2', title: 'Authentication' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'IA-2', title: 'Identification and Authentication (Organizational Users)' },
    asvs: { id: 'V1.2', title: 'Authentication Architecture' },
  },
  'IA-5': {
    cmmc: { id: 'IA.L2-3.5.3', title: 'Multifactor Authentication' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'IA-5', title: 'Authenticator Management' },
    asvs: { id: 'V1.2', title: 'Authentication Architecture' },
  },
  'IA-6': {
    cmmc: { id: 'IA.L2-3.5.2', title: 'Authentication' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'IA-2', title: 'Identification and Authentication (Organizational Users)' },
  },
  'IA-8': {
    cmmc: { id: 'IA.L2-3.5.1', title: 'Identification' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'IA-2', title: 'Identification and Authentication (Organizational Users)' },
  },

  // Risk Assessment family
  'RA-3': {
    cmmc: { id: 'RM.L2-3.11.1', title: 'Risk Assessments' },
    soc2: { id: 'CC7.3', title: 'Evaluation of Security Events' },
    fedramp: { id: 'RA-3', title: 'Risk Assessment' },
  },
  'RA-5': {
    cmmc: { id: 'RM.L2-3.11.2', title: 'Vulnerability Scanning' },
    soc2: { id: 'CC6.8', title: 'Vulnerability Management' },
    fedramp: { id: 'RA-5', title: 'Vulnerability Monitoring and Scanning' },
    asvs: { id: 'V14.2', title: 'Dependency Security' },
  },
  'RA-7': {
    cmmc: { id: 'RM.L2-3.11.3', title: 'Vulnerability Remediation' },
    soc2: { id: 'CC7.3', title: 'Evaluation of Security Events' },
    fedramp: { id: 'RA-7', title: 'Risk Response' },
  },

  // System & Services Acquisition family
  'SA-10': {
    cmmc: { id: 'CM.L2-3.4.2', title: 'Security Configuration Enforcement' },
    soc2: { id: 'CC8.1', title: 'Change Management' },
    fedramp: { id: 'SA-11', title: 'Developer Testing and Evaluation' },
    asvs: { id: 'V1.1', title: 'Secure Software Development Lifecycle' },
  },
  'SA-11': {
    cmmc: { id: 'CA.L2-3.12.1', title: 'Security Control Assessment' },
    soc2: { id: 'CC8.1', title: 'Change Management' },
    fedramp: { id: 'SA-11', title: 'Developer Testing and Evaluation' },
    asvs: { id: 'V1.1', title: 'Secure Software Development Lifecycle' },
  },
  'SA-15': {
    cmmc: { id: 'CA.L2-3.12.1', title: 'Security Control Assessment' },
    soc2: { id: 'CC8.1', title: 'Change Management' },
    fedramp: { id: 'SA-11', title: 'Developer Testing and Evaluation' },
    asvs: { id: 'V1.1', title: 'Secure Software Development Lifecycle' },
  },

  // System & Communications Protection family
  'SC-5': {
    cmmc: { id: 'SC.L2-3.13.1', title: 'Boundary Protection' },
    soc2: { id: 'CC6.8', title: 'Vulnerability Management' },
    fedramp: { id: 'SC-7', title: 'Boundary Protection' },
  },
  'SC-7': {
    cmmc: { id: 'SC.L2-3.13.1', title: 'Boundary Protection' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'SC-7', title: 'Boundary Protection' },
  },
  'SC-8': {
    cmmc: { id: 'SC.L2-3.13.8', title: 'CUI Encryption in Transit' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'SC-8', title: 'Transmission Confidentiality and Integrity' },
    asvs: { id: 'V9.1', title: 'Client Communication Security' },
  },
  'SC-12': {
    cmmc: { id: 'SC.L2-3.13.11', title: 'CUI Encryption at Rest' },
    fedramp: { id: 'SC-12', title: 'Cryptographic Key Establishment and Management' },
  },
  'SC-13': {
    cmmc: { id: 'SC.L2-3.13.11', title: 'CUI Encryption at Rest' },
    fedramp: { id: 'SC-12', title: 'Cryptographic Key Establishment and Management' },
    asvs: { id: 'V9.1', title: 'Client Communication Security' },
  },
  'SC-18': {
    cmmc: { id: 'SI.L2-3.14.2', title: 'Malicious Code Protection' },
    soc2: { id: 'CC6.8', title: 'Vulnerability Management' },
    fedramp: { id: 'SI-3', title: 'Malicious Code Protection' },
    asvs: { id: 'V5.1', title: 'Input Validation' },
  },
  'SC-23': {
    cmmc: { id: 'IA.L2-3.5.2', title: 'Authentication' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'IA-2', title: 'Identification and Authentication (Organizational Users)' },
    asvs: { id: 'V1.2', title: 'Authentication Architecture' },
  },
  'SC-28': {
    cmmc: { id: 'SC.L2-3.13.11', title: 'CUI Encryption at Rest' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'SC-28', title: 'Protection of Information at Rest' },
  },

  // System & Information Integrity family
  'SI-2': {
    cmmc: { id: 'SI.L2-3.14.1', title: 'Flaw Remediation' },
    soc2: { id: 'CC6.8', title: 'Vulnerability Management' },
    fedramp: { id: 'SI-2', title: 'Flaw Remediation' },
    asvs: { id: 'V1.1', title: 'Secure Software Development Lifecycle' },
  },
  'SI-3': {
    cmmc: { id: 'SI.L2-3.14.2', title: 'Malicious Code Protection' },
    soc2: { id: 'CC6.8', title: 'Vulnerability Management' },
    fedramp: { id: 'SI-3', title: 'Malicious Code Protection' },
    asvs: { id: 'V10.3', title: 'Dependency Management' },
  },
  'SI-4': {
    cmmc: { id: 'SI.L2-3.14.6', title: 'Monitor Communications for Attacks' },
    soc2: { id: 'CC7.1', title: 'Monitoring Activities' },
    fedramp: { id: 'SI-4', title: 'System Monitoring' },
  },
  'SI-5': {
    cmmc: { id: 'SI.L2-3.14.3', title: 'Security Alerts & Advisories' },
    soc2: { id: 'CC7.1', title: 'Monitoring Activities' },
    fedramp: { id: 'SI-5', title: 'Security Alerts, Advisories, and Directives' },
  },
  'SI-7': {
    cmmc: { id: 'SI.L2-3.14.2', title: 'Malicious Code Protection' },
    soc2: { id: 'CC7.1', title: 'Monitoring Activities' },
    fedramp: { id: 'SI-3', title: 'Malicious Code Protection' },
    asvs: { id: 'V10.3', title: 'Dependency Management' },
  },
  'SI-10': {
    cmmc: { id: 'SI.L2-3.14.1', title: 'Flaw Remediation' },
    soc2: { id: 'CC6.8', title: 'Vulnerability Management' },
    fedramp: { id: 'SI-2', title: 'Flaw Remediation' },
    asvs: { id: 'V5.1', title: 'Input Validation' },
  },
  'SI-11': {
    cmmc: { id: 'SI.L2-3.14.1', title: 'Flaw Remediation' },
    soc2: { id: 'CC7.2', title: 'Incident and Change Management' },
    fedramp: { id: 'SI-2', title: 'Flaw Remediation' },
  },
  'SI-16': {
    cmmc: { id: 'SI.L2-3.14.1', title: 'Flaw Remediation' },
    soc2: { id: 'CC6.8', title: 'Vulnerability Management' },
    fedramp: { id: 'SI-2', title: 'Flaw Remediation' },
  },
};

// ---------------------------------------------------------------------------
// Framework ID constants
// ---------------------------------------------------------------------------

const FRAMEWORK_META: Record<string, string> = {
  'nist-800-53': 'NIST 800-53',
  'cmmc-level2': 'CMMC Level 2',
  'soc2-type2': 'SOC 2 Type II',
  'fedramp-moderate': 'FedRAMP Moderate',
  'owasp-asvs': 'OWASP ASVS',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Map a single CWE to controls across all supported frameworks.
 * Uses NIST 800-53 as the bridge: CWE -> NIST control -> framework controls.
 *
 * Accepts formats: "CWE-79", "79", "cwe-79"
 */
export function mapCweToAllFrameworks(cweId: string): CrossFrameworkMapping[] {
  const nistControlIds = mapFindingToControls(cweId);
  if (nistControlIds.length === 0) return [];

  const normalizedCwe = cweId.replace(/^cwe-/i, '');
  const mappings: CrossFrameworkMapping[] = [];

  for (const nistId of nistControlIds) {
    const nistControl: NistControl | undefined = NIST_CONTROLS_BY_ID[nistId];
    if (!nistControl) continue;

    const bridge = NIST_TO_FRAMEWORK_BRIDGE[nistId];
    const mappedControls: FrameworkControlRef[] = [];

    // Always include the NIST 800-53 control itself
    mappedControls.push({
      frameworkId: 'nist-800-53',
      frameworkName: 'NIST 800-53',
      controlId: nistId,
      controlTitle: nistControl.title,
    });

    // Add bridged framework controls
    if (bridge) {
      if (bridge.cmmc) {
        mappedControls.push({
          frameworkId: 'cmmc-level2',
          frameworkName: 'CMMC Level 2',
          controlId: bridge.cmmc.id,
          controlTitle: bridge.cmmc.title,
        });
      }
      if (bridge.soc2) {
        mappedControls.push({
          frameworkId: 'soc2-type2',
          frameworkName: 'SOC 2 Type II',
          controlId: bridge.soc2.id,
          controlTitle: bridge.soc2.title,
        });
      }
      if (bridge.fedramp) {
        mappedControls.push({
          frameworkId: 'fedramp-moderate',
          frameworkName: 'FedRAMP Moderate',
          controlId: bridge.fedramp.id,
          controlTitle: bridge.fedramp.title,
        });
      }
      if (bridge.asvs) {
        mappedControls.push({
          frameworkId: 'owasp-asvs',
          frameworkName: 'OWASP ASVS',
          controlId: bridge.asvs.id,
          controlTitle: bridge.asvs.title,
        });
      }
    }

    mappings.push({
      cweId: normalizedCwe,
      nistControlId: nistId,
      nistControlTitle: nistControl.title,
      mappedControls,
    });
  }

  return mappings;
}

/**
 * Map an array of CanonicalFindings to a ComplianceImpactReport showing
 * which controls across which frameworks are affected by the findings.
 *
 * @param findings  Array of parsed scan findings
 * @param frameworks  Optional list of framework IDs to filter results
 *                    (e.g., ['nist-800-53', 'cmmc-level2']).  Defaults to all.
 */
export function mapFindingsToComplianceImpact(
  findings: CanonicalFinding[],
  frameworks?: string[],
): ComplianceImpactReport {
  const allowedFrameworks = frameworks && frameworks.length > 0
    ? new Set(frameworks)
    : null;

  // Collect all unique CWE IDs from findings
  const cweSet = new Set<string>();
  const severityCounts: Record<string, number> = {};

  for (const finding of findings) {
    const sev = finding.severity ?? 'INFO';
    severityCounts[sev] = (severityCounts[sev] ?? 0) + 1;

    for (const cwe of finding.cweIds) {
      cweSet.add(cwe.replace(/^cwe-/i, ''));
    }
  }

  // Build a map of (frameworkId:controlId) -> ComplianceImpactEntry
  const impactMap = new Map<string, ComplianceImpactEntry>();

  for (const cwe of cweSet) {
    const crossMappings = mapCweToAllFrameworks(cwe);

    for (const mapping of crossMappings) {
      for (const ctrl of mapping.mappedControls) {
        if (allowedFrameworks && !allowedFrameworks.has(ctrl.frameworkId)) {
          continue;
        }

        const key = `${ctrl.frameworkId}:${ctrl.controlId}`;
        const existing = impactMap.get(key);

        if (existing) {
          if (!existing.affectedBy.includes(`CWE-${cwe}`)) {
            existing.affectedBy.push(`CWE-${cwe}`);
          }
        } else {
          impactMap.set(key, {
            framework: ctrl.frameworkName,
            controlId: ctrl.controlId,
            controlTitle: ctrl.controlTitle,
            affectedBy: [`CWE-${cwe}`],
          });
        }
      }
    }
  }

  const entries = Array.from(impactMap.values());

  // Build per-framework summary
  const frameworkMap = new Map<string, FrameworkImpactSummary>();

  for (const entry of entries) {
    // Reverse-lookup framework ID from name
    const fwId = Object.entries(FRAMEWORK_META)
      .find(([, name]) => name === entry.framework)?.[0] ?? entry.framework;

    const existing = frameworkMap.get(fwId);
    if (existing) {
      existing.affectedControlCount += 1;
      existing.affectedControlIds.push(entry.controlId);
    } else {
      frameworkMap.set(fwId, {
        frameworkId: fwId,
        frameworkName: entry.framework,
        affectedControlCount: 1,
        affectedControlIds: [entry.controlId],
      });
    }
  }

  return {
    entries,
    frameworkSummary: Array.from(frameworkMap.values()),
    totalAffectedControls: entries.length,
    severityDistribution: severityCounts,
  };
}

/**
 * Get the list of all supported framework IDs and their display names.
 */
export function getSupportedFrameworks(): { id: string; name: string }[] {
  return Object.entries(FRAMEWORK_META).map(([id, name]) => ({ id, name }));
}
