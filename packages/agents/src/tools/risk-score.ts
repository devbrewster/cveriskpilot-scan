// ---------------------------------------------------------------------------
// Risk Score Tool
// ---------------------------------------------------------------------------
// Wraps @cveriskpilot/enrichment's risk scoring engine.
// Computes a composite 0-100 risk score from CVSS, EPSS, KEV, and asset data.

import type { AgentTool } from './Tool.js';

interface RiskScoreInput {
  cvss_score?: number;
  epss_score?: number;
  kev_listed?: boolean;
  asset_criticality?: 'critical' | 'high' | 'medium' | 'low';
}

interface RiskScoreOutput {
  score: number;
  risk_level: string;
  breakdown: {
    base: number;
    epss_multiplier: number;
    kev_boost: number;
    env_multiplier: number;
  };
}

export const riskScoreTool: AgentTool<RiskScoreInput, RiskScoreOutput> = {
  name: 'risk-score',
  description:
    'Compute a composite risk score (0-100) from CVSS, EPSS, KEV status, and asset criticality. Returns the score, risk level (CRITICAL/HIGH/MEDIUM/LOW/INFO), and a transparent breakdown of each factor. Use this after gathering enrichment data to produce a final risk rating.',
  inputSchema: {
    type: 'object',
    properties: {
      cvss_score: {
        type: 'number',
        description: 'CVSS base score (0-10)',
      },
      epss_score: {
        type: 'number',
        description: 'EPSS probability score (0-1)',
      },
      kev_listed: {
        type: 'string',
        description: 'Whether the CVE is in the CISA KEV catalog (true/false)',
      },
      asset_criticality: {
        type: 'string',
        description: 'Asset criticality tier',
        enum: ['critical', 'high', 'medium', 'low'],
      },
    },
    required: [],
  },
  isReadOnly: true,
  requiresApproval: false,

  async execute(input) {
    const { computeRiskScore } = await import('@cveriskpilot/enrichment/scoring/risk-score');

    const result = computeRiskScore({
      cvssScore: input.cvss_score,
      epssScore: input.epss_score,
      kevListed: input.kev_listed,
      assetCriticality: input.asset_criticality,
    });

    return {
      score: result.score,
      risk_level: result.riskLevel,
      breakdown: {
        base: result.breakdown.base,
        epss_multiplier: result.breakdown.epssMultiplier,
        kev_boost: result.breakdown.kevBoost,
        env_multiplier: result.breakdown.envMultiplier,
      },
    };
  },
};
