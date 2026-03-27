/**
 * NIST Secure Software Development Framework (SSDF) Controls
 */

import type {
  ComplianceFramework,
  ComplianceEvidence,
  ComplianceAssessmentInput,
} from './types';

export const SSDF_FRAMEWORK: ComplianceFramework = {
  id: 'nist-ssdf',
  name: 'NIST SSDF',
  version: 'SP 800-218 v1.1',
  description:
    'NIST Secure Software Development Framework — practices relevant to vulnerability management',
  controls: [
    {
      id: 'PO.1',
      title: 'Define Security Requirements',
      description:
        'Define security requirements for software development and ensure requirements are met through secure design and implementation.',
      category: 'Prepare the Organization (PO)',
      evidenceRequirements: [
        'SLA policies define remediation timelines by severity',
        'Risk tolerance documented via exception workflow',
        'Severity classification standards applied',
      ],
    },
    {
      id: 'PO.3',
      title: 'Implement Supporting Toolchains',
      description:
        'Specify and use tools and processes to manage security risks in the SDLC.',
      category: 'Prepare the Organization (PO)',
      evidenceRequirements: [
        'Vulnerability scanning tools integrated',
        'Multiple scanner types supported (SCA, SAST, DAST, etc.)',
        'Centralized vulnerability management platform in use',
      ],
    },
    {
      id: 'PW.4',
      title: 'Vulnerability Response Process',
      description:
        'Verify third-party software meets security requirements and respond to vulnerabilities in it.',
      category: 'Protect the Software (PW)',
      evidenceRequirements: [
        'SCA scanning for third-party components',
        'CVE tracking and enrichment',
        'Remediation workflow active',
        'SLA enforcement for vulnerability resolution',
      ],
    },
    {
      id: 'PW.7',
      title: 'Review and Test Software',
      description:
        'Review and test software to identify vulnerabilities and verify compliance with security requirements.',
      category: 'Protect the Software (PW)',
      evidenceRequirements: [
        'SAST and DAST scanning',
        'Findings tracked per asset',
        'Verification before case closure',
      ],
    },
    {
      id: 'RV.1',
      title: 'Identify and Confirm Vulnerabilities',
      description:
        'Identify vulnerabilities on an ongoing basis, confirm them, and prioritize response.',
      category: 'Respond to Vulnerabilities (RV)',
      evidenceRequirements: [
        'Continuous vulnerability scanning',
        'Deduplication of findings',
        'CVSS/EPSS/KEV-based prioritization',
        'Triage process documented',
      ],
    },
    {
      id: 'RV.2',
      title: 'Assess, Prioritize, and Remediate',
      description:
        'Analyze each vulnerability to gather information for prioritizing the response.',
      category: 'Respond to Vulnerabilities (RV)',
      evidenceRequirements: [
        'Risk scoring with CVSS, EPSS, KEV indicators',
        'AI-assisted remediation guidance',
        'SLA-driven prioritization',
        'Risk exceptions for accepted risks',
      ],
    },
    {
      id: 'RV.3',
      title: 'Analyze Vulnerabilities for Root Cause',
      description:
        'Analyze vulnerabilities discovered to identify their root causes.',
      category: 'Respond to Vulnerabilities (RV)',
      evidenceRequirements: [
        'CWE classification tracked',
        'Findings grouped by weakness type',
        'Trend analysis available',
      ],
    },
  ],
};

export function assessSSDF(input: ComplianceAssessmentInput): ComplianceEvidence[] {
  const evidences: ComplianceEvidence[] = [];
  const now = new Date().toISOString();

  // PO.1 — Security Requirements
  evidences.push({
    controlId: 'PO.1',
    status: input.hasSlaPolicies && input.hasRiskExceptions ? 'met' : input.hasSlaPolicies ? 'partial' : 'not_met',
    evidence: [
      input.hasSlaPolicies ? 'SLA policies define remediation timelines' : 'No SLA policies configured',
      input.hasRiskExceptions ? 'Risk exception workflow active' : 'No risk exception process',
      'Severity classification using CVSS, EPSS, KEV',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // PO.3 — Toolchains
  evidences.push({
    controlId: 'PO.3',
    status: input.totalFindings > 0 ? 'met' : 'not_met',
    evidence: [
      input.totalFindings > 0
        ? `${input.totalFindings} findings from integrated vulnerability scanners`
        : 'No scanner data imported',
      'Platform supports SCA, SAST, DAST, IaC, Container, VM, and Bug Bounty scanner types',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // PW.4 — Vulnerability Response
  {
    const hasTracking = input.totalOpenCases + input.totalClosedCases > 0;
    const hasSla = input.hasSlaPolicies;
    const goodCompliance = input.slaComplianceRate >= 80;

    evidences.push({
      controlId: 'PW.4',
      status: hasTracking && hasSla && goodCompliance ? 'met' : hasTracking ? 'partial' : 'not_met',
      evidence: [
        hasTracking ? `${input.totalOpenCases + input.totalClosedCases} total cases tracked` : 'No vulnerability cases',
        hasSla ? `SLA compliance: ${input.slaComplianceRate}%` : 'No SLA policies',
        `Average remediation time: ${input.averageRemediationDays} days`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // PW.7 — Review and Test
  {
    const hasScanning = input.totalFindings > 0;
    const hasVerification = input.totalClosedCases > 0;

    evidences.push({
      controlId: 'PW.7',
      status: hasScanning && hasVerification ? 'met' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? `${input.totalFindings} findings from security testing` : 'No findings from testing',
        hasVerification ? `${input.totalClosedCases} cases verified and closed` : 'No verified cases',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // RV.1 — Identify Vulnerabilities
  {
    const recentScan = input.lastScanDate
      ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 14
      : false;

    evidences.push({
      controlId: 'RV.1',
      status: recentScan && input.totalFindings > 0 ? 'met' : input.totalFindings > 0 ? 'partial' : 'not_met',
      evidence: [
        input.lastScanDate ? `Last scan: ${input.lastScanDate}` : 'No scan data',
        `Scan frequency: every ${input.scanFrequencyDays} days`,
        'Deduplication active with finding-to-case grouping',
        'CVSS/EPSS/KEV prioritization enabled',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // RV.2 — Prioritize and Remediate
  {
    const hasRemediation = input.totalClosedCases > 0;
    const hasExceptions = input.hasRiskExceptions;

    evidences.push({
      controlId: 'RV.2',
      status: hasRemediation && hasExceptions ? 'met' : hasRemediation ? 'partial' : 'not_met',
      evidence: [
        hasRemediation ? `${input.totalClosedCases} cases remediated` : 'No remediated cases',
        `Average remediation time: ${input.averageRemediationDays} days`,
        hasExceptions ? 'Risk exception process active' : 'No risk exception process',
        'AI-assisted remediation guidance available',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // RV.3 — Root Cause Analysis
  evidences.push({
    controlId: 'RV.3',
    status: input.totalFindings > 0 ? 'partial' : 'not_met',
    evidence: [
      'CWE classification tracked per vulnerability case',
      'Findings grouped by weakness type and asset',
      input.totalFindings > 0
        ? `${input.totalFindings} findings available for trend analysis`
        : 'No finding data for analysis',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  return evidences;
}
