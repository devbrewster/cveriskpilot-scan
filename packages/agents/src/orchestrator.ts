// ---------------------------------------------------------------------------
// Agent Orchestrator
// ---------------------------------------------------------------------------
// Main entry point for dispatching agent tasks. Builds context, calls the
// Anthropic API (via @cveriskpilot/ai's shared client), evaluates the HITL
// approval gate, and writes to the audit log.

import type {
  AgentId,
  ApprovalActionType,
  GateLevel,
  GateDecision,
  OrchestratorInput,
  OrchestratorResult,
  AgentToolSet,
  AuditLogEntry,
  NormalisedResult,
} from "./types.js";

import { runAgentLoop } from "./loop.js";
import type { LoopResult } from "./loop.js";
import type { ToolCallRecord } from "./types.js";

// ---------------------------------------------------------------------------
// Agent Router — maps agentId to allowed tool sets
// ---------------------------------------------------------------------------

const AGENT_TOOL_SETS: Record<AgentId, AgentToolSet> = {
  "cve-triage": {
    agentId: "cve-triage",
    allowedTools: [
      "nvd-lookup",
      "kev-lookup",
      "epss-lookup",
      "cvss-parser",
      "compliance-map",
      "risk-score",
      "audit-log",
    ],
    systemPromptKey: "CVE_TRIAGE_SYSTEM_PROMPT",
  },
  "product-engineer": {
    agentId: "product-engineer",
    allowedTools: ["jira", "notification", "report-export"],
    systemPromptKey: "PRODUCT_ENGINEERING_SYSTEM_PROMPT",
  },
  "customer-ops": {
    agentId: "customer-ops",
    allowedTools: ["notification", "workspace-setup", "report-export", "scan-parser"],
    systemPromptKey: "CUSTOMER_OPS_SYSTEM_PROMPT",
  },
  growth: {
    agentId: "growth",
    allowedTools: ["notification", "report-export", "workspace-setup"],
    systemPromptKey: "GROWTH_SYSTEM_PROMPT",
  },
};

/** Agents that use the iterative tool-calling loop instead of single-shot */
const TOOL_LOOP_AGENTS: Set<AgentId> = new Set(["cve-triage"]);

export function getAgentToolSet(agentId: AgentId): AgentToolSet {
  return AGENT_TOOL_SETS[agentId];
}

export function isToolAllowed(agentId: AgentId, toolName: string): boolean {
  return AGENT_TOOL_SETS[agentId]?.allowedTools.includes(toolName) ?? false;
}

// ---------------------------------------------------------------------------
// Context Builder
// ---------------------------------------------------------------------------

export interface AgentContext {
  agentId: AgentId;
  taskId: string;
  organizationId: string;
  triggeredBy: string;
  payload: Record<string, unknown>;
  buildTimestamp: string;
}

