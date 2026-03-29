// ---------------------------------------------------------------------------
// Agent Runner
// ---------------------------------------------------------------------------
// Execution layer between agent task records and the orchestrator.
// Handles full task lifecycle: queued -> running -> awaiting_hitl / completed / failed.
//
// The runner is decoupled from persistence — callers supply get/update callbacks
// so this works with Prisma, in-memory stores, or JSON file stores.

import type {
  AgentTask,
  AgentTaskUpdate,
  OrchestratorResult,
} from "./types";

import { runAgent } from "./orchestrator";

import {
  CVE_TRIAGE_SYSTEM_PROMPT,
  buildCveTriageTaskPrompt,
} from "./prompts/cve-triage";
import {
  PRODUCT_ENGINEERING_SYSTEM_PROMPT,
  buildProductEngineeringTaskPrompt,
} from "./prompts/product-eng";
import {
  CUSTOMER_OPS_SYSTEM_PROMPT,
  buildCustomerOpsTaskPrompt,
} from "./prompts/customer-ops";
import {
  GROWTH_SYSTEM_PROMPT,
  buildGrowthTaskPrompt,
} from "./prompts/growth";

// ---------------------------------------------------------------------------
// Task Store interface — injected by the caller
// ---------------------------------------------------------------------------

/**
 * Minimal persistence interface the runner needs. The web layer implements
 * this with Prisma or a JSON file store; tests can use an in-memory map.
 */
export interface TaskStore {
  getTask(id: string): Promise<AgentTask | null>;
  updateTask(id: string, updates: AgentTaskUpdate): Promise<AgentTask | null>;
  listTasks(
    organizationId: string,
    opts?: { status?: string; limit?: number },
  ): Promise<AgentTask[]>;
}

/**
 * Optional finding resolver — used by the CVE triage agent to hydrate
 * finding data from the payload's findingIds.
 */
export interface FindingResolver {
  findById(
    findingId: string,
    organizationId: string,
  ): Promise<{
    vulnerabilityId?: string | null;
    evidence?: {
      cvssScore?: number | null;
      cvssVector?: string | null;
      kevKnown?: boolean;
      epssScore?: number | null;
    };
    asset?: {
      locator?: string;
      internetExposed?: boolean;
      businessCriticality?: string;
      dataClassification?: string;
    };
  } | null>;
}

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface AgentRunResult {
  task: AgentTask;
  result: OrchestratorResult;
}

// ---------------------------------------------------------------------------
// Prompt builders per agent
// ---------------------------------------------------------------------------

async function buildTriagePrompt(
  task: AgentTask,
  findingResolver?: FindingResolver,
): Promise<string> {
  const findingIds = (task.payload?.findingIds as string[] | undefined) ?? [];
  const findingId = findingIds[0];
  if (!findingId) {
    return "No finding provided. Please pass at least one findingId in the task payload.";
  }

  if (!findingResolver) {
    return `Triage finding ${findingId}. No finding resolver available — work with the payload data only.\n\nPayload: ${JSON.stringify(task.payload)}`;
  }

  const finding = await findingResolver.findById(findingId, task.organizationId);
  if (!finding) {
    return `Finding ${findingId} not found for this organization.`;
  }

  return buildCveTriageTaskPrompt({
    cveId: finding.vulnerabilityId ?? "UNKNOWN",
    cvssScore: finding.evidence?.cvssScore ?? null,
    cvssVector: finding.evidence?.cvssVector ?? null,
    kevKnown: finding.evidence?.kevKnown ?? false,
    epssScore: finding.evidence?.epssScore ?? null,
    assetName: finding.asset?.locator ?? "unknown",
    networkZone: finding.asset?.internetExposed ? "public" : "internal",
    criticalityTier: finding.asset?.businessCriticality ?? "unknown",
    isInternetReachable: finding.asset?.internetExposed ?? false,
    complianceScopes: finding.asset?.dataClassification
      ? [finding.asset.dataClassification]
      : [],
    compensatingControls: [],
    existingRationale: undefined,
  });
}

function buildProductEngineeringPrompt(task: AgentTask): string {
  const p = task.payload ?? {};
  return buildProductEngineeringTaskPrompt({
    taskDescription: (p.taskDescription as string | undefined) ?? "No description provided.",
    relevantFindings: (p.relevantFindings as string[] | undefined) ?? [],
    releaseVersion: (p.releaseVersion as string | undefined) ?? undefined,
    sprintContext: (p.sprintContext as string | undefined) ?? undefined,
  });
}

