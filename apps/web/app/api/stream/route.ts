// SSE streaming endpoint for real-time scan progress
//
// GET /api/stream?jobId=...
//
// Clients connect via EventSource and receive progress, phase-change,
// finding, error, and complete events as the scan pipeline runs.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@cveriskpilot/auth';
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
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const session = auth;

  const tenantId = session.organizationId;
  const { searchParams } = request.nextUrl;
  const jobId = searchParams.get('jobId');

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
