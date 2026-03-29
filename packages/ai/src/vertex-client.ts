// ---------------------------------------------------------------------------
// AI Package — Vertex AI Client (Claude via Google Cloud Vertex AI)
// ---------------------------------------------------------------------------
// Routes Claude requests through Google Cloud Vertex AI instead of the direct
// Anthropic API. Uses Application Default Credentials (ADC) for authentication.
// Requires: VERTEX_PROJECT_ID, optionally VERTEX_REGION (default us-central1).
// ---------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk';
import { GoogleAuth } from 'google-auth-library';
import type { RemediationRequest, RemediationResponse } from './types';
import { buildRemediationPrompt } from './prompt';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 2048;
const RETRY_DELAY_MS = 2_000;
const RETRYABLE_STATUS = new Set([500, 529]);

// ---------------------------------------------------------------------------
// Auth helper — fetches ADC access tokens for Vertex AI
// ---------------------------------------------------------------------------

let _auth: GoogleAuth | null = null;

function getGoogleAuth(): GoogleAuth {
  if (_auth) return _auth;
  _auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  return _auth;
}

async function getAccessToken(): Promise<string> {
  const auth = getGoogleAuth();
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;
  if (!token) {
    throw new Error(
      'Failed to obtain Google Cloud access token. ' +
        'Ensure Application Default Credentials (ADC) are configured.',
    );
  }
  return token;
}

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

let _vertexClient: Anthropic | null = null;
let _cachedRegion: string | null = null;
let _cachedProjectId: string | null = null;

/**
 * Return a lazily-initialized Anthropic client configured for Vertex AI.
 * Uses ADC for authentication — no Anthropic API key required.
 * The client points at the Vertex AI endpoint for the configured project/region.
 */
export function createVertexClient(): Anthropic {
  const projectId = process.env['VERTEX_PROJECT_ID'];
  if (!projectId) {
    throw new Error(
      'VERTEX_PROJECT_ID environment variable is not set. ' +
        'Set it to your GCP project ID to use Claude via Vertex AI.',
    );
  }

  const region = process.env['VERTEX_REGION'] ?? 'us-central1';

  // Re-create if project/region changed (supports runtime config changes)
  if (_vertexClient && _cachedProjectId === projectId && _cachedRegion === region) {
    return _vertexClient;
  }

  const baseURL = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/anthropic/models`;

  _vertexClient = new Anthropic({
    // Vertex AI uses bearer tokens, not API keys. The Anthropic SDK requires
    // an apiKey to be set; we use a dummy value since auth is handled via
    // the Authorization header override with a fresh ADC token per request.
    apiKey: process.env['VERTEX_AI_API_KEY'] ?? 'vertex-ai-unused',
    baseURL,
  });

  _cachedProjectId = projectId;
  _cachedRegion = region;

  return _vertexClient;
}

/**
 * Reset the singleton (useful for testing).
 */
export function resetVertexClient(): void {
  _vertexClient = null;
  _cachedRegion = null;
  _cachedProjectId = null;
  _auth = null;
}

/**
 * Check if Vertex AI is enabled via environment variable.
 */
export function isVertexEnabled(): boolean {
  return process.env['VERTEX_ENABLED'] === 'true';
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
 * Generate AI-powered remediation guidance via Vertex AI.
 * Same interface as the direct Anthropic client's generateRemediation.
 */
export async function generateRemediationVertex(
  params: RemediationRequest,
): Promise<RemediationResponse> {
  const client = createVertexClient();
  const { system, userMessage } = buildRemediationPrompt(params);

  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Fetch a fresh access token for each attempt so retries don't reuse
      // a potentially expired token (ADC tokens expire after ~1hr).
      const accessToken = await getAccessToken();

      const response = await client.messages.create(
        {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system,
          messages: [{ role: 'user', content: userMessage }],
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-goog-user-project': process.env['VERTEX_PROJECT_ID'] ?? '',
          },
        },
      );

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
