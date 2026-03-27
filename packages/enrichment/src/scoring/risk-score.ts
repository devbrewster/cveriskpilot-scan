import type {
  AssetCriticality,
  RiskLevel,
  RiskScoreInput,
  RiskScoreResult,
} from '../types';

const ENV_MULTIPLIERS: Record<AssetCriticality, number> = {
  critical: 1.5,
  high: 1.2,
  medium: 1.0,
  low: 0.8,
};

function getRiskLevel(score: number): RiskLevel {
  if (score >= 90) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  if (score >= 20) return 'LOW';
  return 'INFO';
}

/**
 * Compute a composite risk score (0-100) from multiple signals.
 *
 * Formula:
 *   baseScore = cvssScore * 10 (normalized to 0-100)
 *   epssMultiplier = 1 + (epssScore * 2)   // high EPSS => up to 3x
 *   kevBoost = kevListed ? 20 : 0           // KEV adds flat 20 points
 *   environmentMultiplier based on asset criticality
 *
 *   rawScore = (baseScore * epssMultiplier + kevBoost) * environmentMultiplier
 *   finalScore = min(100, round(rawScore))
 */
export function computeRiskScore(params: RiskScoreInput): RiskScoreResult {
  const { cvssScore, epssScore, kevListed, assetCriticality } = params;

  const base = (cvssScore ?? 0) * 10;
  const epssMultiplier = 1 + (epssScore ?? 0) * 2;
  const kevBoost = kevListed ? 20 : 0;
  const envMultiplier = ENV_MULTIPLIERS[assetCriticality ?? 'medium'];

  const rawScore = (base * epssMultiplier + kevBoost) * envMultiplier;
  const score = Math.min(100, Math.round(rawScore));

  return {
    score,
    breakdown: {
      base,
      epssMultiplier,
      kevBoost,
      envMultiplier,
    },
    riskLevel: getRiskLevel(score),
  };
}
