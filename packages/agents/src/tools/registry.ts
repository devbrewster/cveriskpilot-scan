// ---------------------------------------------------------------------------
// Tool Registry
// ---------------------------------------------------------------------------
// Central registry mapping tool names to implementations.
// The orchestrator filters this by agent's allowedTools list.

import type { AgentTool, AnthropicToolDef } from './Tool.js';
import { toAnthropicToolDef } from './Tool.js';

import { nvdLookupTool } from './nvd-lookup.js';
import { cisaKevTool } from './cisa-kev.js';
import { epssScoreTool } from './epss-score.js';
import { cvssCalculatorTool } from './cvss-calculator.js';
import { complianceMapTool } from './compliance-map.js';
import { riskScoreTool } from './risk-score.js';
import { auditLogTool } from './audit-log.js';

// Master registry — all available tools
const ALL_TOOLS: AgentTool<any, any>[] = [
  nvdLookupTool,
  cisaKevTool,
  epssScoreTool,
  cvssCalculatorTool,
  complianceMapTool,
  riskScoreTool,
  auditLogTool,
];

const TOOL_MAP = new Map<string, AgentTool<any, any>>(
  ALL_TOOLS.map((t) => [t.name, t]),
);

/** Get a tool by name. Returns undefined if not registered. */
export function getTool(name: string): AgentTool<any, any> | undefined {
  return TOOL_MAP.get(name);
}

/** Get all registered tool names. */
export function getAllToolNames(): string[] {
  return [...TOOL_MAP.keys()];
}

/**
 * Resolve an agent's allowed tool names to concrete tool instances.
 * Silently skips names that don't map to registered tools (e.g. "notification"
 * which is handled externally).
 */
export function resolveTools(allowedToolNames: string[]): AgentTool<any, any>[] {
  const tools: AgentTool<any, any>[] = [];
  for (const name of allowedToolNames) {
    const tool = TOOL_MAP.get(name);
    if (tool) tools.push(tool);
  }
  return tools;
}

/** Convert resolved tools to Anthropic API format. */
export function resolveAnthropicToolDefs(allowedToolNames: string[]): AnthropicToolDef[] {
  return resolveTools(allowedToolNames).map(toAnthropicToolDef);
}
