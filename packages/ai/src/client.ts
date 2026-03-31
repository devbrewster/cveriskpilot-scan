// ---------------------------------------------------------------------------
// AI Package — Claude API Client (with local LLM fallback)
// ---------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk';
import type { RemediationRequest, RemediationResponse } from './types';
import { buildRemediationPrompt } from './prompt';
import { isVertexEnabled, generateRemediationVertex } from './vertex-client';
import { isLocalLlmConfigured, generateRemediationLocal, checkLocalLlmHealth } from './local-client';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 2048;
const TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 2_000;
const RETRYABLE_STATUS = new Set([500, 529]);
/** Status codes that indicate API exhaustion — trigger local LLM fallback */
const EXHAUSTION_STATUS = new Set([429, 529]);

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null;

/**
 * Return a lazily-initialized Anthropic client.
 * Throws if ANTHROPIC_API_KEY is not set.
 */
export function getClient(): Anthropic {
  if (_client) return _client;

  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is not set. ' +
        'Please add it to .env.local or your environment.',
    );
  }

  _client = new Anthropic({
    apiKey,
    timeout: TIMEOUT_MS,
  });
  return _client;
}

/**
 * Reset the singleton (useful for testing).
 */
export function resetClient(): void {
  _client = null;
}

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    return RETRYABLE_STATUS.has((error as { status: number }).status);
  }
  return false;
}

function isExhausted(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    return EXHAUSTION_STATUS.has((error as { status: number }).status);
  }
  // Also catch quota/billing errors from the SDK
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('rate limit') || msg.includes('quota') || msg.includes('overloaded');
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Generate AI-powered remediation guidance for a vulnerability case.
 *
 * Priority order:
 *   1. Vertex AI (if VERTEX_ENABLED=true)
 *   2. Direct Anthropic API (with 1 retry on 500/529)
 *   3. Local LLM fallback (on 429/529/quota errors, if configured)
 */
export async function generateRemediation(
  params: RemediationRequest,
): Promise<RemediationResponse> {
  // Route to Vertex AI if enabled
  if (isVertexEnabled()) {
    return generateRemediationVertex(params);
  }

  // Try Anthropic API first (if key is set)
  const hasApiKey = !!process.env['ANTHROPIC_API_KEY'];

  if (hasApiKey) {
    try {
      return await generateRemediationAnthropic(params);
    } catch (error: unknown) {
      // On API exhaustion, fall through to local LLM
      if (isExhausted(error) && isLocalLlmConfigured()) {
        console.warn(
          '[AI] Anthropic API exhausted, falling back to local LLM:',
          error instanceof Error ? error.message : String(error),
        );
        return generateRemediationLocal(params);
      }
      throw error;
    }
  }

  // No Anthropic key — try local LLM directly
  if (isLocalLlmConfigured()) {
    const healthy = await checkLocalLlmHealth();
    if (healthy) {
      console.info('[AI] No ANTHROPIC_API_KEY set, using local LLM');
      return generateRemediationLocal(params);
    }
  }

  throw new Error(
    'ANTHROPIC_API_KEY environment variable is not set and no local LLM is available. ' +
      'Set ANTHROPIC_API_KEY or configure LOCAL_LLM_URL / LOCAL_LLM_MODEL.',
  );
}

/**
 * Internal: call Anthropic API directly with retry logic.
 */
async function generateRemediationAnthropic(
  params: RemediationRequest,
): Promise<RemediationResponse> {
  const client = getClient();
  const { system, userMessage } = buildRemediationPrompt(params);

  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: 'user', content: userMessage }],
      });

      // Extract text content
      const textBlock = response.content.find((block) => block.type === 'text');
      const content = textBlock && 'text' in textBlock ? textBlock.text : '';

      return {
        content,
        model: response.model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error: unknown) {
      lastError = error;

      // Only retry on server errors (500), not on rate limits (429)
      if (attempt === 0 && isRetryable(error) && !isExhausted(error)) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
