// ---------------------------------------------------------------------------
// AI Package — Local LLM Fallback Client (Ollama / OpenAI-compatible)
// ---------------------------------------------------------------------------
// Falls back to a local LLM when the Anthropic API is exhausted (429, quota
// exceeded, or API key missing). Talks to any OpenAI-compatible endpoint —
// Ollama, LM Studio, vLLM, llama.cpp server, etc.
//
// Configuration:
//   LOCAL_LLM_URL      — base URL (default: http://localhost:11434)
//   LOCAL_LLM_MODEL    — model name (default: llama3.1:8b)
//   LOCAL_LLM_API_KEY  — optional API key for remote-hosted endpoints
// ---------------------------------------------------------------------------

import type { RemediationRequest, RemediationResponse } from './types';
import { buildRemediationPrompt } from './prompt';

const DEFAULT_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.1:8b';
const TIMEOUT_MS = 60_000; // local models are slower

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface LocalLlmConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export function getLocalLlmConfig(): LocalLlmConfig {
  return {
    baseUrl: process.env['LOCAL_LLM_URL'] ?? DEFAULT_URL,
    model: process.env['LOCAL_LLM_MODEL'] ?? DEFAULT_MODEL,
    apiKey: process.env['LOCAL_LLM_API_KEY'],
  };
}

/**
 * Returns true if a local LLM endpoint is configured and reachable.
 */
export function isLocalLlmConfigured(): boolean {
  return !!process.env['LOCAL_LLM_URL'] || !!process.env['LOCAL_LLM_MODEL'];
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

/**
 * Quick health check — pings the local LLM endpoint.
 * Returns true if the endpoint responds, false otherwise.
 */
export async function checkLocalLlmHealth(): Promise<boolean> {
  const config = getLocalLlmConfig();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    // Ollama exposes GET / that returns 200
    const res = await fetch(config.baseUrl, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Chat completion (OpenAI-compatible API)
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Send a chat completion request to the local LLM.
 * Uses the OpenAI-compatible /v1/chat/completions endpoint (Ollama, LM Studio, vLLM).
 */
async function chatCompletion(
  messages: ChatMessage[],
  maxTokens: number = 2048,
): Promise<{ content: string; model: string; inputTokens: number; outputTokens: number }> {
  const config = getLocalLlmConfig();
  const url = `${config.baseUrl}/v1/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.3, // lower temp for more deterministic security analysis
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Local LLM returned ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as ChatCompletionResponse;
    const choice = data.choices?.[0];

    if (!choice?.message?.content) {
      throw new Error('Local LLM returned empty response');
    }

    return {
      content: choice.message.content,
      model: `local:${data.model || config.model}`,
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Public API — mirrors client.ts / vertex-client.ts interface
// ---------------------------------------------------------------------------

/**
 * Generate remediation guidance using the local LLM.
 * Same interface as generateRemediation() in client.ts.
 */
export async function generateRemediationLocal(
  params: RemediationRequest,
): Promise<RemediationResponse> {
  const { system, userMessage } = buildRemediationPrompt(params);

  const result = await chatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: userMessage },
    ],
    2048,
  );

  return {
    content: result.content,
    model: result.model,
    usage: {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    },
  };
}

/**
 * Send a triage request to the local LLM.
 * Returns the raw text response for parsing by the TriageAgent.
 */
export async function triageLocal(
  systemPrompt: string,
  userMessage: string,
): Promise<{
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}> {
  return chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    1024,
  );
}
