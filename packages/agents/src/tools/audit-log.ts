// ---------------------------------------------------------------------------
// Audit Log Tool
// ---------------------------------------------------------------------------
// Allows the agent to explicitly record observations or decisions to the
// audit trail. Read-only tools auto-log, but the agent can use this to
// record reasoning steps or flag items for human review.

import type { AgentTool } from './Tool.js';

interface AuditLogInput {
  event: string;
  details: string;
  severity?: 'info' | 'warning' | 'critical';
}

interface AuditLogOutput {
  recorded: boolean;
  entry_id: string;
}

export const auditLogTool: AgentTool<AuditLogInput, AuditLogOutput> = {
  name: 'audit-log',
  description:
    'Record an observation, reasoning step, or flag to the audit trail. Use this to document important decisions, escalation reasons, or items requiring human review. Every entry is immutable and timestamped.',
  inputSchema: {
    type: 'object',
    properties: {
      event: {
        type: 'string',
        description: 'Short event label (e.g. "escalation_reason", "conflicting_data", "manual_review_needed")',
      },
      details: {
        type: 'string',
        description: 'Detailed description of the observation or decision',
      },
      severity: {
        type: 'string',
        description: 'Severity level of the audit entry',
        enum: ['info', 'warning', 'critical'],
      },
    },
    required: ['event', 'details'],
  },
  isReadOnly: false,
  requiresApproval: false,

  async execute(input, ctx) {
    const entryId = `audit_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    ctx.auditLog.push({
      eventType: 'agent_task_completed',
      taskId: ctx.taskId,
      agentId: ctx.agentId,
      organizationId: ctx.organizationId,
      actorId: `tool:audit-log`,
      actionType: `agent_observation:${input.event}`,
      gateLevel: 0,
      inputHash: input.event,
      outputSummary: `[${input.severity ?? 'info'}] ${input.details.slice(0, 200)}`,
      decision: 'auto_pass',
    });

    return {
      recorded: true,
      entry_id: entryId,
    };
  },
};
