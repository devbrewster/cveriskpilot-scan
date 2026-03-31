// ---------------------------------------------------------------------------
// NVD Lookup Tool
// ---------------------------------------------------------------------------
// Wraps @cveriskpilot/enrichment's NVD client. Fetches CVE details from NIST
// NVD API v2.0 including CVSS scores, CWE IDs, and description.

import type { AgentTool, ToolContext } from './Tool.js';

interface NvdLookupInput {
  cve_id: string;
}

interface NvdLookupOutput {
  found: boolean;
  cve_id: string;
  source: string;
  source_url: string;
  title?: string;
  description?: string;
  cvss_v3_score?: number;
  cvss_v3_vector?: string;
  cvss_v2_score?: number;
  cwe_ids?: string[];
  published_date?: string;
  last_modified?: string;
}

export const nvdLookupTool: AgentTool<NvdLookupInput, NvdLookupOutput> = {
  name: 'nvd-lookup',
  description:
    'Fetch CVE details from NIST NVD. Returns CVSS scores, CWE IDs, description, and publication dates. Use this as the primary source of truth for any CVE before making triage decisions.',
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
    const { fetchNvdCves } = await import('@cveriskpilot/enrichment/clients/nvd');
    const results = await fetchNvdCves([input.cve_id]);
    const data = results.get(input.cve_id);

    ctx.auditLog.push({
      eventType: 'agent_task_completed',
      taskId: ctx.taskId,
      agentId: ctx.agentId,
      organizationId: ctx.organizationId,
      actorId: 'tool:nvd-lookup',
      actionType: 'nvd_lookup',
      gateLevel: 0,
      inputHash: input.cve_id,
      outputSummary: data ? `NVD hit: CVSS ${data.cvssV3?.score ?? 'N/A'}` : 'NVD miss',
      decision: 'auto_pass',
    });

    if (!data) {
      return {
        found: false,
        cve_id: input.cve_id,
        source: 'NVD',
        source_url: `https://nvd.nist.gov/vuln/detail/${input.cve_id}`,
      };
    }

    return {
      found: true,
      cve_id: input.cve_id,
      source: 'NVD',
      source_url: `https://nvd.nist.gov/vuln/detail/${input.cve_id}`,
      title: data.title,
      description: data.description,
      cvss_v3_score: data.cvssV3?.score,
      cvss_v3_vector: data.cvssV3?.vector,
      cvss_v2_score: data.cvssV2?.score,
      cwe_ids: data.cweIds,
      published_date: data.publishedDate,
      last_modified: data.lastModified,
    };
  },
};
