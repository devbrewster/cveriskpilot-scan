// ---------------------------------------------------------------------------
// Agent System — Types
// ---------------------------------------------------------------------------
// Self-contained type definitions for the agent orchestration system.
// These are independent of Prisma — the web layer maps to/from DB models.

/** Supported agent identifiers */
export type AgentId =
  | "cve-triage"
  | "product-engineer"
  | "customer-ops"
  | "growth";

/** Task lifecycle states */
export type AgentTaskStatus =
  | "queued"
  | "running"
  | "awaiting_hitl"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * HITL gate levels — higher = more authority required.
 *  0 = auto-pass (no human needed)
 *  1 = analyst
 *  2 = architect
 *  3 = owner
 *  4 = legal
 */
export type GateLevel = 0 | 1 | 2 | 3 | 4;

/** Actions that may require HITL approval */
export type ApprovalActionType =
  | "save_review_decision"
  | "save_not_applicable"
  | "claim_compensating_control"
  | "mark_false_positive"
  | "finalize_poam"
  | "close_poam_early"
  | "override_sla"
  | "change_scoring_algorithm"
  | "export_finding_data"
  | "delete_org_data"
  | "send_customer_email"
  | "create_jira_issue"
  | "update_jira_issue"
  | "publish_social_post"
  | "respond_to_disclosure"
  | "execute_incident_playbook";

/** Input to create a new agent task */
export interface AgentTaskInput {
  agentId: AgentId;
  organizationId: string;
  triggeredBy: string;
  inputRef?: string;
  payload: Record<string, unknown>;
  hitlGateLevel?: GateLevel;
}

/** Full agent task record (mirrors what a DB row would look like) */
export interface AgentTask {
  id: string;
  agentId: AgentId;
  organizationId: string;
  triggeredBy: string;
  status: AgentTaskStatus;
  inputRef: string | null;
  payload: Record<string, unknown>;
  outputRef: string | null;
  hitlGateLevel: GateLevel;
  hitlDecision: "approved" | "rejected" | "pending" | null;
  hitlDecidedByUserId: string | null;
  hitlDecidedAt: string | null;
  hitlNotes: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

/** Mutable fields for task updates */
export interface AgentTaskUpdate {
  status?: AgentTaskStatus;
  outputRef?: string;
  hitlDecision?: "approved" | "rejected" | "pending";
  hitlDecidedByUserId?: string;
  hitlNotes?: string;
  errorMessage?: string;
}

/** Tool-set definition for an agent */
export interface AgentToolSet {
  agentId: AgentId;
  allowedTools: string[];
  systemPromptKey: string;
}

/** Audit event types for agent operations */
export type AuditEventType =
  | "agent_task_created"
  | "agent_task_started"
  | "agent_task_completed"
  | "agent_task_failed"
  | "agent_task_cancelled"
  | "approval_requested"
  | "approval_auto_passed"
  | "approval_approved"
  | "approval_rejected"
  | "approval_expired";

/** Audit log entry */
export interface AuditLogEntry {
  id: string;
  eventType: AuditEventType;
  taskId: string;
  agentId: string;
  organizationId: string;
  actorId: string;
  actionType: string;
  gateLevel: number;
  inputHash: string;
  outputSummary: string;
  decision: "auto_pass" | "approved" | "rejected" | "pending" | "cancelled" | "failed";
  timestamp: string;
  notes?: string;
}

/** Gate evaluation result */
export type GateDecision =
  | { outcome: "auto_pass"; gateLevel: 0 }
  | { outcome: "hitl_required"; gateLevel: GateLevel; requiredApproverRole: string };

/** Normalised agent output wrapper */
export type NormalisedResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; rawOutput: string };

/** Orchestrator input */
export interface OrchestratorInput {
  agentId: AgentId;
  taskId: string;
  organizationId: string;
  triggeredBy: string;
  systemPrompt: string;
  taskPrompt: string;
  payload: Record<string, unknown>;
  postRunAction?: {
    actionType: ApprovalActionType;
    requiresGate: boolean;
  };
}

/** Orchestrator result */
export interface OrchestratorResult {
  taskId: string;
  agentId: AgentId;
  rawOutput: string;
  gateDecision: GateDecision;
  completedAt: string;
}

/** Dispatch input for triage tasks triggered by uploads */
export interface TriageDispatchInput {
  organizationId: string;
  uploadJobId: string;
  findingIds: string[];
  triggeredBy: string;
}
