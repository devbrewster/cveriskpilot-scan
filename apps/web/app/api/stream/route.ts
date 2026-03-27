// SSE streaming endpoint for real-time scan progress
//
// GET /api/stream?tenantId=...&jobId=...
//
// Clients connect via EventSource and receive progress, phase-change,
// finding, error, and complete events as the scan pipeline runs.

import { NextRequest } from 'next/server';
import { SSEEmitter } from '@cveriskpilot/streaming';

// ---------------------------------------------------------------------------
// Singleton SSEEmitter (lives for the lifetime of the server process)
// ---------------------------------------------------------------------------

let emitterInstance: SSEEmitter | null = null;

export function getSSEEmitter(): SSEEmitter {
  if (!emitterInstance) {
    emitterInstance = new SSEEmitter({ heartbeatIntervalMs: 15_000 });
    emitterInstance.start();
  }
  return emitterInstance;
}

// ---------------------------------------------------------------------------
// Route config
// ---------------------------------------------------------------------------

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/stream
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl;
  const tenantId = searchParams.get('tenantId');
  const jobId = searchParams.get('jobId');

  if (!tenantId) {
    return new Response(
      JSON.stringify({ error: 'Missing required query parameter: tenantId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const emitter = getSSEEmitter();

  const subscribedJobs = jobId ? [jobId] : [];

  // Check Last-Event-ID header for reconnection
  const lastEventId = request.headers.get('Last-Event-ID') ?? undefined;

  const { connectionId, stream } = emitter.addClient(tenantId, {
    subscribedJobs,
    lastEventId,
  });

  // Clean up when the client disconnects
  request.signal.addEventListener('abort', () => {
    emitter.removeClient(connectionId);
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disable Nginx buffering
      'X-Connection-Id': connectionId,
    },
  });
}
