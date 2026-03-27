// ---------------------------------------------------------------------------
// Webhook event types and payload interfaces
// ---------------------------------------------------------------------------

export const WEBHOOK_EVENT_TYPES = [
  'case.created',
  'case.updated',
  'case.status_changed',
  'finding.created',
  'sla.breached',
  'comment.created',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export interface WebhookPayload {
  id: string;
  eventType: WebhookEventType;
  timestamp: string;
  organizationId: string;
  data: Record<string, unknown>;
}

export interface WebhookEndpoint {
  id: string;
  organizationId: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
