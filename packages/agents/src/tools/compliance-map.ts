// ---------------------------------------------------------------------------
// Compliance Mapping Tool
// ---------------------------------------------------------------------------
// Wraps @cveriskpilot/compliance's cross-framework mapping engine.
// Maps CWE IDs to affected controls across NIST 800-53, CMMC, SOC2,
// FedRAMP, ASVS, GDPR, HIPAA, PCI DSS, and ISO 27001.

import type { AgentTool } from './Tool.js';

interface ComplianceMapInput {
  cwe_ids: string[];
  frameworks?: string[];
}

interface ControlRef {
  framework: string;
  control_id: string;
  control_title: string;
}

interface ComplianceMapOutput {
  total_affected_controls: number;
  controls: ControlRef[];
  framework_summary: Array<{
    framework: string;
    affected_count: number;
    control_ids: string[];
  }>;
}

export const complianceMapTool: AgentTool<ComplianceMapInput, ComplianceMapOutput> = {
  name: 'compliance-map',
  description:
    'Map CWE weakness IDs to affected compliance framework controls. Covers NIST 800-53, CMMC, SOC2, FedRAMP, ASVS, GDPR, HIPAA, PCI DSS, and ISO 27001. Use this to determine the compliance impact of a vulnerability.',
  inputSchema: {
    type: 'object',
    properties: {
      cwe_ids: {
        type: 'string',
        description: 'Array of CWE identifiers (e.g. ["CWE-79", "CWE-89"])',
        items: { type: 'string', description: 'CWE identifier' },
      },
      frameworks: {
        type: 'string',
        description: 'Optional: filter to specific frameworks (e.g. ["soc2", "nist"]). Omit for all frameworks.',
        items: { type: 'string', description: 'Framework ID' },
      },
    },
    required: ['cwe_ids'],
  },
  isReadOnly: true,
  requiresApproval: false,

  async execute(input, ctx) {
    const { mapCweToAllFrameworks } = await import(
      '@cveriskpilot/compliance/mapping/cross-framework'
    );

    const allControls: ControlRef[] = [];
    const frameworkCounts = new Map<string, Set<string>>();

    for (const cweId of input.cwe_ids) {
      const mappings = mapCweToAllFrameworks(cweId);

      for (const mapping of mappings) {
        for (const ctrl of mapping.mappedControls) {
          // Filter by requested frameworks if specified
          if (input.frameworks && input.frameworks.length > 0) {
            const match = input.frameworks.some(
              (f) => ctrl.frameworkId.toLowerCase().includes(f.toLowerCase()),
            );
            if (!match) continue;
          }

          const key = `${ctrl.frameworkId}:${ctrl.controlId}`;
          if (!frameworkCounts.has(ctrl.frameworkId)) {
            frameworkCounts.set(ctrl.frameworkId, new Set());
          }
          const fwSet = frameworkCounts.get(ctrl.frameworkId)!;

          // Deduplicate
          if (!fwSet.has(ctrl.controlId)) {
            fwSet.add(ctrl.controlId);
            allControls.push({
              framework: ctrl.frameworkName,
              control_id: ctrl.controlId,
              control_title: ctrl.controlTitle,
            });
          }
        }
      }
    }

    ctx.auditLog.push({
      eventType: 'agent_task_completed',
      taskId: ctx.taskId,
      agentId: ctx.agentId,
      organizationId: ctx.organizationId,
      actorId: 'tool:compliance-map',
      actionType: 'compliance_mapping',
      gateLevel: 0,
      inputHash: input.cwe_ids.join(','),
      outputSummary: `Mapped ${input.cwe_ids.length} CWEs to ${allControls.length} controls`,
      decision: 'auto_pass',
    });

    const frameworkSummary = [...frameworkCounts.entries()].map(([fwId, ids]) => ({
      framework: fwId,
      affected_count: ids.size,
      control_ids: [...ids],
    }));

    return {
      total_affected_controls: allControls.length,
      controls: allControls,
      framework_summary: frameworkSummary,
    };
  },
};