function buildCustomerOpsPrompt(task: AgentTask): string {
  const p = task.payload ?? {};
  return buildCustomerOpsTaskPrompt({
    subject: (p.subject as string | undefined) ?? "(no subject)",
    body: (p.body as string | undefined) ?? "(no body)",
    orgTier: (p.orgTier as string | undefined) ?? undefined,
    activeFindingCount: (p.activeFindingCount as number | undefined) ?? undefined,
    billingStatus: (p.billingStatus as string | undefined) ?? undefined,
  });
}

function buildGrowthPrompt(task: AgentTask): string {
  const p = task.payload ?? {};
  const contentType = (p.contentType as string | undefined) ?? "social_post";
  return buildGrowthTaskPrompt({
    contentType: contentType as Parameters<typeof buildGrowthTaskPrompt>[0]["contentType"],
    releaseVersion: (p.releaseVersion as string | undefined) ?? undefined,
    featureList: (p.featureList as string[] | undefined) ?? [],
    targetAudience: (p.targetAudience as string | undefined) ?? undefined,
    keyMessages: (p.keyMessages as string[] | undefined) ?? [],
    tone: (p.tone as string | undefined) ?? undefined,
  });
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

/**
 * Execute a single agent task end-to-end.
 * Updates the task record throughout the lifecycle via the injected store.
 * Throws on fatal errors after marking the task as failed.
 */
export async function executeAgentTask(
  taskId: string,
  organizationId: string,
  store: TaskStore,
  findingResolver?: FindingResolver,
): Promise<AgentRunResult> {
  const task = await store.getTask(taskId);
  if (!task) throw new Error(`Task ${taskId} not found.`);
  if (task.organizationId !== organizationId) {
    throw new Error("Task does not belong to this organization.");
  }
  if (task.status !== "queued") {
    throw new Error(`Task ${taskId} is not queued (status: ${task.status}).`);
  }

  // Mark running
  const running = await store.updateTask(taskId, { status: "running" });
  if (!running) throw new Error("Failed to update task status.");

  try {
    let systemPrompt: string;
    let taskPrompt: string;

    switch (task.agentId) {
      case "cve-triage":
        systemPrompt = CVE_TRIAGE_SYSTEM_PROMPT;
        taskPrompt = await buildTriagePrompt(task, findingResolver);
        break;
      case "product-engineer":
        systemPrompt = PRODUCT_ENGINEERING_SYSTEM_PROMPT;
        taskPrompt = buildProductEngineeringPrompt(task);
        break;
      case "customer-ops":
        systemPrompt = CUSTOMER_OPS_SYSTEM_PROMPT;
        taskPrompt = buildCustomerOpsPrompt(task);
        break;
      case "growth":
        systemPrompt = GROWTH_SYSTEM_PROMPT;
        taskPrompt = buildGrowthPrompt(task);
        break;
      default:
        throw new Error(`Unknown agentId: ${task.agentId}`);
    }

    const result = await runAgent({
      agentId: task.agentId,
      taskId: task.id,
      organizationId: task.organizationId,
      triggeredBy: task.triggeredBy,
      systemPrompt,
      taskPrompt,
      payload: task.payload,
    });

    // Gate decision determines next status
    const nextStatus = result.gateDecision.gateLevel === 0 ? "completed" : "awaiting_hitl";
    const updated = await store.updateTask(taskId, {
      status: nextStatus,
      outputRef: result.rawOutput.slice(0, 2000),
    });

    return { task: updated ?? running, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await store.updateTask(taskId, {
      status: "failed",
      errorMessage: message,
    });
    throw err;
  }
}

/**
 * Find the oldest queued task for an org and execute it.
 * Returns null if no queued tasks are available.
 */
export async function runNextQueuedTask(
  organizationId: string,
  store: TaskStore,
  findingResolver?: FindingResolver,
): Promise<AgentRunResult | null> {
  const tasks = await store.listTasks(organizationId, {
    status: "queued",
    limit: 1,
  });

  const next = tasks[0];
  if (!next) return null;

  return executeAgentTask(next.id, organizationId, store, findingResolver);
}
