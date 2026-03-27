/**
 * OWASP Application Security Verification Standard (ASVS) Controls
 * Subset relevant to vulnerability management
 */

import type {
  ComplianceFramework,
  ComplianceEvidence,
  ComplianceAssessmentInput,
} from './types';

export const ASVS_FRAMEWORK: ComplianceFramework = {
  id: 'owasp-asvs',
  name: 'OWASP ASVS',
  version: '4.0.3',
  description:
    'OWASP Application Security Verification Standard — controls relevant to vulnerability management and secure development lifecycle',
  controls: [
    {
      id: 'V1.1',
      title: 'Secure Software Development Lifecycle',
      description:
        'Verify the use of a secure software development lifecycle that addresses security in all stages.',
      category: 'V1: Architecture, Design and Threat Modeling',
      evidenceRequirements: [
        'Vulnerability management integrated into SDLC',
        'Security scanning at multiple stages',
        'Remediation tracking with SLAs',
      ],
    },
    {
      id: 'V1.2',
      title: 'Authentication Architecture',
      description:
        'Verify that all authentication pathways and identity management APIs implement consistent authentication security strength.',
      category: 'V1: Architecture, Design and Threat Modeling',
      evidenceRequirements: [
        'Authentication-related vulnerabilities tracked',
        'CWE-287 and related findings monitored',
      ],
    },
    {
      id: 'V5.1',
      title: 'Input Validation',
      description:
        'Verify that the application has defenses against input validation attacks (injection, XSS).',
      category: 'V5: Validation, Sanitization and Encoding',
      evidenceRequirements: [
        'SAST/DAST findings for injection flaws tracked',
        'CWE-79, CWE-89, CWE-78 findings monitored',
        'Remediation of injection vulnerabilities tracked',
      ],
    },
    {
      id: 'V9.1',
      title: 'Client Communication Security',
      description:
        'Verify that all client connections use TLS and other communication security measures.',
      category: 'V9: Communication',
      evidenceRequirements: [
        'TLS/SSL configuration vulnerabilities tracked',
        'Certificate-related findings monitored',
        'CWE-295, CWE-319 findings tracked',
      ],
    },
    {
      id: 'V10.3',
      title: 'Dependency Management',
      description:
        'Verify that the application has protection against third-party library vulnerabilities.',
      category: 'V10: Malicious Code',
      evidenceRequirements: [
        'SCA scanning of third-party dependencies',
        'CVE tracking for open source components',
        'Timely patching of known vulnerabilities',
      ],
    },
    {
      id: 'V14.2',
      title: 'Dependency Security',
      description:
        'Verify that all components are up to date with proper security configurations.',
      category: 'V14: Configuration',
      evidenceRequirements: [
        'Component inventory maintained',
        'Vulnerability scanning of all components',
        'Outdated component tracking',
      ],
    },
  ],
};

export function assessASVS(input: ComplianceAssessmentInput): ComplianceEvidence[] {
  const evidences: ComplianceEvidence[] = [];
  const now = new Date().toISOString();

  // V1.1 — SSDLC
  {
    const hasScanning = input.totalFindings > 0;
    const hasSla = input.hasSlaPolicies;
    const hasRemediation = input.totalClosedCases > 0;

    evidences.push({
      controlId: 'V1.1',
      status:
        hasScanning && hasSla && hasRemediation ? 'met' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        hasScanning
          ? `Vulnerability scanning integrated with ${input.totalFindings} findings tracked`
          : 'No vulnerability scan data',
        hasSla ? `SLA policies enforce ${input.slaComplianceRate}% compliance` : 'No SLA policies',
        hasRemediation ? `${input.totalClosedCases} vulnerabilities remediated` : 'No remediation data',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // V1.2 — Authentication Architecture
  evidences.push({
    controlId: 'V1.2',
    status: input.totalFindings > 0 ? 'partial' : 'na',
    evidence: [
      'Platform tracks authentication-related CWEs (CWE-287, CWE-306, CWE-521)',
      input.totalFindings > 0
        ? 'Authentication vulnerability findings monitored'
        : 'No findings data available for assessment',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // V5.1 — Input Validation
  evidences.push({
    controlId: 'V5.1',
    status: input.totalFindings > 0 ? 'partial' : 'na',
    evidence: [
      'Platform tracks injection-related CWEs (CWE-79, CWE-89, CWE-78, CWE-94)',
      'SAST and DAST scanner integration available',
      input.totalFindings > 0
        ? 'Input validation findings are tracked and remediated'
        : 'No findings data available',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // V9.1 — Communications Security
  evidences.push({
    controlId: 'V9.1',
    status: input.totalFindings > 0 ? 'partial' : 'na',
    evidence: [
      'TLS/SSL and certificate vulnerabilities tracked (CWE-295, CWE-319)',
      input.totalFindings > 0
        ? 'Communication security findings monitored'
        : 'No findings data available',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // V10.3 — Dependency Management
  {
    const hasScanning = input.totalFindings > 0;
    const noCriticalKev = input.kevOpenCount === 0;

    evidences.push({
      controlId: 'V10.3',
      status: hasScanning && noCriticalKev ? 'met' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? 'SCA scanning active with CVE tracking' : 'No SCA scan data',
        `${input.kevOpenCount} open KEV-listed vulnerabilities`,
        `${input.criticalOpenCount} critical open vulnerabilities`,
        `Average remediation time: ${input.averageRemediationDays} days`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // V14.2 — Dependency Security
  {
    const hasScanning = input.totalFindings > 0;
    const recentScan = input.lastScanDate
      ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
      : false;

    evidences.push({
      controlId: 'V14.2',
      status: hasScanning && recentScan ? 'met' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? `${input.totalFindings} component findings tracked` : 'No component scan data',
        input.lastScanDate ? `Last scan: ${input.lastScanDate}` : 'No recent scan data',
        `Scan frequency: every ${input.scanFrequencyDays} days`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  return evidences;
}
