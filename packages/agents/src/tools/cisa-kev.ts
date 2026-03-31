// ---------------------------------------------------------------------------
// CISA KEV Check Tool
// ---------------------------------------------------------------------------
// Wraps @cveriskpilot/enrichment's KEV client. Checks if a CVE appears in
// CISA's Known Exploited Vulnerabilities catalog.

import type { AgentTool, ToolContext } from './Tool.js';

interface CisaKevInput {
  cve_id: string;
}

interface CisaKevOutput {
  kev_listed: boolean;
  cve_id: string;
  source: string;
  source_url: string;
  vendor_project?: string;
  product?: string;
  vulnerability_name?: string;
  date_added?: string;
  required_action?: string;
  due_date?: string;
  known_ransomware_use?: boolean;
}

export const cisaKevTool: AgentTool<CisaKevInput, CisaKevOutput> = {
  name: 'kev-lookup',
  description:
    'Check if a CVE is in the CISA Known Exploited Vulnerabilities catalog. KEV listing means the vulnerability is actively exploited in the wild and has a mandatory remediation deadline for federal agencies. Always check this before triage decisions.',
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
    const { loadKevCatalog, checkKev } = await import('@cveriskpilot/enrichment/clients/kev');
    const catalog = await loadKevCatalog();
    const matches = checkKev(catalog, [input.cve_id]);
    const match = matches[0];

    ctx.auditLog.push({
      eventType: 'agent_task_completed',
      taskId: ctx.taskId,
      agentId: ctx.agentId,
      organizationId: ctx.organizationId,
      actorId: 'tool:kev-lookup',
      actionType: 'kev_check',
      gateLevel: 0,
      inputHash: input.cve_id,
      outputSummary: match ? `KEV listed: due ${match.kevData.dueDate}` : 'Not in KEV',
      decision: 'auto_pass',
    });

    if (!match) {
      return {
        kev_listed: false,
        cve_id: input.cve_id,
        source: 'CISA KEV',
        source_url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
      };
    }

    return {
      kev_listed: true,
      cve_id: input.cve_id,
      source: 'CISA KEV',
      source_url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
      vendor_project: match.kevData.vendorProject,
      product: match.kevData.product,
      vulnerability_name: match.kevData.vulnerabilityName,
      date_added: match.kevData.dateAdded,
      required_action: match.kevData.requiredAction,
      due_date: match.kevData.dueDate,
      known_ransomware_use: match.kevData.knownRansomwareCampaignUse,
    };
  },
};
