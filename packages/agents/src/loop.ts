// ---------------------------------------------------------------------------
// Agentic Tool-Calling Loop
// ---------------------------------------------------------------------------
// Core loop that implements the Anthropic tool_use protocol:
//   1. Send messages + tool definitions to Claude
//   2. If Claude responds with tool_use blocks, execute each tool
//   3. Feed tool_result blocks back as the next user message
//   4. Repeat until Claude responds with text only (no more tool calls)
//
// This replaces the single-shot API call in the original orchestrator,
// enabling the LLM to iteratively gather data before making decisions.

import type { AgentTool, ToolContext, AnthropicToolDef } from './tools/Tool.js';
import { toAnthropicToolDef } from './tools/Tool.js';
import { resolveTools } from './tools/registry.js';
import type { AuditLogEntry, ToolCallRecord } from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single message in the conversation (Anthropic Messages API format) */
export interface LoopMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

/** Content block types from the Anthropic API */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

/** Configuration for the agent loop */
export interface LoopConfig {
  /** Max tool-calling iterations before forcing a final answer */
  maxIterations: number;
  /** Anthropic model ID */
  model: string;
  /** Max tokens per API call */
  maxTokens: number;
  /** Tool names this agent is allowed to use */
  allowedTools: string[];
  /** System prompt */
  systemPrompt: string;
  /** Execution context for tool calls */
  toolContext: ToolContext;
  /** Optional callback for each tool execution (for streaming/progress) */
  onToolCall?: (toolName: string, input: Record<string, unknown>) => void;
  /** Optional callback for each tool result */
  onToolResult?: (toolName: string, output: unknown, durationMs: number) => void;
}

/** Result from a complete agent loop run */
export interface LoopResult {
  /** Final text response from the LLM */
  finalResponse: string;
  /** Full conversation history (for debugging/audit) */
  messages: LoopMessage[];
  /** Number of tool-calling iterations performed */
  iterations: number;
  /** All tool calls made during the loop */
  toolCalls: ToolCallRecord[];
  /** Accumulated audit log entries */
  auditLog: Array<Omit<AuditLogEntry, 'id' | 'timestamp'>>;
  /** Whether the loop hit maxIterations */
  truncated: boolean;
}

// Re-export ToolCallRecord for convenience
export type { ToolCallRecord } from './types.js';

// ---------------------------------------------------------------------------
// Loop Implementation
// ---------------------------------------------------------------------------

/**
 * Run the agentic tool-calling loop.
 *
 * The loop sends messages to Claude with tool definitions. When Claude
 * responds with tool_use blocks, each tool is executed and results are
 * fed back. This continues until Claude responds with text only or
 * maxIterations is reached.
 */
export async function runAgentLoop(
  initialPrompt: string,
  config: LoopConfig,
): Promise<LoopResult> {
  const { getClient } = await import('@cveriskpilot/ai');
  const client = getClient();

  // Resolve tool names to concrete implementations
  const tools = resolveTools(config.allowedTools);
  const toolMap = new Map<string, AgentTool<any, any>>(tools.map((t) => [t.name, t]));
  const anthropicTools: AnthropicToolDef[] = tools.map(toAnthropicToolDef);

  // Conversation state
  const messages: LoopMessage[] = [
    { role: 'user', content: initialPrompt },
  ];
  const allToolCalls: ToolCallRecord[] = [];
  let iterations = 0;
  let truncated = false;

  while (iterations < config.maxIterations) {
    iterations++;

    // Call the Anthropic API with tools
    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      system: config.systemPrompt,
      messages: messages.map(formatMessage) as any[],
      ...(anthropicTools.length > 0 ? { tools: anthropicTools as any[] } : {}),
    });

    // Extract content blocks
    const contentBlocks = response.content as ContentBlock[];
    const toolUseBlocks = contentBlocks.filter(
      (b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use',
    );
    const textBlocks = contentBlocks.filter(
      (b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text',
    );

    // Add assistant response to conversation
    messages.push({ role: 'assistant', content: contentBlocks });

    // If no tool calls, we're done — extract final text
    if (toolUseBlocks.length === 0) {
      const finalText = textBlocks.map((b) => b.text).join('\n');
      return {
        finalResponse: finalText,
        messages,
        iterations,
        toolCalls: allToolCalls,
        auditLog: config.toolContext.auditLog,
        truncated: false,
      };
    }

    // Execute each tool call and collect results
    const toolResults: ContentBlock[] = [];

    for (const toolUse of toolUseBlocks) {
      const tool = toolMap.get(toolUse.name);

      if (!tool) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify({ error: `Unknown tool: ${toolUse.name}` }),
          is_error: true,
        });
        allToolCalls.push({
          toolName: toolUse.name,
          input: toolUse.input,
          output: { error: `Unknown tool: ${toolUse.name}` },
          durationMs: 0,
          isError: true,
          iteration: iterations,
        });
        continue;
      }

      // Check if tool requires approval
      if (tool.requiresApproval) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify({
            error: 'This tool requires human approval before execution. Flag this action for HITL review.',
          }),
          is_error: true,
        });
        allToolCalls.push({
          toolName: toolUse.name,
          input: toolUse.input,
          output: { error: 'Requires HITL approval' },
          durationMs: 0,
          isError: true,
          iteration: iterations,
        });
        continue;
      }

      // Execute the tool
      config.onToolCall?.(toolUse.name, toolUse.input);
      const startMs = Date.now();
      let output: unknown;
      let isError = false;

      try {
        output = await tool.execute(toolUse.input, config.toolContext);
      } catch (err) {
        output = { error: err instanceof Error ? err.message : String(err) };
        isError = true;
      }

      const durationMs = Date.now() - startMs;
      config.onToolResult?.(toolUse.name, output, durationMs);

      allToolCalls.push({
        toolName: toolUse.name,
        input: toolUse.input,
        output,
        durationMs,
        isError,
        iteration: iterations,
      });

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(output),
        is_error: isError,
      });
    }

    // Feed tool results back as the next user message
    messages.push({ role: 'user', content: toolResults });
  }

  // Hit max iterations — extract whatever text we have
  truncated = true;
  const lastAssistant = messages
    .filter((m) => m.role === 'assistant')
    .pop();

  let finalResponse = '';
  if (lastAssistant && Array.isArray(lastAssistant.content)) {
    finalResponse = lastAssistant.content
      .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
  }

  // If we exhausted iterations with no text, ask for a final answer
  if (!finalResponse) {
    const { getClient: getClientFinal } = await import('@cveriskpilot/ai');
    const finalClient = getClientFinal();

    const finalMsg = await finalClient.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      system: config.systemPrompt,
      messages: [
        ...messages.map(formatMessage),
        {
          role: 'user' as const,
          content: 'You have reached the maximum number of tool calls. Based on all data gathered so far, provide your final triage assessment now as JSON.',
        },
      ] as any[],
    });

    finalResponse = (finalMsg.content as ContentBlock[])
      .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
  }

  return {
    finalResponse,
    messages,
    iterations,
    toolCalls: allToolCalls,
    auditLog: config.toolContext.auditLog,
    truncated,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a LoopMessage for the Anthropic API.
 * The API expects content as string or array of content blocks.
 */
function formatMessage(msg: LoopMessage): {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
} {
  return {
    role: msg.role,
    content: msg.content,
  };
}
