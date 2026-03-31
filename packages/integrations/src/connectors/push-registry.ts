// @cveriskpilot/integrations — push-mode webhook registry for scanner connectors

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type {
  ConnectorConfig,
  PushWebhookConfig,
  PushRegistrationResult,
} from './types';

// ---------------------------------------------------------------------------
// In-memory store (production would use the database)
// ---------------------------------------------------------------------------

const pushConfigs = new Map<string, PushWebhookConfig>();

// ---------------------------------------------------------------------------
// Default events pushed by each connector type
// ---------------------------------------------------------------------------

const DEFAULT_PUSH_EVENTS: Record<string, string[]> = {
  tenable: ['scan.completed', 'vulnerability.found', 'vulnerability.fixed'],
  crowdstrike: ['detection.new', 'detection.updated', 'detection.resolved'],
  rapid7: ['scan.completed', 'vulnerability.found', 'vulnerability.remediated'],
  snyk: ['project.snapshot', 'vulnerability.new', 'vulnerability.fixed'],
  nessus: ['scan.completed'],
  qualys: ['scan.completed'],
  openvas: ['scan.completed'],
  generic: ['scan.completed'],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a push-mode webhook for a scanner connector.
 *
 * Generates an HMAC secret, builds a callback URL, and (in production) would
 * call the scanner vendor's webhook registration API. Currently stores the
 * config in memory.
 */
export async function registerPushWebhook(
  config: ConnectorConfig,
  callbackBaseUrl: string,
): Promise<PushRegistrationResult> {
  const connectorId = config.id;
  if (!connectorId) {
    return {
      success: false,
      callbackUrl: '',
      error: 'ConnectorConfig must have an id to register push webhooks',
    };
  }

  try {
    const secret = randomBytes(32).toString('hex');
    const callbackUrl = `${callbackBaseUrl.replace(/\/+$/, '')}/api/events/ingest/${connectorId}`;
    const events = DEFAULT_PUSH_EVENTS[config.type] ?? DEFAULT_PUSH_EVENTS.generic;
    const webhookId = `pwh_${randomBytes(16).toString('hex')}`;

    const pushConfig: PushWebhookConfig = {
      connectorId,
      orgId: config.orgId,
      callbackUrl,
      secret,
      events,
      registeredAt: new Date(),
    };

    // TODO: For each connector type, call the vendor's webhook registration API.
    // e.g., Tenable: POST /webhooks, CrowdStrike: POST /fwmgr/entities/notifications/v1
    // For now we just store the config locally.

    pushConfigs.set(connectorId, pushConfig);

    return {
      success: true,
      webhookId,
      callbackUrl,
    };
  } catch (err) {
    return {
      success: false,
      callbackUrl: '',
      error: err instanceof Error ? err.message : 'Failed to register push webhook',
    };
  }
}

/**
 * Verify that a push payload was signed by the expected connector.
 * Uses HMAC-SHA256 with timing-safe comparison to prevent timing attacks.
 */
export function verifyPushPayload(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length) return false;
  return timingSafeEqual(sigBuf, expBuf);
}

/**
 * Remove a push webhook registration.
 *
 * In production this would also call the vendor API to deregister the webhook.
 */
export async function deregisterPushWebhook(connectorId: string): Promise<void> {
  // TODO: Call vendor API to remove the webhook on their side
  pushConfigs.delete(connectorId);
}

/**
 * Retrieve the push webhook config for a connector, or null if not registered.
 */
export function getPushConfig(connectorId: string): PushWebhookConfig | null {
  return pushConfigs.get(connectorId) ?? null;
}
