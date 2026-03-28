// ---------------------------------------------------------------------------
// Webhook event emitter — fan-out to registered endpoints with CloudEvents 1.0
// ---------------------------------------------------------------------------
// Ported from cveriskpilot_1.x/src/lib/webhooks.ts and adapted for the new
// modular integrations package.  Uses the existing sendWebhook() from
// webhook-sender.ts and records deliveries via DeliveryTracker.
// ---------------------------------------------------------------------------

import { randomUUID } from 'crypto';
import type { WebhookEventType, WebhookPayload } from './types';
import { sendWebhook } from './webhook-sender';
import { getDeliveryTracker } from './delivery-tracker';

// ─── CloudEvents 1.0 Envelope ───

export interface CloudEvent<T = Record<string, unknown>> {
  specversion: '1.0';
  type: string;
  source: string;
  id: string;
  time: string;
  datacontenttype: string;
  data: T;
}

/**
 * Build a CloudEvents 1.0 structured-content envelope.
 */
export function buildCloudEvent(
  organizationId: string,
  event: string,
  payload: Record<string, unknown>,
  deliveryId?: string,
): CloudEvent {
  return {
    specversion: '1.0',
    type: `com.cveriskpilot.${event}`,
    source: `/orgs/${organizationId}`,
    id: deliveryId ?? randomUUID(),
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    data: payload,
  };
}

// ─── Supported event types ───
// Superset of WEBHOOK_EVENT_TYPES from types.ts — includes trigger-specific
// events that the 1.x repo supported.

export const EMITTER_EVENT_TYPES = [
  'case.created',
  'case.updated',
  'case.closed',
  'case.status_changed',
  'sla.breached',
  'scan.completed',
  'finding.new',
  'finding.created',
  'comment.created',
] as const;

export type EmitterEventType = (typeof EMITTER_EVENT_TYPES)[number];

// ─── Endpoint registry (in-memory, mirrors config/route.ts shape) ───

export interface RegisteredEndpoint {
  id: string;
  organizationId: string;
  url: string;
  secret: string;
  events: string[]; // event names or '*' for wildcard
  isActive: boolean;
  /** 'cloudevents' (default) or 'legacy' */
  envelopeFormat?: 'cloudevents' | 'legacy';
}

// ─── Fan-out dispatch ───

export interface EmitResult {
  endpointId: string;
  deliveryId: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  attempts: number;
}

/**
 * Emit a webhook event to all registered endpoints that subscribe to it.
 *
 * For each matching endpoint:
 *  1. Creates a DeliveryTracker record
 *  2. Wraps payload in CloudEvents 1.0 envelope (or legacy format)
 *  3. Sends via sendWebhook() (which handles HMAC signing and inline retry)
 *  4. Records the delivery result
 */
export async function emitWebhookEvent(
  organizationId: string,
  event: EmitterEventType | string,
  payload: Record<string, unknown>,
  endpoints: RegisteredEndpoint[],
): Promise<EmitResult[]> {
  const tracker = getDeliveryTracker();

  // Filter to active endpoints subscribed to this event (or wildcard)
  const matching = endpoints.filter(
    (ep) =>
      ep.isActive &&
      ep.organizationId === organizationId &&
      (ep.events.includes(event) || ep.events.includes('*')),
  );

  const results = await Promise.allSettled(
    matching.map(async (ep): Promise<EmitResult> => {
      const delivery = tracker.createDelivery(organizationId, ep.id, event, payload);

      // Build the payload wrapper
      const isCloudEvents = ep.envelopeFormat !== 'legacy';
      const webhookPayload: WebhookPayload = isCloudEvents
        ? {
            id: delivery.id,
            eventType: event as WebhookEventType,
            timestamp: new Date().toISOString(),
            organizationId,
            data: buildCloudEvent(organizationId, event, payload, delivery.id) as unknown as Record<string, unknown>,
          }
        : {
            id: delivery.id,
            eventType: event as WebhookEventType,
            timestamp: new Date().toISOString(),
            organizationId,
            data: payload,
          };

      const startMs = Date.now();
      const result = await sendWebhook(ep.url, ep.secret, event, webhookPayload);
      const durationMs = Date.now() - startMs;

      tracker.recordAttempt(delivery.id, {
        statusCode: result.statusCode ?? null,
        success: result.success,
        error: result.error,
        durationMs,
      });

      return {
        endpointId: ep.id,
        deliveryId: delivery.id,
        success: result.success,
        statusCode: result.statusCode,
        error: result.error,
        attempts: result.attempts,
      };
    }),
  );

  // Unwrap settled results
  return results.map((r) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      endpointId: 'unknown',
      deliveryId: 'unknown',
      success: false,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      attempts: 0,
    };
  });
}

// ─── Convenience helpers ───

/**
 * Emit a case.created event.
 */
export function emitCaseCreated(
  orgId: string,
  caseData: Record<string, unknown>,
  endpoints: RegisteredEndpoint[],
) {
  return emitWebhookEvent(orgId, 'case.created', caseData, endpoints);
}

/**
 * Emit a case.updated event.
 */
export function emitCaseUpdated(
  orgId: string,
  caseData: Record<string, unknown>,
  endpoints: RegisteredEndpoint[],
) {
  return emitWebhookEvent(orgId, 'case.updated', caseData, endpoints);
}

/**
 * Emit a case.closed event.
 */
export function emitCaseClosed(
  orgId: string,
  caseData: Record<string, unknown>,
  endpoints: RegisteredEndpoint[],
) {
  return emitWebhookEvent(orgId, 'case.closed', caseData, endpoints);
}

/**
 * Emit an sla.breached event.
 */
export function emitSlaBreached(
  orgId: string,
  slaData: Record<string, unknown>,
  endpoints: RegisteredEndpoint[],
) {
  return emitWebhookEvent(orgId, 'sla.breached', slaData, endpoints);
}

/**
 * Emit a scan.completed event.
 */
export function emitScanCompleted(
  orgId: string,
  scanData: Record<string, unknown>,
  endpoints: RegisteredEndpoint[],
) {
  return emitWebhookEvent(orgId, 'scan.completed', scanData, endpoints);
}

/**
 * Emit a finding.new event.
 */
export function emitFindingNew(
  orgId: string,
  findingData: Record<string, unknown>,
  endpoints: RegisteredEndpoint[],
) {
  return emitWebhookEvent(orgId, 'finding.new', findingData, endpoints);
}
