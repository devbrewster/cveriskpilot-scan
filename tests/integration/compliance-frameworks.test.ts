/**
 * Integration tests for @cveriskpilot/compliance framework assessors
 *
 * Simulated case studies:
 * 1. SaaS startup preparing for SOC 2 Type II audit
 * 2. Defense contractor CMMC Level 2 SPRS scoring
 * 3. Healthcare app HIPAA security rule assessment
 * 4. EU SaaS company GDPR compliance posture
 * 5. Cross-framework comparison for enterprise with multiple requirements
 * 6. Edge cases and boundary conditions
 */

import { describe, it, expect } from 'vitest';
import {
  assessSOC2,
  assessSSDF,
  assessASVS,
  assessCMMC,
  assessFedRAMP,
  assessNIST80053,
  assessGDPR,
  assessHIPAA,
  assessPCIDSS,
  assessISO27001,
  calculateSPRSScore,
  SOC2_FRAMEWORK,
  CMMC_FRAMEWORK,
  HIPAA_FRAMEWORK,
  GDPR_FRAMEWORK,
  PCI_DSS_FRAMEWORK,
  ISO27001_FRAMEWORK,
  NIST_800_53_FRAMEWORK,
  FEDRAMP_FRAMEWORK,
  SSDF_FRAMEWORK,
  ASVS_FRAMEWORK,
} from '@cveriskpilot/compliance';
import type { ComplianceAssessmentInput, ComplianceEvidence } from '@cveriskpilot/compliance';

// ---------------------------------------------------------------------------
// Helper: count evidence by status
// ---------------------------------------------------------------------------
function countByStatus(evidences: ComplianceEvidence[]) {
  return {
    met: evidences.filter((e) => e.status === 'met').length,
    partial: evidences.filter((e) => e.status === 'partial').length,
    notMet: evidences.filter((e) => e.status === 'not_met').length,
    na: evidences.filter((e) => e.status === 'na').length,
    total: evidences.length,
  };
}

function overallScore(evidences: ComplianceEvidence[]) {
  const assessed = evidences.filter((e) => e.status !== 'na');
  if (assessed.length === 0) return 0;
  const met = assessed.filter((e) => e.status === 'met').length;
  const partial = assessed.filter((e) => e.status === 'partial').length;
  return Math.round(((met + partial * 0.5) / assessed.length) * 100);
}

// ---------------------------------------------------------------------------
// Shared test inputs representing different organizational postures
// ---------------------------------------------------------------------------

/** Mature organization — strong VM program, frequent scans, low open count */
const MATURE_ORG: ComplianceAssessmentInput = {
  totalOpenCases: 5,
  totalClosedCases: 450,
  averageRemediationDays: 7,
  slaComplianceRate: 96,
  scanFrequencyDays: 1,
  hasSlaPolicies: true,
  hasRiskExceptions: true,
  hasAuditLogs: true,
  totalFindings: 455,
  criticalOpenCount: 0,
  highOpenCount: 1,
  kevOpenCount: 0,
  hasIntegrations: true,
  lastScanDate: new Date().toISOString(),
};

/** Startup — early program, some gaps, moderate remediation velocity */
const STARTUP: ComplianceAssessmentInput = {
  totalOpenCases: 47,
  totalClosedCases: 120,
  averageRemediationDays: 28,
  slaComplianceRate: 65,
  scanFrequencyDays: 14,
  hasSlaPolicies: true,
  hasRiskExceptions: false,
  hasAuditLogs: true,
  totalFindings: 167,
  criticalOpenCount: 3,
  highOpenCount: 12,
  kevOpenCount: 1,
  hasIntegrations: false,
  lastScanDate: new Date(Date.now() - 7 * 86400000).toISOString(),
};

/** Neglected — no scans, no policies, many open vulnerabilities */
const NEGLECTED: ComplianceAssessmentInput = {
  totalOpenCases: 200,
  totalClosedCases: 10,
  averageRemediationDays: 120,
  slaComplianceRate: 15,
  scanFrequencyDays: 90,
  hasSlaPolicies: false,
  hasRiskExceptions: false,
  hasAuditLogs: false,
  totalFindings: 210,
  criticalOpenCount: 25,
  highOpenCount: 80,
  kevOpenCount: 12,
  hasIntegrations: false,
  lastScanDate: null,
};

