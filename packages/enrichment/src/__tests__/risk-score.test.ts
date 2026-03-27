import { describe, it, expect } from 'vitest';
import { computeRiskScore } from '../scoring/risk-score';

describe('computeRiskScore', () => {
  it('computes score for high CVSS + KEV listed', () => {
    const result = computeRiskScore({
      cvssScore: 9.8,
      epssScore: 0.95,
      kevListed: true,
      assetCriticality: 'critical',
    });

    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.riskLevel).toBe('CRITICAL');
    expect(result.breakdown.base).toBe(98);
    expect(result.breakdown.kevBoost).toBe(20);
    expect(result.breakdown.envMultiplier).toBe(1.5);
    expect(result.breakdown.epssMultiplier).toBeCloseTo(2.9, 1);
  });

  it('computes score for low CVSS, no KEV, no EPSS', () => {
    const result = computeRiskScore({
      cvssScore: 2.0,
      epssScore: 0.01,
      kevListed: false,
      assetCriticality: 'low',
    });

    // base=20, epssMultiplier=1.02, envMultiplier=0.8 => 20*1.02*0.8 = 16.32 => 16
    expect(result.score).toBeLessThan(20);
    expect(result.riskLevel).toBe('INFO');
    expect(result.breakdown.kevBoost).toBe(0);
    expect(result.breakdown.envMultiplier).toBe(0.8);
  });

  it('handles missing data with defaults', () => {
    const result = computeRiskScore({});

    expect(result.score).toBe(0);
    expect(result.riskLevel).toBe('INFO');
    expect(result.breakdown.base).toBe(0);
    expect(result.breakdown.epssMultiplier).toBe(1);
    expect(result.breakdown.kevBoost).toBe(0);
    expect(result.breakdown.envMultiplier).toBe(1.0);
  });

  it('caps score at 100', () => {
    const result = computeRiskScore({
      cvssScore: 10.0,
      epssScore: 1.0,
      kevListed: true,
      assetCriticality: 'critical',
    });

    expect(result.score).toBe(100);
  });

  it('returns CRITICAL for score >= 90', () => {
    const result = computeRiskScore({
      cvssScore: 9.5,
      epssScore: 0.5,
      kevListed: true,
      assetCriticality: 'high',
    });

    expect(result.riskLevel).toBe('CRITICAL');
  });

  it('returns HIGH for score >= 70', () => {
    const result = computeRiskScore({
      cvssScore: 7.0,
      epssScore: 0.0,
      kevListed: false,
      assetCriticality: 'medium',
    });

    expect(result.score).toBe(70);
    expect(result.riskLevel).toBe('HIGH');
  });

  it('returns MEDIUM for score >= 40', () => {
    const result = computeRiskScore({
      cvssScore: 4.0,
      epssScore: 0.0,
      kevListed: false,
      assetCriticality: 'medium',
    });

    expect(result.score).toBe(40);
    expect(result.riskLevel).toBe('MEDIUM');
  });

  it('returns LOW for score >= 20', () => {
    const result = computeRiskScore({
      cvssScore: 2.0,
      epssScore: 0.0,
      kevListed: false,
      assetCriticality: 'medium',
    });

    expect(result.score).toBe(20);
    expect(result.riskLevel).toBe('LOW');
  });

  it('returns INFO for score < 20', () => {
    const result = computeRiskScore({
      cvssScore: 1.5,
      epssScore: 0.0,
      kevListed: false,
      assetCriticality: 'medium',
    });

    expect(result.score).toBe(15);
    expect(result.riskLevel).toBe('INFO');
  });

  it('applies environment multiplier correctly', () => {
    const base = computeRiskScore({
      cvssScore: 5.0,
      assetCriticality: 'medium',
    });
    const critical = computeRiskScore({
      cvssScore: 5.0,
      assetCriticality: 'critical',
    });
    const low = computeRiskScore({
      cvssScore: 5.0,
      assetCriticality: 'low',
    });

    expect(critical.score).toBeGreaterThan(base.score);
    expect(low.score).toBeLessThan(base.score);
  });

  it('kevBoost increases score even with zero CVSS', () => {
    const result = computeRiskScore({
      cvssScore: 0,
      kevListed: true,
      assetCriticality: 'medium',
    });

    expect(result.score).toBe(20);
    expect(result.riskLevel).toBe('LOW');
  });
});
