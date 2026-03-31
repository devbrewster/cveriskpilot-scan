// ---------------------------------------------------------------------------
// EPSS Score Tool
// ---------------------------------------------------------------------------
// Wraps @cveriskpilot/enrichment's EPSS client. Fetches exploit prediction
// scoring from FIRST.org.

import type { AgentTool, ToolContext } from './Tool.js';

interface EpssScoreInput {
  cve_id: string;
}

interface EpssScoreOutput {
  found: boolean;
  cve_id: string;
  source: string;
  source_url: string;
  epss_score?: number;
  epss_percentile?: number;
  score_date?: string;
}

export const epssScoreTool: AgentTool<EpssScoreInput, EpssScoreOutput> = {
  name: 'epss-lookup',
  description:
    'Fetch EPSS (Exploit Prediction Scoring System) data from FIRST.org. Returns the probability (0-1) that a CVE will be exploited in the next 30 days and its percentile rank. Use alongside CVSS for risk prioritization.',
  inputSchema: {
    type: 'object',
    properties: {
      cve_id: {
        type: 'string',
        description: 'CVE identifier (e.g. CVE-2024-3094)',
      },
    },
    required: ['cve_id'],
  },
  isReadOnly: true,
  requiresApproval: false,

  async execute(input, ctx) {
    const { fetchEpssScores } = await import('@cveriskpilot/enrichment/clients/epss');
    const results = await fetchEpssScores([input.cve_id]);
    const data = results.get(input.cve_id);

    ctx.auditLog.push({
      eventType: 'agent_task_completed',
      taskId: ctx.taskId,
      agentId: ctx.agentId,
      organizationId: ctx.organizationId,
      actorId: 'tool:epss-lookup',
      actionType: 'epss_lookup',
      gateLevel: 0,
      inputHash: input.cve_id,
      outputSummary: data
        ? `EPSS: ${(data.score * 100).toFixed(2)}% (p${data.percentile.toFixed(0)})`
        : 'No EPSS data',
      decision: 'auto_pass',
    });

    if (!data) {
      return {
        found: false,
        cve_id: input.cve_id,
        source: 'FIRST EPSS',
        source_url: `https://api.first.org/data/v1/epss?cve=${input.cve_id}`,
      };
    }

    return {
      found: true,
      cve_id: input.cve_id,
      source: 'FIRST EPSS',
      source_url: `https://api.first.org/data/v1/epss?cve=${input.cve_id}`,
      epss_score: data.score,
      epss_percentile: data.percentile,
      score_date: data.date,
    };
  },
};
