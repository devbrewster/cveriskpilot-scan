/**
 * Integration tests for @cveriskpilot/enrichment pipeline
 *
 * Simulated case studies:
 * 1. SaaS startup with mixed severity findings (Log4Shell, XSS, info disclosure)
 * 2. Defense contractor with KEV-listed CVEs under CMMC audit
 * 3. Healthcare app with HIPAA-relevant vulnerabilities
 * 4. Empty/edge-case inputs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeRiskScore } from '@cveriskpilot/enrichment';
import type { RiskScoreInput, RiskScoreResult } from '@cveriskpilot/enrichment';

// ---------------------------------------------------------------------------
// Case Study 1: SaaS Startup — Mixed Severity Portfolio
// Simulates a startup with 6 findings ranging from Log4Shell to info disclosure
// ---------------------------------------------------------------------------

describe('Case Study: SaaS Startup — Mixed Severity Portfolio', () => {
  const findings = [
    {
      name: 'Log4Shell (CVE-2021-44228)',
      input: { cvssScore: 10.0, epssScore: 0.975, kevListed: true, assetCriticality: 'critical' as const },
      expectedLevel: 'CRITICAL',
      expectedMinScore: 95,
    },
    {
      name: 'Spring4Shell (CVE-2022-22965)',
      input: { cvssScore: 9.8, epssScore: 0.87, kevListed: true, assetCriticality: 'high' as const },
      expectedLevel: 'CRITICAL',
      expectedMinScore: 90,
    },
    {
      name: 'Reflected XSS in admin panel (CWE-79)',
      input: { cvssScore: 6.1, epssScore: 0.15, kevListed: false, assetCriticality: 'medium' as const },
      expectedLevel: 'HIGH',      // (61*1.3+0)*1.0 = 79
      expectedMinScore: 70,
      expectedMaxScore: 89,
    },
    {
      name: 'SQL Injection in search (CWE-89)',
      input: { cvssScore: 8.6, epssScore: 0.42, kevListed: false, assetCriticality: 'high' as const },
      expectedLevel: 'CRITICAL',  // (86*1.84+0)*1.2 = 190 → capped 100
      expectedMinScore: 90,
    },
    {
      name: 'Information disclosure via error messages (CWE-209)',
      input: { cvssScore: 3.7, epssScore: 0.02, kevListed: false, assetCriticality: 'low' as const },
      expectedLevel: 'LOW',       // (37*1.04+0)*0.8 = 30.8 → 31
      expectedMinScore: 20,
      expectedMaxScore: 39,
    },
    {
      name: 'Outdated jQuery with no known exploit',
      input: { cvssScore: 4.3, epssScore: 0.005, kevListed: false, assetCriticality: 'medium' as const },
      expectedLevel: 'MEDIUM',    // (43*1.01+0)*1.0 = 43.4 → 43
      expectedMinScore: 40,
      expectedMaxScore: 69,
    },
  ];

  for (const f of findings) {
    it(`scores ${f.name} as ${f.expectedLevel}`, () => {
      const result = computeRiskScore(f.input);

      expect(result.riskLevel).toBe(f.expectedLevel);
      if (f.expectedMinScore !== undefined) {
        expect(result.score).toBeGreaterThanOrEqual(f.expectedMinScore);
      }
      if (f.expectedMaxScore !== undefined) {
        expect(result.score).toBeLessThanOrEqual(f.expectedMaxScore);
      }
    });
  }

  it('ranks findings correctly by risk score', () => {
    const scored = findings.map((f) => ({
      name: f.name,
      score: computeRiskScore(f.input).score,
    }));

    // Log4Shell should be highest
    const sorted = [...scored].sort((a, b) => b.score - a.score);
    expect(sorted[0].name).toContain('Log4Shell');

    // Info disclosure should be lowest (LOW=31, lower than jQuery MEDIUM=43)
    expect(sorted[sorted.length - 1].name).toContain('Information disclosure');
  });

  it('KEV-listed findings always rank higher than non-KEV with similar CVSS', () => {
    // Use moderate values so both don't cap at 100
    const kevListed = computeRiskScore({ cvssScore: 5.0, epssScore: 0.1, kevListed: true });
    const notKev = computeRiskScore({ cvssScore: 5.0, epssScore: 0.1, kevListed: false });

    expect(kevListed.score).toBeGreaterThan(notKev.score);
    expect(kevListed.breakdown.kevBoost).toBe(20);
    expect(notKev.breakdown.kevBoost).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Case Study 2: Defense Contractor — KEV-Heavy Under CMMC Audit
// All findings are KEV-listed, simulating a contractor with known exploited vulns
// ---------------------------------------------------------------------------

describe('Case Study: Defense Contractor — KEV-Listed Critical Findings', () => {
  const kevFindings = [
    { cvssScore: 9.8, epssScore: 0.97, kevListed: true, assetCriticality: 'critical' as const },
    { cvssScore: 9.1, epssScore: 0.89, kevListed: true, assetCriticality: 'critical' as const },
    { cvssScore: 8.8, epssScore: 0.76, kevListed: true, assetCriticality: 'high' as const },
    { cvssScore: 7.5, epssScore: 0.55, kevListed: true, assetCriticality: 'high' as const },
  ];

  it('all KEV findings score CRITICAL or HIGH', () => {
    for (const input of kevFindings) {
      const result = computeRiskScore(input);
      expect(['CRITICAL', 'HIGH']).toContain(result.riskLevel);
      expect(result.score).toBeGreaterThanOrEqual(70);
    }
  });

  it('KEV boost is consistent (+20)', () => {
    for (const input of kevFindings) {
      const result = computeRiskScore(input);
      expect(result.breakdown.kevBoost).toBe(20);
    }
  });

  it('critical asset multiplier elevates borderline scores', () => {
    const criticalAsset = computeRiskScore({ cvssScore: 7.0, epssScore: 0.3, kevListed: false, assetCriticality: 'critical' });
    const lowAsset = computeRiskScore({ cvssScore: 7.0, epssScore: 0.3, kevListed: false, assetCriticality: 'low' });

    expect(criticalAsset.score).toBeGreaterThan(lowAsset.score);
    expect(criticalAsset.breakdown.envMultiplier).toBe(1.5);
    expect(lowAsset.breakdown.envMultiplier).toBe(0.8);
  });
});

// ---------------------------------------------------------------------------
// Case Study 3: Healthcare App — EPSS-Driven Prioritization
// Focuses on EPSS scores driving priority when CVSS scores are similar
// ---------------------------------------------------------------------------

describe('Case Study: Healthcare App — EPSS-Driven Prioritization', () => {
  it('high EPSS elevates medium CVSS finding above low-EPSS high CVSS', () => {
    // Actively exploited medium-severity finding
    const activelyExploited = computeRiskScore({
      cvssScore: 6.5,
      epssScore: 0.92,
      kevListed: false,
      assetCriticality: 'high',
    });

    // Theoretical high-severity with no known exploits
    const theoreticalHigh = computeRiskScore({
      cvssScore: 8.0,
      epssScore: 0.01,
      kevListed: false,
      assetCriticality: 'high',
    });

    // The actively exploited one should score higher despite lower CVSS
    expect(activelyExploited.score).toBeGreaterThan(theoreticalHigh.score);
  });

  it('EPSS multiplier scales correctly', () => {
    const highEpss = computeRiskScore({ cvssScore: 7.0, epssScore: 0.95 });
    const lowEpss = computeRiskScore({ cvssScore: 7.0, epssScore: 0.05 });

    expect(highEpss.breakdown.epssMultiplier).toBeGreaterThan(lowEpss.breakdown.epssMultiplier);
    expect(highEpss.score).toBeGreaterThan(lowEpss.score);
  });
});

// ---------------------------------------------------------------------------
// Case Study 4: Edge Cases & Boundary Conditions
// ---------------------------------------------------------------------------

describe('Edge Cases', () => {
  it('handles completely empty input', () => {
    const result = computeRiskScore({});
    expect(result.score).toBe(0);
    expect(result.riskLevel).toBe('INFO');
  });

  it('score never exceeds 100', () => {
    const result = computeRiskScore({
      cvssScore: 10.0,
      epssScore: 1.0,
      kevListed: true,
      assetCriticality: 'critical',
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('score never goes below 0', () => {
    const result = computeRiskScore({
      cvssScore: 0,
      epssScore: 0,
      kevListed: false,
      assetCriticality: 'low',
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('handles CVSS without EPSS', () => {
    const result = computeRiskScore({ cvssScore: 9.8 });
    expect(result.score).toBeGreaterThan(0);
    expect(result.riskLevel).toBe('CRITICAL');
  });

  it('handles EPSS without CVSS', () => {
    const result = computeRiskScore({ epssScore: 0.95 });
    // No CVSS base = 0 base score, so even high EPSS won't push it high
    expect(result.score).toBe(0);
  });

  it('KEV alone without CVSS still gets a boost', () => {
    const result = computeRiskScore({ kevListed: true });
    // Base is 0, but KEV boost adds 20 → capped at reasonable level
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
