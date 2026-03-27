// @cveriskpilot/streaming — SSE connection management & event broadcasting

import { randomUUID } from 'node:crypto';
import type { SSEConnection, StreamEvent } from './types';

const TEXT_ENCODER = new TextEncoder();

/**
 * Format a StreamEvent into the SSE wire format.
 *
 * ```
 * id: <id>
 * event: <type>
 * data: <json>
 *
 * ```
 */
function formatSSE(event: StreamEvent): string {
  const lines: string[] = [];
  lines.push(`id: ${event.id}`);
  lines.push(`event: ${event.type}`);
  // SSE spec: multi-line data fields use multiple `data:` lines
  const json = JSON.stringify(event);
  for (const line of json.split('\n')) {
    lines.push(`data: ${line}`);
  }
  lines.push(''); // trailing blank line terminates the event
  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// SSEEmitter
// ---------------------------------------------------------------------------

/**
 * Manages Server-Sent Events connections, heartbeat, and event broadcasting.
 *
 * Usage:
 * 1. Call `addClient()` when a new SSE request comes in. It returns the
 *    `ReadableStream` you hand to the `Response`.
 * 2. Call `broadcast()` or `sendToTenant()` to push events.
 * 3. Call `removeClient()` when the connection drops.
 */
export class SSEEmitter {
  private clients = new Map<string, SSEConnection>();
  private heartbeatIntervalMs: number;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private eventCounter = 0;

  constructor(options?: { heartbeatIntervalMs?: number }) {
    this.heartbeatIntervalMs = options?.heartbeatIntervalMs ?? 15_000;
  }

  /** Start the heartbeat timer (call once on server boot) */
  start(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatIntervalMs);
    // Unref so Node can exit cleanly if this is the only timer
    if (typeof this.heartbeatTimer === 'object' && 'unref' in this.heartbeatTimer) {
      this.heartbeatTimer.unref();
    }
  }

  /** Stop the heartbeat timer */
  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Register a new SSE client.
   *
   * Returns a `ReadableStream` that should be passed directly to `new Response(stream, ...)`.
   * The stream stays open until the client disconnects or `removeClient()` is called.
   */
  addClient(
    tenantId: string,
    options?: { subscribedJobs?: string[]; lastEventId?: string },
  ): { connectionId: string; stream: ReadableStream<Uint8Array> } {
    const connectionId = randomUUID();

    let writer: WritableStreamDefaultWriter<Uint8Array>;

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        // Create a writable side that pushes into the readable controller
        const writable = new WritableStream<Uint8Array>({
          write(chunk) {
            controller.enqueue(chunk);
          },
          close() {
            controller.close();
          },
          abort(reason) {
            controller.error(reason);
          },
        });

        writer = writable.getWriter();

        const connection: SSEConnection = {
          connectionId,
          tenantId,
          subscribedJobs: options?.subscribedJobs ?? [],
          writer,
          connectedAt: Date.now(),
          lastEventId: options?.lastEventId ?? '',
        };

        this.clients.set(connectionId, connection);

        // Send initial comment to establish connection
        const hello = TEXT_ENCODER.encode(`: connected as ${connectionId}\n\n`);
        writer.write(hello).catch(() => this.removeClient(connectionId));
      },
      cancel: () => {
        this.removeClient(connectionId);
      },
    });

    return { connectionId, stream };
  }

  /**
   * Remove a client and close its stream.
   */
  async removeClient(connectionId: string): Promise<void> {
    const client = this.clients.get(connectionId);
    if (!client) return;

    this.clients.delete(connectionId);

    try {
      await client.writer.close();
    } catch {
      // Stream may already be closed
    }
  }

  /**
   * Broadcast an event to ALL connected clients.
   */
  async broadcast(event: StreamEvent): Promise<void> {
    const payload = TEXT_ENCODER.encode(formatSSE(event));
    const sendPromises: Promise<void>[] = [];

    for (const [connId, client] of this.clients) {
      sendPromises.push(
        client.writer.write(payload).catch(() => {
          this.removeClient(connId);
        }),
      );
    }

    await Promise.allSettled(sendPromises);
  }

  /**
   * Send an event to all clients belonging to a specific tenant.
   * Optionally filters by subscribed job IDs.
   */
  async sendToTenant(tenantId: string, event: StreamEvent): Promise<void> {
    const payload = TEXT_ENCODER.encode(formatSSE(event));
    const sendPromises: Promise<void>[] = [];

    for (const [connId, client] of this.clients) {
      if (client.tenantId !== tenantId) continue;

      // If client subscribes to specific jobs, filter
      if (
        client.subscribedJobs.length > 0 &&
        !client.subscribedJobs.includes(event.jobId)
      ) {
        continue;
      }

      client.lastEventId = event.id;
      sendPromises.push(
        client.writer.write(payload).catch(() => {
          this.removeClient(connId);
        }),
      );
    }

    await Promise.allSettled(sendPromises);
  }

  /**
   * Send a heartbeat comment to all clients to keep connections alive.
   * Uses SSE comment syntax (`: timestamp`) which clients ignore.
   */
  private sendHeartbeat(): void {
    const heartbeat = TEXT_ENCODER.encode(`: heartbeat ${Date.now()}\n\n`);

    for (const [connId, client] of this.clients) {
      client.writer.write(heartbeat).catch(() => {
        this.removeClient(connId);
      });
    }
  }

  /** Generate a monotonically increasing event ID */
  nextEventId(): string {
    this.eventCounter++;
    return `${Date.now()}-${this.eventCounter}`;
  }

  /** Number of currently connected clients */
  get clientCount(): number {
    return this.clients.size;
  }

  /** Get connected client IDs for a tenant */
  getClientsByTenant(tenantId: string): string[] {
    const ids: string[] = [];
    for (const [, client] of this.clients) {
      if (client.tenantId === tenantId) {
        ids.push(client.connectionId);
      }
    }
    return ids;
  }

  /** Get all connected tenant IDs */
  getConnectedTenants(): string[] {
    const tenants = new Set<string>();
    for (const [, client] of this.clients) {
      tenants.add(client.tenantId);
    }
    return Array.from(tenants);
  }
}
