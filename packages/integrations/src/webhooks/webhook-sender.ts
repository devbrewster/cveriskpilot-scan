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
/**
 * Inline SSRF validation — blocks private IPs, metadata endpoints, non-HTTPS.
 * Duplicated from @cveriskpilot/auth to avoid adding a cross-package dependency.
 */
function isUrlSafe(url: string): { valid: boolean; reason?: string } {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return { valid: false, reason: 'Malformed URL' }; }
  if (!['https:', 'http:'].includes(parsed.protocol)) return { valid: false, reason: 'Non-HTTP scheme' };
  const h = parsed.hostname.toLowerCase();
  const blocked = ['metadata.google.internal', 'metadata.goog', '169.254.169.254', 'localhost', '127.0.0.1', '0.0.0.0', '::1'];
  if (blocked.includes(h)) return { valid: false, reason: 'Blocked host' };
  const parts = h.split('.').map(Number);
  if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
    const [a, b] = parts;
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a === 127)
      return { valid: false, reason: 'Private IP' };
  }
  if (h.includes('169.254.169.254') || h.includes('metadata.google')) return { valid: false, reason: 'Metadata pattern' };
  return { valid: true };
}

export async function sendWebhook(
  url: string,
  secret: string,
  eventType: string,
  payload: WebhookPayload,
): Promise<{ success: boolean; statusCode?: number; error?: string; attempts: number }> {
  // SSRF protection: validate webhook destination URL before sending
  const urlCheck = isUrlSafe(url);
  if (!urlCheck.valid) {
    logger.warn(`Blocked webhook SSRF attempt: ${urlCheck.reason}`, { url: url.substring(0, 50) });
    return { success: false, error: `Blocked: ${urlCheck.reason}`, attempts: 0 };
  }

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
