// ---------------------------------------------------------------------------
// Agent Tool Interface
// ---------------------------------------------------------------------------
// Inspired by Claude Code's tool architecture. Each tool is self-contained:
// schema (for LLM tool_use), execute function, and metadata.
// Tools wrap existing @cveriskpilot/* packages — no new external dependencies.

import type { AuditLogEntry } from '../types.js';

/**
 * Execution context passed to every tool invocation.
 * Carries org-scoped state so tools enforce tenant isolation.
 */
export interface ToolContext {
  organizationId: string;
  taskId: string;
  agentId: string;
  /** Append-only audit trail for this agent run */
  auditLog: Array<Omit<AuditLogEntry, 'id' | 'timestamp'>>;
}

/**
 * JSON Schema property definition for Anthropic tool_use parameters.
 */
export interface JsonSchemaProperty {
  type: string;
  description: string;
  enum?: string[];
  items?: JsonSchemaProperty;
  default?: unknown;
}

/**
 * Tool input schema in JSON Schema format (Anthropic tool_use compatible).
 */
export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
}

/**
 * Core tool interface. Every agentic tool implements this.
 *
 * Generic params:
 *  TInput  — validated input from the LLM's tool_use block
 *  TOutput — structured output fed back as tool_result
 */
export interface AgentTool<TInput = Record<string, unknown>, TOutput = unknown> {
  /** Unique tool name matching the Anthropic tool_use `name` field */
  name: string;

  /** Short description the LLM reads to decide when to invoke this tool */
  description: string;

  /** JSON Schema for the tool's input parameters */
  inputSchema: ToolInputSchema;

  /** Whether this tool only reads data (no side effects) */
  isReadOnly: boolean;

  /**
   * Whether invocation requires HITL approval before execution.
   * If true, the loop pauses and returns a pending gate decision.
   */
  requiresApproval: boolean;

  /** Execute the tool. Throws on unrecoverable errors. */
  execute(input: TInput, ctx: ToolContext): Promise<TOutput>;
}

/**
 * Anthropic API tool definition format.
 * Generated from AgentTool for passing to messages.create().
 */
export interface AnthropicToolDef {
  name: string;
  description: string;
  input_schema: ToolInputSchema;
}

/** Convert an AgentTool to the Anthropic API tool definition format. */
export function toAnthropicToolDef(tool: AgentTool): AnthropicToolDef {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  };
}
