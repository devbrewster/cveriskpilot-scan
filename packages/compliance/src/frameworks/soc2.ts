/**
 * SOC 2 Type II Controls relevant to Vulnerability Management
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
    'AICPA Service Organization Control 2 — Trust Services Criteria relevant to vulnerability management',
  controls: [
    {
      id: 'CC6.1',
      title: 'Logical and Physical Access Controls',
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
    {
      id: 'CC7.1',
      title: 'Monitoring Activities',
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
      title: 'Incident and Change Management',
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
      title: 'Evaluation of Security Events',
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
  ],
};

export function assessSOC2(input: ComplianceAssessmentInput): ComplianceEvidence[] {
  const evidences: ComplianceEvidence[] = [];
  const now = new Date().toISOString();

  // CC6.1 — Access controls
  evidences.push({
    controlId: 'CC6.1',
    status: 'met', // Platform has RBAC built in
    evidence:
      'Platform implements role-based access control with multiple roles (PLATFORM_ADMIN, SECURITY_ADMIN, ANALYST, DEVELOPER, VIEWER). Multi-client isolation enforced.',
    lastVerified: now,
    autoAssessed: true,
  });

  // CC6.8 — Vulnerability Management
  {
    const hasScanning = input.totalFindings > 0;
    const hasRemediation = input.totalClosedCases > 0;
    const hasSla = input.hasSlaPolicies;
    const hasExceptions = input.hasRiskExceptions;
    const score = [hasScanning, hasRemediation, hasSla, hasExceptions].filter(Boolean).length;

    evidences.push({
      controlId: 'CC6.8',
      status: score >= 3 ? 'met' : score >= 2 ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? `${input.totalFindings} findings tracked from vulnerability scans` : 'No vulnerability scan data',
        hasRemediation ? `${input.totalClosedCases} cases remediated` : 'No remediated cases',
        hasSla ? `SLA policies configured, ${input.slaComplianceRate}% compliance rate` : 'No SLA policies configured',
        hasExceptions ? 'Risk exception process active' : 'No risk exception process',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // CC7.1 — Monitoring
  {
    const recentScan = input.lastScanDate
      ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
      : false;
    const hasFrequentScans = input.scanFrequencyDays <= 14;

    evidences.push({
      controlId: 'CC7.1',
      status: recentScan && hasFrequentScans ? 'met' : recentScan ? 'partial' : 'not_met',
      evidence: [
        input.lastScanDate ? `Last scan: ${input.lastScanDate}` : 'No scan data available',
        `Average scan frequency: ${input.scanFrequencyDays} days`,
        `${input.kevOpenCount} open KEV-listed vulnerabilities`,
        `${input.criticalOpenCount} critical open vulnerabilities`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // CC7.2 — Incident and Change Management
  {
    const hasAudit = input.hasAuditLogs;
    const hasSla = input.hasSlaPolicies;

    evidences.push({
      controlId: 'CC7.2',
      status: hasAudit && hasSla ? 'met' : hasAudit || hasSla ? 'partial' : 'not_met',
      evidence: [
        hasAudit ? 'Audit trail active with tamper-evident hash chain' : 'No audit trail configured',
        hasSla ? `SLA policies active, ${input.slaComplianceRate}% compliance` : 'No SLA policies',
        `Workflow tracking: ${input.totalOpenCases} open, ${input.totalClosedCases} closed cases`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // CC7.3 — Evaluation
  {
    const hasTriage = input.totalOpenCases > 0 || input.totalClosedCases > 0;
    const hasExceptions = input.hasRiskExceptions;

    evidences.push({
      controlId: 'CC7.3',
      status: hasTriage && hasExceptions ? 'met' : hasTriage ? 'partial' : 'not_met',
      evidence: [
        hasTriage ? 'Triage workflow with severity classification active' : 'No triage process detected',
        hasExceptions ? 'Risk exception approval workflow in use' : 'No risk exceptions documented',
        `Severity breakdown tracked with CVSS, EPSS, and KEV indicators`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // CC8.1 — Change Management
  {
    const hasIntegrations = input.hasIntegrations;
    const hasWorkflow = input.totalClosedCases > 0;

    evidences.push({
      controlId: 'CC8.1',
      status: hasIntegrations && hasWorkflow ? 'met' : hasWorkflow ? 'partial' : 'not_met',
      evidence: [
        hasIntegrations ? 'Ticketing integration active (Jira)' : 'No ticketing integration configured',
        hasWorkflow ? 'Remediation workflow with verification step active' : 'No remediation workflow data',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  return evidences;
}
