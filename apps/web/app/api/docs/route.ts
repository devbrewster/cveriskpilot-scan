// ---------------------------------------------------------------------------
// GET /api/docs — Serves the OpenAPI v3.1 specification (t113)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { openApiSpec } from '@cveriskpilot/api-docs';

/**
 * Returns the full OpenAPI v3.1 spec as JSON.
 * In production, requires authentication to prevent reconnaissance.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Gate behind auth in production to prevent API surface reconnaissance
  if (process.env.NODE_ENV === 'production') {
    const { getServerSession } = await import('@cveriskpilot/auth');
    const session = await getServerSession(request);
    if (!session) {
      return new NextResponse(null, { status: 404 });
    }
  }

  return NextResponse.json(openApiSpec, {
    status: 200,
    headers: {
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
