// ---------------------------------------------------------------------------
// AI Package — Claude API Client
// ---------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk';
import type { RemediationRequest, RemediationResponse } from './types';
import { buildRemediationPrompt } from './prompt';
import { isVertexEnabled, generateRemediationVertex } from './vertex-client';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 2048;
const TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 2_000;
const RETRYABLE_STATUS = new Set([500, 529]);

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

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Generate AI-powered remediation guidance for a vulnerability case.
 * Routes through Vertex AI when VERTEX_ENABLED=true, otherwise uses direct Anthropic API.
 */
export async function generateRemediation(
  params: RemediationRequest,
): Promise<RemediationResponse> {
  // Route to Vertex AI if enabled
  if (isVertexEnabled()) {
    return generateRemediationVertex(params);
  }

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

      // Only retry on retryable errors, and only once
      if (attempt === 0 && isRetryable(error)) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      throw error;
    }
  }

  // Should not reach here, but TypeScript needs it
  throw lastError;
}
