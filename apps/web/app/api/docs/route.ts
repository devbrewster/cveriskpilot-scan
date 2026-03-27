// ---------------------------------------------------------------------------
// GET /api/docs — Serves the OpenAPI v3.1 specification (t113)
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { openApiSpec } from '@cveriskpilot/api-docs';

/**
 * Returns the full OpenAPI v3.1 spec as JSON.
 * This endpoint is unauthenticated so external tools (Swagger UI, Redoc, etc.)
 * can fetch the spec directly.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(openApiSpec, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
