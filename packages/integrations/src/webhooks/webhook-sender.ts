// ---------------------------------------------------------------------------
// Webhook sender with HMAC-SHA256 signing and retry logic
// ---------------------------------------------------------------------------

import { createHmac, timingSafeEqual } from 'crypto';
import type { WebhookPayload } from './types';
import { createLogger } from '@cveriskpilot/shared';

const logger = createLogger('integrations:webhook-sender');

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Compute an HMAC-SHA256 signature for a JSON payload.
 */
export function generateSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify that a received signature matches the expected HMAC for the payload.
 * Uses timing-safe comparison to avoid timing attacks.
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = generateSignature(payload, secret);
  try {
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Send a webhook to the given URL with HMAC-SHA256 signing.
 * Retries up to 3 times with exponential backoff on failure.
 */
export async function sendWebhook(
  url: string,
  secret: string,
  eventType: string,
  payload: WebhookPayload,
): Promise<{ success: boolean; statusCode?: number; error?: string; attempts: number }> {
  const body = JSON.stringify(payload);
  const signature = generateSignature(body, secret);

  let lastError: string | undefined;
  let lastStatus: number | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': eventType,
          'X-Webhook-Timestamp': payload.timestamp,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      lastStatus = response.status;

      if (response.ok) {
        return { success: true, statusCode: response.status, attempts: attempt };
      }

      lastError = `HTTP ${response.status}: ${response.statusText}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    // Don't wait after the last attempt
    if (attempt < MAX_RETRIES) {
      const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  logger.error(`Failed after ${MAX_RETRIES} attempts to ${url}: ${lastError}`);
  return { success: false, statusCode: lastStatus, error: lastError, attempts: MAX_RETRIES };
}
