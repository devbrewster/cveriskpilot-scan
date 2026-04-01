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
  gdpr?: { id: string; title: string };
  hipaa?: { id: string; title: string };
  pciDss?: { id: string; title: string };
  iso27001?: { id: string; title: string };
  nistCsf?: { id: string; title: string };
  euCra?: { id: string; title: string };
  nis2?: { id: string; title: string };
}

const NIST_TO_FRAMEWORK_BRIDGE: Record<string, BridgeEntry> = {
  // Access Control family
  'AC-3': {
    cmmc: { id: 'AC.L2-3.1.2', title: 'Transaction & Function Control' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'AC-3', title: 'Access Enforcement' },
    asvs: { id: 'V1.2', title: 'Authentication Architecture' },
    gdpr: { id: 'Art.25', title: 'Data Protection by Design and by Default' },
    hipaa: { id: '164.312(a)', title: 'Access Control' },
    pciDss: { id: 'Req-7.2', title: 'Access to System Components Appropriately Defined' },
    iso27001: { id: 'A.8.3', title: 'Information Access Restriction' },
    nistCsf: { id: 'PR.AA', title: 'Identity Management, Authentication, and Access Control' },
    euCra: { id: 'CRA-3', title: 'Protection Against Unauthorized Access' },
    nis2: { id: 'NIS2-21.2i', title: 'Human Resources Security and Access Control' },
  },
  'AC-4': {
    cmmc: { id: 'SC.L2-3.13.1', title: 'Boundary Protection' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'SC-7', title: 'Boundary Protection' },
    gdpr: { id: 'Art.25', title: 'Data Protection by Design and by Default' },
    hipaa: { id: '164.312(a)', title: 'Access Control' },
    iso27001: { id: 'A.8.20', title: 'Network Security' },
  },
  'AC-6': {
    cmmc: { id: 'AC.L2-3.1.5', title: 'Least Privilege' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'AC-6', title: 'Least Privilege' },
    gdpr: { id: 'Art.25', title: 'Data Protection by Design and by Default' },
    hipaa: { id: '164.312(a)', title: 'Access Control' },
    pciDss: { id: 'Req-7.2', title: 'Access to System Components Appropriately Defined' },
    iso27001: { id: 'A.8.3', title: 'Information Access Restriction' },
    nistCsf: { id: 'PR.AA', title: 'Identity Management, Authentication, and Access Control' },
    euCra: { id: 'CRA-3', title: 'Protection Against Unauthorized Access' },
  },
  'AC-7': {
    cmmc: { id: 'IA.L2-3.5.2', title: 'Authentication' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'IA-2', title: 'Identification and Authentication (Organizational Users)' },
    asvs: { id: 'V1.2', title: 'Authentication Architecture' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.312(d)', title: 'Person or Entity Authentication' },
    pciDss: { id: 'Req-8.3', title: 'Strong Authentication Established' },
    iso27001: { id: 'A.8.5', title: 'Secure Authentication' },
  },
  'AC-10': {
    cmmc: { id: 'AC.L2-3.1.1', title: 'Authorized Access Control' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'AC-2', title: 'Account Management' },
    hipaa: { id: '164.312(a)', title: 'Access Control' },
    pciDss: { id: 'Req-7.2', title: 'Access to System Components Appropriately Defined' },
  },
  'AC-12': {
    cmmc: { id: 'AC.L2-3.1.1', title: 'Authorized Access Control' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'AC-2', title: 'Account Management' },
    hipaa: { id: '164.312(a)', title: 'Access Control' },
    pciDss: { id: 'Req-8.6', title: 'Use of Application and System Accounts Managed' },
  },
  'AC-17': {
    cmmc: { id: 'AC.L2-3.1.1', title: 'Authorized Access Control' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'AC-2', title: 'Account Management' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.312(a)', title: 'Access Control' },
    pciDss: { id: 'Req-7.2', title: 'Access to System Components Appropriately Defined' },
    iso27001: { id: 'A.8.20', title: 'Network Security' },
  },

  // Audit & Accountability family
  'AU-2': {
    cmmc: { id: 'AU.L2-3.3.1', title: 'System Auditing' },
    soc2: { id: 'CC7.2', title: 'Incident and Change Management' },
    fedramp: { id: 'AU-2', title: 'Event Logging' },
    gdpr: { id: 'Art.30', title: 'Records of Processing Activities' },
    hipaa: { id: '164.312(b)', title: 'Audit Controls' },
    pciDss: { id: 'Req-10.2', title: 'Audit Logs Implemented to Support Detection' },
    iso27001: { id: 'A.8.15', title: 'Logging' },
  },
  'AU-3': {
    cmmc: { id: 'AU.L2-3.3.1', title: 'System Auditing' },
    soc2: { id: 'CC7.2', title: 'Incident and Change Management' },
    fedramp: { id: 'AU-3', title: 'Content of Audit Records' },
    gdpr: { id: 'Art.30', title: 'Records of Processing Activities' },
    hipaa: { id: '164.312(b)', title: 'Audit Controls' },
    pciDss: { id: 'Req-10.2', title: 'Audit Logs Implemented to Support Detection' },
    iso27001: { id: 'A.8.15', title: 'Logging' },
  },
  'AU-6': {
    cmmc: { id: 'AU.L2-3.3.1', title: 'System Auditing' },
    soc2: { id: 'CC7.2', title: 'Incident and Change Management' },
    fedramp: { id: 'AU-6', title: 'Audit Record Review, Analysis, and Reporting' },
    gdpr: { id: 'Art.30', title: 'Records of Processing Activities' },
    hipaa: { id: '164.312(b)', title: 'Audit Controls' },
    pciDss: { id: 'Req-10.7', title: 'Failures of Critical Security Control Systems Detected and Addressed' },
    iso27001: { id: 'A.8.15', title: 'Logging' },
  },
  'AU-9': {
    cmmc: { id: 'AU.L2-3.3.1', title: 'System Auditing' },
    soc2: { id: 'CC7.2', title: 'Incident and Change Management' },
    fedramp: { id: 'AU-2', title: 'Event Logging' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.312(b)', title: 'Audit Controls' },
    pciDss: { id: 'Req-10.3', title: 'Audit Logs Protected from Destruction and Tampering' },
    iso27001: { id: 'A.8.15', title: 'Logging' },
  },
  'AU-12': {
    cmmc: { id: 'AU.L2-3.3.1', title: 'System Auditing' },
    fedramp: { id: 'AU-2', title: 'Event Logging' },
    gdpr: { id: 'Art.30', title: 'Records of Processing Activities' },
    hipaa: { id: '164.312(b)', title: 'Audit Controls' },
    pciDss: { id: 'Req-10.2', title: 'Audit Logs Implemented to Support Detection' },
    iso27001: { id: 'A.8.15', title: 'Logging' },
  },

  // Configuration Management family
  'CM-2': {
    cmmc: { id: 'CM.L2-3.4.1', title: 'System Baselining' },
    soc2: { id: 'CC8.1', title: 'Change Management' },
    fedramp: { id: 'CM-2', title: 'Baseline Configuration' },
    asvs: { id: 'V14.2', title: 'Dependency Security' },
    gdpr: { id: 'Art.25', title: 'Data Protection by Design and by Default' },
    hipaa: { id: '164.308(a)(1)', title: 'Security Management Process' },
    pciDss: { id: 'Req-2.2', title: 'System Components Configured and Managed Securely' },
    iso27001: { id: 'A.8.9', title: 'Configuration Management' },
  },
  'CM-6': {
    cmmc: { id: 'CM.L2-3.4.2', title: 'Security Configuration Enforcement' },
    soc2: { id: 'CC8.1', title: 'Change Management' },
    fedramp: { id: 'CM-6', title: 'Configuration Settings' },
    asvs: { id: 'V14.2', title: 'Dependency Security' },
    gdpr: { id: 'Art.25', title: 'Data Protection by Design and by Default' },
    hipaa: { id: '164.308(a)(1)', title: 'Security Management Process' },
    pciDss: { id: 'Req-2.2', title: 'System Components Configured and Managed Securely' },
    iso27001: { id: 'A.8.9', title: 'Configuration Management' },
  },
  'CM-7': {
    cmmc: { id: 'CM.L2-3.4.2', title: 'Security Configuration Enforcement' },
    soc2: { id: 'CC6.8', title: 'Vulnerability Management' },
    fedramp: { id: 'CM-6', title: 'Configuration Settings' },
    gdpr: { id: 'Art.25', title: 'Data Protection by Design and by Default' },
    hipaa: { id: '164.308(a)(1)', title: 'Security Management Process' },
    pciDss: { id: 'Req-2.2', title: 'System Components Configured and Managed Securely' },
    iso27001: { id: 'A.8.9', title: 'Configuration Management' },
  },
  'CM-8': {
    cmmc: { id: 'CM.L2-3.4.1', title: 'System Baselining' },
    soc2: { id: 'CC8.1', title: 'Change Management' },
    fedramp: { id: 'CM-8', title: 'System Component Inventory' },
    asvs: { id: 'V14.2', title: 'Dependency Security' },
    gdpr: { id: 'Art.30', title: 'Records of Processing Activities' },
    hipaa: { id: '164.308(a)(1)', title: 'Security Management Process' },
    pciDss: { id: 'Req-12.5', title: 'PCI DSS Scope Documented and Validated' },
    iso27001: { id: 'A.8.9', title: 'Configuration Management' },
    nistCsf: { id: 'ID.AM', title: 'Asset Management' },
    euCra: { id: 'CRA-11', title: 'Software Bill of Materials' },
    nis2: { id: 'NIS2-21.2e', title: 'Security in Network and Information Systems Acquisition' },
  },

  // Identification & Authentication family
  'IA-2': {
    cmmc: { id: 'IA.L2-3.5.2', title: 'Authentication' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'IA-2', title: 'Identification and Authentication (Organizational Users)' },
    asvs: { id: 'V1.2', title: 'Authentication Architecture' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.312(d)', title: 'Person or Entity Authentication' },
    pciDss: { id: 'Req-8.3', title: 'Strong Authentication Established' },
    iso27001: { id: 'A.8.5', title: 'Secure Authentication' },
    nistCsf: { id: 'PR.AA', title: 'Identity Management, Authentication, and Access Control' },
    nis2: { id: 'NIS2-21.2j', title: 'Multi-Factor Authentication and Secure Communication' },
  },
  'IA-5': {
    cmmc: { id: 'IA.L2-3.5.3', title: 'Multifactor Authentication' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'IA-5', title: 'Authenticator Management' },
    asvs: { id: 'V1.2', title: 'Authentication Architecture' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.312(d)', title: 'Person or Entity Authentication' },
    pciDss: { id: 'Req-8.3', title: 'Strong Authentication Established' },
    iso27001: { id: 'A.8.5', title: 'Secure Authentication' },
  },
  'IA-6': {
    cmmc: { id: 'IA.L2-3.5.2', title: 'Authentication' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'IA-2', title: 'Identification and Authentication (Organizational Users)' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.312(d)', title: 'Person or Entity Authentication' },
    pciDss: { id: 'Req-8.3', title: 'Strong Authentication Established' },
    iso27001: { id: 'A.8.5', title: 'Secure Authentication' },
  },
  'IA-8': {
    cmmc: { id: 'IA.L2-3.5.1', title: 'Identification' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'IA-2', title: 'Identification and Authentication (Organizational Users)' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.312(d)', title: 'Person or Entity Authentication' },
    pciDss: { id: 'Req-8.3', title: 'Strong Authentication Established' },
    iso27001: { id: 'A.8.5', title: 'Secure Authentication' },
  },

  // Risk Assessment family
  'RA-3': {
    cmmc: { id: 'RA.L2-3.11.1', title: 'Risk Assessments' },
    soc2: { id: 'CC7.3', title: 'Evaluation of Security Events' },
    fedramp: { id: 'RA-3', title: 'Risk Assessment' },
    gdpr: { id: 'Art.35', title: 'Data Protection Impact Assessment' },
    hipaa: { id: '164.308(a)(1)', title: 'Security Management Process' },
    pciDss: { id: 'Req-12.3', title: 'Risks to Cardholder Data Environment Formally Identified' },
    iso27001: { id: 'A.8.8', title: 'Management of Technical Vulnerabilities' },
  },
  'RA-5': {
    cmmc: { id: 'RA.L2-3.11.2', title: 'Vulnerability Scanning' },
    soc2: { id: 'CC6.8', title: 'Vulnerability Management' },
    fedramp: { id: 'RA-5', title: 'Vulnerability Monitoring and Scanning' },
    asvs: { id: 'V14.2', title: 'Dependency Security' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.308(a)(1)', title: 'Security Management Process' },
    pciDss: { id: 'Req-11.3', title: 'External/Internal Vulnerabilities Regularly Identified' },
    iso27001: { id: 'A.8.8', title: 'Management of Technical Vulnerabilities' },
    nistCsf: { id: 'ID.RA', title: 'Risk Assessment' },
    euCra: { id: 'CRA-10', title: 'Vulnerability Handling' },
    nis2: { id: 'NIS2-21.2k', title: 'Vulnerability Handling and Disclosure' },
  },
  'RA-7': {
    cmmc: { id: 'RA.L2-3.11.3', title: 'Vulnerability Remediation' },
    soc2: { id: 'CC7.3', title: 'Evaluation of Security Events' },
    fedramp: { id: 'RA-7', title: 'Risk Response' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.308(a)(6)', title: 'Security Incident Procedures' },
    pciDss: { id: 'Req-6.3', title: 'Security Vulnerabilities Identified and Addressed' },
    iso27001: { id: 'A.8.8', title: 'Management of Technical Vulnerabilities' },
  },

  // System & Services Acquisition family
  'SA-10': {
    cmmc: { id: 'CM.L2-3.4.2', title: 'Security Configuration Enforcement' },
    soc2: { id: 'CC8.1', title: 'Change Management' },
    fedramp: { id: 'SA-11', title: 'Developer Testing and Evaluation' },
    asvs: { id: 'V1.1', title: 'Secure Software Development Lifecycle' },
    gdpr: { id: 'Art.25', title: 'Data Protection by Design and by Default' },
    hipaa: { id: '164.308(a)(8)', title: 'Evaluation' },
    pciDss: { id: 'Req-6.2', title: 'Bespoke and Custom Software Developed Securely' },
    iso27001: { id: 'A.8.25', title: 'Secure Development Lifecycle' },
  },
  'SA-11': {
    cmmc: { id: 'CA.L2-3.12.1', title: 'Security Control Assessment' },
    soc2: { id: 'CC8.1', title: 'Change Management' },
    fedramp: { id: 'SA-11', title: 'Developer Testing and Evaluation' },
    asvs: { id: 'V1.1', title: 'Secure Software Development Lifecycle' },
    gdpr: { id: 'Art.25', title: 'Data Protection by Design and by Default' },
    hipaa: { id: '164.308(a)(8)', title: 'Evaluation' },
    pciDss: { id: 'Req-6.2', title: 'Bespoke and Custom Software Developed Securely' },
    iso27001: { id: 'A.8.25', title: 'Secure Development Lifecycle' },
  },
  'SA-15': {
    cmmc: { id: 'CA.L2-3.12.1', title: 'Security Control Assessment' },
    soc2: { id: 'CC8.1', title: 'Change Management' },
    fedramp: { id: 'SA-11', title: 'Developer Testing and Evaluation' },
    asvs: { id: 'V1.1', title: 'Secure Software Development Lifecycle' },
    gdpr: { id: 'Art.25', title: 'Data Protection by Design and by Default' },
    hipaa: { id: '164.308(a)(8)', title: 'Evaluation' },
    pciDss: { id: 'Req-6.2', title: 'Bespoke and Custom Software Developed Securely' },
    iso27001: { id: 'A.8.25', title: 'Secure Development Lifecycle' },
  },

  // System & Communications Protection family
  'SC-5': {
    cmmc: { id: 'SC.L2-3.13.1', title: 'Boundary Protection' },
    soc2: { id: 'CC6.8', title: 'Vulnerability Management' },
    fedramp: { id: 'SC-7', title: 'Boundary Protection' },
    pciDss: { id: 'Req-1.2', title: 'Network Security Controls Configured and Maintained' },
    iso27001: { id: 'A.8.20', title: 'Network Security' },
  },
  'SC-7': {
    cmmc: { id: 'SC.L2-3.13.1', title: 'Boundary Protection' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'SC-7', title: 'Boundary Protection' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.312(a)', title: 'Access Control' },
    pciDss: { id: 'Req-1.2', title: 'Network Security Controls Configured and Maintained' },
    iso27001: { id: 'A.8.20', title: 'Network Security' },
  },
  'SC-8': {
    cmmc: { id: 'SC.L2-3.13.8', title: 'CUI Encryption in Transit' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'SC-8', title: 'Transmission Confidentiality and Integrity' },
    asvs: { id: 'V9.1', title: 'Client Communication Security' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.312(e)', title: 'Transmission Security' },
    pciDss: { id: 'Req-3.5', title: 'Primary Account Number Secured Wherever Stored' },
    iso27001: { id: 'A.8.24', title: 'Use of Cryptography' },
    nistCsf: { id: 'PR.DS', title: 'Data Security' },
    euCra: { id: 'CRA-4', title: 'Confidentiality of Data' },
    nis2: { id: 'NIS2-21.2h', title: 'Cryptography and Encryption' },
  },
  'SC-12': {
    cmmc: { id: 'SC.L2-3.13.11', title: 'CUI Encryption at Rest' },
    fedramp: { id: 'SC-12', title: 'Cryptographic Key Establishment and Management' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.312(a)', title: 'Access Control' },
    pciDss: { id: 'Req-3.5', title: 'Primary Account Number Secured Wherever Stored' },
    iso27001: { id: 'A.8.24', title: 'Use of Cryptography' },
  },
  'SC-13': {
    cmmc: { id: 'SC.L2-3.13.11', title: 'CUI Encryption at Rest' },
    fedramp: { id: 'SC-12', title: 'Cryptographic Key Establishment and Management' },
    asvs: { id: 'V9.1', title: 'Client Communication Security' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.312(a)', title: 'Access Control' },
    pciDss: { id: 'Req-3.5', title: 'Primary Account Number Secured Wherever Stored' },
    iso27001: { id: 'A.8.24', title: 'Use of Cryptography' },
  },
  'SC-18': {
    cmmc: { id: 'SI.L2-3.14.2', title: 'Malicious Code Protection' },
    soc2: { id: 'CC6.8', title: 'Vulnerability Management' },
    fedramp: { id: 'SI-3', title: 'Malicious Code Protection' },
    asvs: { id: 'V5.1', title: 'Input Validation' },
    pciDss: { id: 'Req-5.2', title: 'Malicious Software Prevented or Detected and Addressed' },
    iso27001: { id: 'A.8.7', title: 'Protection Against Malware' },
  },
  'SC-23': {
    cmmc: { id: 'IA.L2-3.5.2', title: 'Authentication' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'IA-2', title: 'Identification and Authentication (Organizational Users)' },
    asvs: { id: 'V1.2', title: 'Authentication Architecture' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.312(d)', title: 'Person or Entity Authentication' },
    pciDss: { id: 'Req-8.3', title: 'Strong Authentication Established' },
    iso27001: { id: 'A.8.5', title: 'Secure Authentication' },
  },
  'SC-28': {
    cmmc: { id: 'SC.L2-3.13.11', title: 'CUI Encryption at Rest' },
    soc2: { id: 'CC6.1', title: 'Logical and Physical Access Controls' },
    fedramp: { id: 'SC-28', title: 'Protection of Information at Rest' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.312(a)', title: 'Access Control' },
    pciDss: { id: 'Req-3.5', title: 'Primary Account Number Secured Wherever Stored' },
    iso27001: { id: 'A.8.24', title: 'Use of Cryptography' },
  },

  // System & Information Integrity family
  'SI-2': {
    cmmc: { id: 'SI.L2-3.14.1', title: 'Flaw Remediation' },
    soc2: { id: 'CC6.8', title: 'Vulnerability Management' },
    fedramp: { id: 'SI-2', title: 'Flaw Remediation' },
    asvs: { id: 'V1.1', title: 'Secure Software Development Lifecycle' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.308(a)(6)', title: 'Security Incident Procedures' },
    pciDss: { id: 'Req-6.3', title: 'Security Vulnerabilities Identified and Addressed' },
    iso27001: { id: 'A.8.8', title: 'Management of Technical Vulnerabilities' },
    nistCsf: { id: 'PR.PS', title: 'Platform Security' },
    euCra: { id: 'CRA-9', title: 'Update Mechanism' },
    nis2: { id: 'NIS2-21.2k', title: 'Vulnerability Handling and Disclosure' },
  },
  'SI-3': {
    cmmc: { id: 'SI.L2-3.14.2', title: 'Malicious Code Protection' },
    soc2: { id: 'CC6.8', title: 'Vulnerability Management' },
    fedramp: { id: 'SI-3', title: 'Malicious Code Protection' },
    asvs: { id: 'V10.3', title: 'Dependency Management' },
    pciDss: { id: 'Req-5.2', title: 'Malicious Software Prevented or Detected and Addressed' },
    iso27001: { id: 'A.8.7', title: 'Protection Against Malware' },
  },
  'SI-4': {
    cmmc: { id: 'SI.L2-3.14.6', title: 'Monitor Communications for Attacks' },
    soc2: { id: 'CC7.1', title: 'Monitoring Activities' },
    fedramp: { id: 'SI-4', title: 'System Monitoring' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.308(a)(6)', title: 'Security Incident Procedures' },
    pciDss: { id: 'Req-11.4', title: 'Intrusions and Unexpected Network Traffic Detected and Responded To' },
    iso27001: { id: 'A.8.16', title: 'Monitoring Activities' },
    nistCsf: { id: 'DE.CM', title: 'Continuous Monitoring' },
    nis2: { id: 'NIS2-21.2b', title: 'Incident Handling' },
  },
  'SI-5': {
    cmmc: { id: 'SI.L2-3.14.3', title: 'Security Alerts & Advisories' },
    soc2: { id: 'CC7.1', title: 'Monitoring Activities' },
    fedramp: { id: 'SI-5', title: 'Security Alerts, Advisories, and Directives' },
    hipaa: { id: '164.308(a)(6)', title: 'Security Incident Procedures' },
    pciDss: { id: 'Req-6.3', title: 'Security Vulnerabilities Identified and Addressed' },
    iso27001: { id: 'A.8.8', title: 'Management of Technical Vulnerabilities' },
  },
  'SI-7': {
    cmmc: { id: 'SI.L2-3.14.2', title: 'Malicious Code Protection' },
    soc2: { id: 'CC7.1', title: 'Monitoring Activities' },
    fedramp: { id: 'SI-3', title: 'Malicious Code Protection' },
    asvs: { id: 'V10.3', title: 'Dependency Management' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    pciDss: { id: 'Req-11.5', title: 'Network Intrusions and Unexpected File Changes Detected and Responded To' },
    iso27001: { id: 'A.8.9', title: 'Configuration Management' },
  },
  'SI-10': {
    cmmc: { id: 'SI.L2-3.14.1', title: 'Flaw Remediation' },
    soc2: { id: 'CC6.8', title: 'Vulnerability Management' },
    fedramp: { id: 'SI-2', title: 'Flaw Remediation' },
    asvs: { id: 'V5.1', title: 'Input Validation' },
    gdpr: { id: 'Art.32', title: 'Security of Processing' },
    hipaa: { id: '164.312(c)', title: 'Integrity' },
    pciDss: { id: 'Req-6.2', title: 'Bespoke and Custom Software Developed Securely' },
    iso27001: { id: 'A.8.28', title: 'Secure Coding' },
  },
  'SI-11': {
    cmmc: { id: 'SI.L2-3.14.1', title: 'Flaw Remediation' },
    soc2: { id: 'CC7.2', title: 'Incident and Change Management' },
    fedramp: { id: 'SI-2', title: 'Flaw Remediation' },
    hipaa: { id: '164.312(c)', title: 'Integrity' },
    iso27001: { id: 'A.8.28', title: 'Secure Coding' },
  },
  'SI-16': {
    cmmc: { id: 'SI.L2-3.14.1', title: 'Flaw Remediation' },
    soc2: { id: 'CC6.8', title: 'Vulnerability Management' },
    fedramp: { id: 'SI-2', title: 'Flaw Remediation' },
    iso27001: { id: 'A.8.12', title: 'Data Leakage Prevention' },
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
  'gdpr': 'GDPR',
  'hipaa': 'HIPAA Security Rule',
  'pci-dss': 'PCI-DSS',
  'iso-27001': 'ISO 27001:2022',
  'nist-csf': 'NIST CSF 2.0',
  'eu-cra': 'EU Cyber Resilience Act',
  'nis2': 'NIS2 Directive',
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
      if (bridge.gdpr) {
        mappedControls.push({
          frameworkId: 'gdpr',
          frameworkName: 'GDPR',
          controlId: bridge.gdpr.id,
          controlTitle: bridge.gdpr.title,
        });
      }
      if (bridge.hipaa) {
        mappedControls.push({
          frameworkId: 'hipaa',
          frameworkName: 'HIPAA Security Rule',
          controlId: bridge.hipaa.id,
          controlTitle: bridge.hipaa.title,
        });
      }
      if (bridge.pciDss) {
        mappedControls.push({
          frameworkId: 'pci-dss',
          frameworkName: 'PCI-DSS',
          controlId: bridge.pciDss.id,
          controlTitle: bridge.pciDss.title,
        });
      }
      if (bridge.iso27001) {
        mappedControls.push({
          frameworkId: 'iso-27001',
          frameworkName: 'ISO 27001:2022',
          controlId: bridge.iso27001.id,
          controlTitle: bridge.iso27001.title,
        });
      }
      if (bridge.nistCsf) {
        mappedControls.push({
          frameworkId: 'nist-csf',
          frameworkName: 'NIST CSF 2.0',
          controlId: bridge.nistCsf.id,
          controlTitle: bridge.nistCsf.title,
        });
      }
      if (bridge.euCra) {
        mappedControls.push({
          frameworkId: 'eu-cra',
          frameworkName: 'EU Cyber Resilience Act',
          controlId: bridge.euCra.id,
          controlTitle: bridge.euCra.title,
        });
      }
      if (bridge.nis2) {
        mappedControls.push({
          frameworkId: 'nis2',
          frameworkName: 'NIS2 Directive',
          controlId: bridge.nis2.id,
          controlTitle: bridge.nis2.title,
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