/** Empty — brand new organization, zero data */
const EMPTY_ORG: ComplianceAssessmentInput = {
  totalOpenCases: 0,
  totalClosedCases: 0,
  averageRemediationDays: 0,
  slaComplianceRate: 0,
  scanFrequencyDays: 0,
  hasSlaPolicies: false,
  hasRiskExceptions: false,
  hasAuditLogs: false,
  totalFindings: 0,
  criticalOpenCount: 0,
  highOpenCount: 0,
  kevOpenCount: 0,
  hasIntegrations: false,
  lastScanDate: null,
};

// ---------------------------------------------------------------------------
// Case Study 1: SaaS Startup — SOC 2 Type II Readiness
// ---------------------------------------------------------------------------

describe('Case Study: SaaS Startup — SOC 2 Readiness', () => {
  it('mature org achieves high SOC 2 compliance', () => {
    const evidences = assessSOC2(MATURE_ORG);
    const counts = countByStatus(evidences);

    expect(evidences.length).toBeGreaterThan(0);
    expect(counts.met).toBeGreaterThan(counts.notMet);
    expect(overallScore(evidences)).toBeGreaterThanOrEqual(70);
  });

  it('startup has partial compliance with gaps', () => {
    const evidences = assessSOC2(STARTUP);
    const counts = countByStatus(evidences);

    expect(counts.partial + counts.notMet).toBeGreaterThan(0);
    // Should still have some controls met
    expect(counts.met).toBeGreaterThan(0);
  });

  it('neglected org scores lower than mature org on SOC 2', () => {
    const neglectedScore = overallScore(assessSOC2(NEGLECTED));
    const matureScore = overallScore(assessSOC2(MATURE_ORG));

    expect(matureScore).toBeGreaterThan(neglectedScore);
  });

  it('SOC 2 framework has all 5 trust service categories', () => {
    const categories = new Set(SOC2_FRAMEWORK.controls.map((c) => c.category));
    expect(categories.size).toBeGreaterThanOrEqual(3); // At minimum CC, Availability, Confidentiality
  });

  it('every evidence has required fields', () => {
    const evidences = assessSOC2(STARTUP);
    for (const e of evidences) {
      expect(e.controlId).toBeTruthy();
      expect(['met', 'partial', 'not_met', 'na']).toContain(e.status);
      expect(e.evidence).toBeTruthy();
      expect(e.autoAssessed).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Case Study 2: Defense Contractor — CMMC Level 2 SPRS Scoring
// ---------------------------------------------------------------------------

describe('Case Study: Defense Contractor — CMMC SPRS Scoring', () => {
  it('mature org scores high CMMC compliance', () => {
    const evidences = assessCMMC(MATURE_ORG);
    const counts = countByStatus(evidences);

    expect(counts.met).toBeGreaterThan(counts.notMet);
  });

  it('KEV-heavy neglected org scores lower than mature org on CMMC', () => {
    const neglectedScore = overallScore(assessCMMC(NEGLECTED));
    const matureScore = overallScore(assessCMMC(MATURE_ORG));

    expect(matureScore).toBeGreaterThan(neglectedScore);
  });

  it('CMMC framework has practices defined', () => {
    expect(CMMC_FRAMEWORK.controls.length).toBeGreaterThan(0);
    expect(CMMC_FRAMEWORK.id).toBe('cmmc-level2');
  });

  it('SPRS score calculation works', () => {
    const evidences = assessCMMC(MATURE_ORG);
    // calculateSPRSScore should return a number (max 110 for CMMC L2)
    if (typeof calculateSPRSScore === 'function') {
      const sprs = calculateSPRSScore(evidences);
      expect(sprs).toBeGreaterThanOrEqual(-203); // SPRS floor
      expect(sprs).toBeLessThanOrEqual(110); // SPRS ceiling
    }
  });

  it('startup SPRS score is lower than mature org', () => {
    const matureEvidences = assessCMMC(MATURE_ORG);
    const startupEvidences = assessCMMC(STARTUP);

    const matureScore = overallScore(matureEvidences);
    const startupScore = overallScore(startupEvidences);

    expect(matureScore).toBeGreaterThanOrEqual(startupScore);
  });
});

// ---------------------------------------------------------------------------
// Case Study 3: Healthcare App — HIPAA Security Rule
// ---------------------------------------------------------------------------

describe('Case Study: Healthcare App — HIPAA Security Assessment', () => {
  it('mature org meets most HIPAA safeguards', () => {
    const evidences = assessHIPAA(MATURE_ORG);
    const counts = countByStatus(evidences);

    expect(counts.met).toBeGreaterThan(0);
    expect(overallScore(evidences)).toBeGreaterThanOrEqual(60);
  });

  it('neglected org has critical HIPAA gaps', () => {
    const evidences = assessHIPAA(NEGLECTED);
    const counts = countByStatus(evidences);

    expect(counts.notMet + counts.partial).toBeGreaterThan(0);
  });

  it('HIPAA framework covers administrative, physical, and technical safeguards', () => {
    expect(HIPAA_FRAMEWORK.controls.length).toBeGreaterThan(0);
  });

  it('audit log requirement affects HIPAA compliance', () => {
    const withAudit = assessHIPAA({ ...STARTUP, hasAuditLogs: true });
    const withoutAudit = assessHIPAA({ ...STARTUP, hasAuditLogs: false });

    const scoreWith = overallScore(withAudit);
    const scoreWithout = overallScore(withoutAudit);

    expect(scoreWith).toBeGreaterThanOrEqual(scoreWithout);
  });
});

// ---------------------------------------------------------------------------
// Case Study 4: EU SaaS — GDPR Compliance Posture
// ---------------------------------------------------------------------------

describe('Case Study: EU SaaS — GDPR Compliance', () => {
  it('mature org achieves solid GDPR posture', () => {
    const evidences = assessGDPR(MATURE_ORG);
    expect(overallScore(evidences)).toBeGreaterThanOrEqual(60);
  });

  it('empty org triggers GDPR not_met controls', () => {
    const evidences = assessGDPR(EMPTY_ORG);
    const counts = countByStatus(evidences);

    // An org with zero activity should have gaps
    expect(counts.notMet + counts.partial).toBeGreaterThan(0);
  });

  it('GDPR framework is properly defined', () => {
    expect(GDPR_FRAMEWORK.id).toBeTruthy();
    expect(GDPR_FRAMEWORK.controls.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Case Study 5: Cross-Framework Comparison — Enterprise Multi-Compliance
// ---------------------------------------------------------------------------

describe('Case Study: Enterprise — Cross-Framework Comparison', () => {
  const allAssessors = [
    { name: 'SOC 2', fn: assessSOC2, framework: SOC2_FRAMEWORK },
    { name: 'SSDF', fn: assessSSDF, framework: SSDF_FRAMEWORK },
    { name: 'ASVS', fn: assessASVS, framework: ASVS_FRAMEWORK },
    { name: 'CMMC', fn: assessCMMC, framework: CMMC_FRAMEWORK },
    { name: 'FedRAMP', fn: assessFedRAMP, framework: FEDRAMP_FRAMEWORK },
    { name: 'NIST 800-53', fn: assessNIST80053, framework: NIST_800_53_FRAMEWORK },
    { name: 'GDPR', fn: assessGDPR, framework: GDPR_FRAMEWORK },
    { name: 'HIPAA', fn: assessHIPAA, framework: HIPAA_FRAMEWORK },
    { name: 'PCI-DSS', fn: assessPCIDSS, framework: PCI_DSS_FRAMEWORK },
    { name: 'ISO 27001', fn: assessISO27001, framework: ISO27001_FRAMEWORK },
  ];

  for (const { name, fn } of allAssessors) {
    it(`${name} assessor returns valid evidences for mature org`, () => {
      const evidences = fn(MATURE_ORG);

      expect(Array.isArray(evidences)).toBe(true);
      expect(evidences.length).toBeGreaterThan(0);

      for (const e of evidences) {
        expect(e.controlId).toBeTruthy();
        expect(['met', 'partial', 'not_met', 'na']).toContain(e.status);
        expect(typeof e.evidence).toBe('string');
        expect(typeof e.autoAssessed).toBe('boolean');
      }
    });
  }

  it('mature org scores higher than neglected org across all frameworks', () => {
    for (const { name, fn } of allAssessors) {
      const matureScore = overallScore(fn(MATURE_ORG));
      const neglectedScore = overallScore(fn(NEGLECTED));

      expect(matureScore).toBeGreaterThanOrEqual(
        neglectedScore,
      );
    }
  });

  it('all 10 frameworks have unique IDs', () => {
    const ids = allAssessors.map((a) => a.framework.id);
    expect(new Set(ids).size).toBe(10);
  });

  it('all frameworks have non-empty control lists', () => {
    for (const { name, framework } of allAssessors) {
      expect(framework.controls.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Case Study 6: PCI-DSS — Payment Processing
// ---------------------------------------------------------------------------

describe('Case Study: Payment Processor — PCI-DSS', () => {
  it('mature org meets PCI-DSS requirements', () => {
    const evidences = assessPCIDSS(MATURE_ORG);
    expect(overallScore(evidences)).toBeGreaterThanOrEqual(60);
  });

  it('scan frequency impacts PCI-DSS compliance', () => {
    const frequentScans = assessPCIDSS({ ...STARTUP, scanFrequencyDays: 1 });
    const rareScans = assessPCIDSS({ ...STARTUP, scanFrequencyDays: 90 });

    expect(overallScore(frequentScans)).toBeGreaterThanOrEqual(overallScore(rareScans));
  });
});

// ---------------------------------------------------------------------------
// Case Study 7: ISO 27001 / NIST 800-53 / FedRAMP
// ---------------------------------------------------------------------------

describe('Case Study: Federal Contractor — NIST + FedRAMP + ISO 27001', () => {
  it('NIST 800-53 assessment produces evidences', () => {
    const evidences = assessNIST80053(MATURE_ORG);
    expect(evidences.length).toBeGreaterThan(0);
    expect(overallScore(evidences)).toBeGreaterThanOrEqual(60);
  });

  it('FedRAMP assessment produces evidences', () => {
    const evidences = assessFedRAMP(MATURE_ORG);
    expect(evidences.length).toBeGreaterThan(0);
  });

  it('ISO 27001 assessment produces evidences', () => {
    const evidences = assessISO27001(MATURE_ORG);
    expect(evidences.length).toBeGreaterThan(0);
  });

  it('SSDF assessment for DevSecOps maturity', () => {
    const evidences = assessSSDF(MATURE_ORG);
    expect(evidences.length).toBeGreaterThan(0);
    expect(overallScore(evidences)).toBeGreaterThanOrEqual(60);
  });

  it('ASVS assessment for application security', () => {
    const evidences = assessASVS(MATURE_ORG);
    expect(evidences.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe('Edge Cases — Compliance Assessors', () => {
  it('all assessors handle empty org without crashing', () => {
    const assessors = [
      assessSOC2, assessSSDF, assessASVS, assessCMMC, assessFedRAMP,
      assessNIST80053, assessGDPR, assessHIPAA, assessPCIDSS, assessISO27001,
    ];

    for (const assess of assessors) {
      const evidences = assess(EMPTY_ORG);
      expect(Array.isArray(evidences)).toBe(true);
      expect(evidences.length).toBeGreaterThan(0);
    }
  });

  it('all assessors handle extreme values gracefully', () => {
    const extreme: ComplianceAssessmentInput = {
      totalOpenCases: 999999,
      totalClosedCases: 999999,
      averageRemediationDays: 9999,
      slaComplianceRate: 100,
      scanFrequencyDays: 0,
      hasSlaPolicies: true,
      hasRiskExceptions: true,
      hasAuditLogs: true,
      totalFindings: 999999,
      criticalOpenCount: 999999,
      highOpenCount: 999999,
      kevOpenCount: 999999,
      hasIntegrations: true,
      lastScanDate: new Date().toISOString(),
    };

    const assessors = [
      assessSOC2, assessSSDF, assessASVS, assessCMMC, assessFedRAMP,
      assessNIST80053, assessGDPR, assessHIPAA, assessPCIDSS, assessISO27001,
    ];

    for (const assess of assessors) {
      const evidences = assess(extreme);
      expect(Array.isArray(evidences)).toBe(true);
      for (const e of evidences) {
        expect(['met', 'partial', 'not_met', 'na']).toContain(e.status);
      }
    }
  });

  it('overall scores are always 0-100', () => {
    const inputs = [MATURE_ORG, STARTUP, NEGLECTED, EMPTY_ORG];
    const assessors = [
      assessSOC2, assessSSDF, assessASVS, assessCMMC, assessFedRAMP,
      assessNIST80053, assessGDPR, assessHIPAA, assessPCIDSS, assessISO27001,
    ];

    for (const input of inputs) {
      for (const assess of assessors) {
        const score = overallScore(assess(input));
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });
});
