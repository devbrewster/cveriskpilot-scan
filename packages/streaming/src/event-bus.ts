// @cveriskpilot/streaming — Cloud Pub/Sub event bus for Signal Engine
// In-memory fallback for dev/test, GCP Pub/Sub for production

import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export const EVENT_TYPES = [
  'findings.new',
  'findings.updated',
  'scans.completed',
  'compliance.changed',
  'cases.created',
  'cases.status_changed',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

// ---------------------------------------------------------------------------
// Core interfaces
// ---------------------------------------------------------------------------

export interface EventBusMessage {
  type: EventType;
  orgId: string;
  data: Record<string, unknown>;
  timestamp: string;
  id: string;
}

export interface Subscription {
  id: string;
  types: EventType[];
  orgId: string;
}

export interface EventBus {
  /** Publish a message. Returns the message ID. */
  publish(message: EventBusMessage): Promise<string>;

  /** Subscribe to one or more event types scoped to an org. */
  subscribe(
    type: EventType | EventType[],
    orgId: string,
    handler: (msg: EventBusMessage) => Promise<void>,
  ): Subscription;

  /** Remove a subscription. */
  unsubscribe(subscription: Subscription): void;

  /** Gracefully shut down (flush pending, close connections). */
  close(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Dead letter record
// ---------------------------------------------------------------------------

export interface DeadLetterEntry {
  message: EventBusMessage;
  error: string;
  attempts: number;
  lastAttempt: string;
}

// ---------------------------------------------------------------------------
// InMemoryEventBus
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;

interface InMemoryHandler {
  subscription: Subscription;
  handler: (msg: EventBusMessage) => Promise<void>;
}

export class InMemoryEventBus implements EventBus {
  private emitter = new EventEmitter();
  private handlers = new Map<string, InMemoryHandler>();
  private deadLetters: DeadLetterEntry[] = [];
  private closed = false;

  /** Access dead-lettered messages (useful in tests). */
  getDeadLetters(): readonly DeadLetterEntry[] {
    return this.deadLetters;
  }

  async publish(message: EventBusMessage): Promise<string> {
    if (this.closed) throw new Error('EventBus is closed');
    const id = message.id || randomUUID();
    const msg: EventBusMessage = { ...message, id };
    // Emit asynchronously so publish never throws on handler errors
    setImmediate(() => this.emitter.emit(msg.type, msg));
    return id;
  }

  subscribe(
    type: EventType | EventType[],
    orgId: string,
    handler: (msg: EventBusMessage) => Promise<void>,
  ): Subscription {
    if (this.closed) throw new Error('EventBus is closed');

    const types = Array.isArray(type) ? type : [type];
    const subscription: Subscription = { id: randomUUID(), types, orgId };

    const wrappedHandler = async (msg: EventBusMessage) => {
      // Tenant isolation: only deliver messages matching orgId
      if (msg.orgId !== orgId) return;
      await this.deliverWithRetry(msg, handler);
    };

    const entry: InMemoryHandler = { subscription, handler: wrappedHandler };
    this.handlers.set(subscription.id, entry);

    for (const t of types) {
      this.emitter.on(t, wrappedHandler);
    }

    return subscription;
  }

  unsubscribe(subscription: Subscription): void {
    const entry = this.handlers.get(subscription.id);
    if (!entry) return;

    for (const t of subscription.types) {
      this.emitter.removeListener(t, entry.handler);
    }
    this.handlers.delete(subscription.id);
  }

  async close(): Promise<void> {
    this.closed = true;
    this.emitter.removeAllListeners();
    this.handlers.clear();
  }

  // Retry up to MAX_RETRIES, then dead-letter
  private async deliverWithRetry(
    msg: EventBusMessage,
    handler: (msg: EventBusMessage) => Promise<void>,
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await handler(msg);
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    this.deadLetters.push({
      message: msg,
      error: lastError?.message ?? 'Unknown error',
      attempts: MAX_RETRIES,
      lastAttempt: new Date().toISOString(),
    });
  }
}

// ---------------------------------------------------------------------------
// PubSubEventBus
// ---------------------------------------------------------------------------

export interface PubSubEventBusOptions {
  projectId?: string;
  topicPrefix?: string;
}

/**
 * Production event bus backed by Google Cloud Pub/Sub.
 *
 * `@google-cloud/pubsub` is imported dynamically so the package has no hard
 * dependency — builds and tests work without it installed.
 */
export class PubSubEventBus implements EventBus {
  private projectId: string | undefined;
  private topicPrefix: string;
  private client: any; // PubSub instance (dynamic import)
  private subscriptions = new Map<string, { sub: any; types: EventType[] }>();
  private closed = false;
  private initPromise: Promise<void> | null = null;

  constructor(options?: PubSubEventBusOptions) {
    this.projectId = options?.projectId;
    this.topicPrefix = options?.topicPrefix ?? 'cveriskpilot';
  }

  // Lazy-init: import @google-cloud/pubsub and create client
  private async init(): Promise<void> {
    if (this.client) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      // @ts-expect-error — optional dependency, not installed in dev/test
      const { PubSub } = await import('@google-cloud/pubsub');
      this.client = new PubSub({ projectId: this.projectId });
    })();

    return this.initPromise;
  }

  private topicName(type: EventType): string {
    return `${this.topicPrefix}-${type.replace(/\./g, '-')}`;
  }

  private deadLetterTopic(): string {
    return `${this.topicPrefix}-dead-letter`;
  }

  // Ensure topic exists (idempotent)
  private async ensureTopic(name: string): Promise<any> {
    const topic = this.client.topic(name);
    const [exists] = await topic.exists();
    if (!exists) {
      const [created] = await this.client.createTopic(name);
      return created;
    }
    return topic;
  }

  async publish(message: EventBusMessage): Promise<string> {
    if (this.closed) throw new Error('EventBus is closed');
    await this.init();

    const topic = await this.ensureTopic(this.topicName(message.type));

    const messageId = await topic.publishMessage({
      data: Buffer.from(JSON.stringify(message)),
      attributes: {
        orgId: message.orgId,
        eventType: message.type,
        timestamp: message.timestamp,
      },
    });

    return messageId;
  }

  subscribe(
    type: EventType | EventType[],
    orgId: string,
    handler: (msg: EventBusMessage) => Promise<void>,
  ): Subscription {
    if (this.closed) throw new Error('EventBus is closed');

    const types = Array.isArray(type) ? type : [type];
    const subscription: Subscription = { id: randomUUID(), types, orgId };

    // Kick off async subscription setup (fire-and-forget from the sync interface;
    // messages start arriving once setup completes)
    this.setupPullSubscriptions(subscription, orgId, types, handler);

    return subscription;
  }

  private async setupPullSubscriptions(
    subscription: Subscription,
    orgId: string,
    types: EventType[],
    handler: (msg: EventBusMessage) => Promise<void>,
  ): Promise<void> {
    await this.init();

    for (const t of types) {
      const topicName = this.topicName(t);
      await this.ensureTopic(topicName);

      const subName = `${topicName}-${subscription.id}`;

      // Ensure dead letter topic exists for failed messages
      await this.ensureTopic(this.deadLetterTopic());

      const topic = this.client.topic(topicName);
      const [sub] = await topic.createSubscription(subName, {
        deadLetterPolicy: {
          deadLetterTopic: this.client.topic(this.deadLetterTopic()).name,
          maxDeliveryAttempts: MAX_RETRIES,
        },
        filter: `attributes.orgId = "${orgId}"`,
      });

      sub.on('message', async (pubsubMsg: any) => {
        try {
          const parsed: EventBusMessage = JSON.parse(pubsubMsg.data.toString());
          await handler(parsed);
          pubsubMsg.ack();
        } catch {
          pubsubMsg.nack();
        }
      });

      this.subscriptions.set(subscription.id, {
        sub,
        types,
      });
    }
  }

  unsubscribe(subscription: Subscription): void {
    const entry = this.subscriptions.get(subscription.id);
    if (!entry) return;

    entry.sub.removeAllListeners();
    entry.sub.close().catch(() => {});
    this.subscriptions.delete(subscription.id);
  }

  async close(): Promise<void> {
    this.closed = true;

    const closePromises: Promise<void>[] = [];
    this.subscriptions.forEach((entry) => {
      entry.sub.removeAllListeners();
      closePromises.push(entry.sub.close().catch(() => {}));
    });
    await Promise.all(closePromises);
    this.subscriptions.clear();

    if (this.client) {
      await this.client.close();
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface CreateEventBusOptions {
  provider?: 'memory' | 'pubsub';
  projectId?: string;
  topicPrefix?: string;
}

/**
 * Create an EventBus instance.
 *
 * Defaults to `'memory'` when:
 *  - `PUBSUB_EMULATOR_HOST` is set (Pub/Sub emulator mode), or
 *  - `@google-cloud/pubsub` is not installed
 *
 * Explicitly pass `{ provider: 'pubsub' }` to force Cloud Pub/Sub.
 */
export function createEventBus(options?: CreateEventBusOptions): EventBus {
  const provider = options?.provider ?? detectProvider();

  if (provider === 'pubsub') {
    return new PubSubEventBus({
      projectId: options?.projectId,
      topicPrefix: options?.topicPrefix,
    });
  }

  return new InMemoryEventBus();
}

function detectProvider(): 'memory' | 'pubsub' {
  // Emulator mode — use memory for simplicity (or could still use pubsub)
  if (process.env.PUBSUB_EMULATOR_HOST) return 'memory';

  // Check if @google-cloud/pubsub is available
  try {
    require.resolve('@google-cloud/pubsub');
    return 'pubsub';
  } catch {
    return 'memory';
  }
}