export function buildAgentContext(params: {
  agentId: AgentId;
  taskId: string;
  organizationId: string;
  triggeredBy: string;
  payload: Record<string, unknown>;
}): AgentContext {
  return {
    ...params,
    buildTimestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

export async function writeAuditEntry(
  entry: Omit<AuditLogEntry, "id" | "timestamp">,
): Promise<AuditLogEntry> {
  const fullEntry: AuditLogEntry = {
    ...entry,
    id: `audit_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
  };

  // Development: log to console; production: write to persistent store
  if (process.env["NODE_ENV"] !== "production") {
    console.log("[audit]", JSON.stringify(fullEntry));
  }

  return fullEntry;
}

// ---------------------------------------------------------------------------
// HITL Approval Gate
// ---------------------------------------------------------------------------

const GATE_RULES: Record<ApprovalActionType, GateLevel> = {
  save_review_decision: 1,
  save_not_applicable: 1,
  claim_compensating_control: 2,
  mark_false_positive: 1,
  finalize_poam: 2,
  close_poam_early: 3,
  override_sla: 3,
  change_scoring_algorithm: 3,
  export_finding_data: 3,
  delete_org_data: 3,
  send_customer_email: 1,
  create_jira_issue: 1,
  update_jira_issue: 1,
  publish_social_post: 3,
  respond_to_disclosure: 3,
  execute_incident_playbook: 3,
};

const APPROVER_ROLES: Record<GateLevel, string> = {
  0: "system",
  1: "analyst",
  2: "architect",
  3: "owner",
  4: "legal",
};

export function evaluateGate(
  actionType: ApprovalActionType,
  overrideLevel?: GateLevel,
): GateDecision {
  const baseLevel = GATE_RULES[actionType] ?? 1;
  const effectiveLevel =
    overrideLevel !== undefined
      ? (Math.max(baseLevel, overrideLevel) as GateLevel)
      : baseLevel;

  if (effectiveLevel === 0) {
    return { outcome: "auto_pass", gateLevel: 0 };
  }

  return {
    outcome: "hitl_required",
    gateLevel: effectiveLevel,
    requiredApproverRole: APPROVER_ROLES[effectiveLevel],
  };
}

export async function processGateDecision(params: {
  taskId: string;
  agentId: string;
  organizationId: string;
  actionType: ApprovalActionType;
  payload: Record<string, unknown>;
  overrideLevel?: GateLevel;
}): Promise<GateDecision> {
  const decision = evaluateGate(params.actionType, params.overrideLevel);

  if (decision.outcome === "auto_pass") {
    await writeAuditEntry({
      eventType: "approval_auto_passed",
      taskId: params.taskId,
      agentId: params.agentId,
      organizationId: params.organizationId,
      actorId: "system",
      actionType: params.actionType,
      gateLevel: 0,
      inputHash: hashPayload(params.payload),
      outputSummary: `Auto-passed: ${params.actionType}`,
      decision: "auto_pass",
    });
  } else {
    await writeAuditEntry({
      eventType: "approval_requested",
      taskId: params.taskId,
      agentId: params.agentId,
      organizationId: params.organizationId,
      actorId: "system",
      actionType: params.actionType,
      gateLevel: decision.gateLevel,
      inputHash: hashPayload(params.payload),
      outputSummary: `HITL required: ${params.actionType} (level ${decision.gateLevel})`,
      decision: "pending",
    });
  }

  return decision;
}

// ---------------------------------------------------------------------------
// Result Normaliser
// ---------------------------------------------------------------------------

export function normaliseAgentResult<T>(
  rawOutput: string,
  validator: (parsed: unknown) => T,
): NormalisedResult<T> {
  try {
    const cleaned = rawOutput
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed: unknown = JSON.parse(cleaned);
    const validated = validator(parsed);
    return { ok: true, data: validated };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unknown parse error",
      rawOutput,
    };
  }
}

// ---------------------------------------------------------------------------
// Main Orchestrator
// ---------------------------------------------------------------------------

/**
 * Execute an agent task end-to-end:
 * 1. Build context
 * 2. Write "started" audit entry
 * 3. Call Claude — either via tool-calling loop or single-shot
 * 4. Write "completed" audit entry
 * 5. Evaluate HITL gate
 * 6. Return result (with toolCalls if loop was used)
 */
export async function runAgent(input: OrchestratorInput): Promise<OrchestratorResult> {
  const context = buildAgentContext({
    agentId: input.agentId,
    taskId: input.taskId,
    organizationId: input.organizationId,
    triggeredBy: input.triggeredBy,
    payload: input.payload,
  });

  const agentToolSet = getAgentToolSet(input.agentId);

  await writeAuditEntry({
    eventType: "agent_task_started",
    taskId: input.taskId,
    agentId: input.agentId,
    organizationId: input.organizationId,
    actorId: context.triggeredBy,
    actionType: "run_agent",
    gateLevel: 0,
    inputHash: "0",
    outputSummary: `Starting agent: ${input.agentId}`,
    decision: "pending",
  });

  let rawOutput: string;
  let toolCalls: ToolCallRecord[] | undefined;
  let loopResult: LoopResult | undefined;

  if (TOOL_LOOP_AGENTS.has(input.agentId)) {
    // ---- Agentic tool-calling loop ----
    loopResult = await runAgentLoop(input.taskPrompt, {
      maxIterations: 10,
      model: "claude-sonnet-4-20250514",
      maxTokens: 4096,
      allowedTools: agentToolSet.allowedTools,
      systemPrompt: input.systemPrompt,
      toolContext: {
        organizationId: input.organizationId,
        taskId: input.taskId,
        agentId: input.agentId,
        auditLog: [],
      },
    });

    rawOutput = loopResult.finalResponse;
    toolCalls = loopResult.toolCalls;

    // Write tool audit entries
    for (const entry of loopResult.auditLog) {
      await writeAuditEntry(entry);
    }
  } else {
    // ---- Single-shot (non-tool agents) ----
    const { getClient } = await import("@cveriskpilot/ai");
    const client = getClient();

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: input.systemPrompt,
      messages: [{ role: "user", content: input.taskPrompt }],
    });

    rawOutput = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");
  }

  await writeAuditEntry({
    eventType: "agent_task_completed",
    taskId: input.taskId,
    agentId: input.agentId,
    organizationId: input.organizationId,
    actorId: "system",
    actionType: "run_agent",
    gateLevel: 0,
    inputHash: "0",
    outputSummary: `Agent completed (${toolCalls?.length ?? 0} tool calls): ${rawOutput.slice(0, 200)}`,
    decision: "auto_pass",
  });

  const actionType = input.postRunAction?.actionType ?? "save_review_decision";
  const gateDecision = await processGateDecision({
    taskId: input.taskId,
    agentId: input.agentId,
    organizationId: input.organizationId,
    actionType,
    payload: input.payload,
  });

  return {
    taskId: input.taskId,
    agentId: input.agentId,
    rawOutput,
    gateDecision,
    completedAt: new Date().toISOString(),
    toolCalls,
    iterations: loopResult?.iterations,
    truncated: loopResult?.truncated,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashPayload(payload: Record<string, unknown>): string {
  const str = JSON.stringify(payload, Object.keys(payload).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
