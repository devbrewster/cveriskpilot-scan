// ---------------------------------------------------------------------------
// Snyk Webhook Verification & Handler
// ---------------------------------------------------------------------------
//
// Snyk signs webhook payloads with HMAC-SHA256. This module verifies the
// signature using the same timing-safe pattern as
// packages/integrations/src/webhooks/webhook-sender.ts.
// ---------------------------------------------------------------------------

import { createHmac, timingSafeEqual } from 'crypto';

// ---------------------------------------------------------------------------
// Snyk Webhook Payload Types
// ---------------------------------------------------------------------------

export interface SnykWebhookPayload {
  /** Webhook delivery ID */
  webhookId?: string;
  /** Event type: 'project_snapshot', 'new_issues', 'ping', etc. */
  event: string;
  /** Organization context */
  org: {
    id: string;
    name: string;
  };
  /** Project context */
  project: {
    id: string;
    name: string;
    url?: string;
    source?: string;
    targetReference?: string;
  };
  /** Timestamp of the event */
  timestamp: string;
  /** New issues (for 'new_issues' events) */
  newIssues?: SnykWebhookIssue[];
  /** Removed issues (for 'new_issues' events with removals) */
  removedIssues?: SnykWebhookIssue[];
}

export interface SnykWebhookIssue {
  id: string;
  issueType: string;
  pkgName: string;
  pkgVersions: string[];
  issueData: {
    id: string;
    title: string;
    severity: string;
    url: string;
    description?: string;
    identifiers?: {
      CVE?: string[];
      CWE?: string[];
    };
    exploitMaturity?: string;
  };
  fixInfo?: {
    isPatchable: boolean;
    upgradePaths?: string[][];
    nearestFixedInVersion?: string;
  };
  priority?: {
    score: number;
    factors?: Array<{ name: string; description: string }>;
  };
}

export interface SnykWebhookResult {
  connectorId: string;
  trigger: 'WEBHOOK';
  event: string;
  orgId: string;
  projectId: string;
  newIssueCount: number;
  removedIssueCount: number;
}

// ---------------------------------------------------------------------------
// HMAC Signature Verification
// ---------------------------------------------------------------------------

/**
 * Verify an HMAC-SHA256 signature from a Snyk webhook delivery.
 *
 * Snyk sends the signature in the `x-hub-signature` header as `sha256=<hex>`.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param body       - Raw request body string
 * @param signature  - The signature header value (with or without `sha256=` prefix)
 * @param secret     - The webhook signing secret configured in Snyk
 */
export function verifySnykWebhook(
  body: string,
  signature: string,
  secret: string,
): boolean {
  // Strip the `sha256=` prefix if present
  const rawSignature = signature.startsWith('sha256=')
    ? signature.slice(7)
    : signature;

  const expected = createHmac('sha256', secret).update(body).digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(rawSignature, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    // Buffers of different lengths or invalid hex — signature invalid
    return false;
  }
}

// ---------------------------------------------------------------------------
// Webhook Event Handler
// ---------------------------------------------------------------------------

/** Events that should trigger a connector sync */
const SYNC_TRIGGER_EVENTS = new Set(['project_snapshot', 'new_issues']);

/**
 * Process a verified Snyk webhook payload and return sync trigger info.
 *
 * The caller is responsible for:
 * 1. Verifying the HMAC signature via `verifySnykWebhook` before calling this
 * 2. Looking up the connectorId based on the Snyk org ID
 * 3. Enqueuing the actual sync job
 *
 * @param payload     - Parsed Snyk webhook payload
 * @param connectorId - The CVERiskPilot connector ID mapped to this Snyk org
 * @returns Sync trigger info, or null if the event should be ignored
 */
export function handleSnykWebhook(
  payload: SnykWebhookPayload,
  connectorId: string,
): SnykWebhookResult | null {
  // Ignore events that don't warrant a sync (e.g., 'ping')
  if (!SYNC_TRIGGER_EVENTS.has(payload.event)) {
    return null;
  }

  return {
    connectorId,
    trigger: 'WEBHOOK',
    event: payload.event,
    orgId: payload.org.id,
    projectId: payload.project.id,
    newIssueCount: payload.newIssues?.length ?? 0,
    removedIssueCount: payload.removedIssues?.length ?? 0,
  };
}
