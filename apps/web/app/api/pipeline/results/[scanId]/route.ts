import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@cveriskpilot/auth';
import { validateApiKey, hasScope } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ scanId: string }>;
}

/**
 * GET /api/pipeline/results/[scanId]
 *
 * Retrieve full scan results by scan ID.
 * Auth: API key (Bearer crp_*) or browser session.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // ---- Auth: API key or session ----
    let organizationId: string | undefined;

    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const apiKey = authHeader.slice(7).trim();
      const keyResult = await validateApiKey(prisma, apiKey);

      if (!keyResult.valid) {
        return NextResponse.json(
          { error: keyResult.error ?? 'Invalid API key' },
          { status: 401 },
        );
      }

      if (
        !hasScope(keyResult.scope ?? '', 'pipeline') &&
        !hasScope(keyResult.scope ?? '', 'read')
      ) {
        return NextResponse.json(
          { error: 'API key does not have pipeline or read scope' },
          { status: 403 },
        );
      }

      organizationId = keyResult.organizationId;
    } else {
      const auth = await requireAuth(request);
      if (auth instanceof NextResponse) return auth;
      const session = auth;
      organizationId = session.organizationId;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ---- Load scan result ----
    const { scanId } = await context.params;

    if (!scanId || typeof scanId !== 'string' || scanId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid scan ID' },
        { status: 400 },
      );
    }

    let scanResult: Record<string, unknown> | null = null;

    try {
      scanResult = await prisma.pipelineScanResult.findFirst({
        where: { id: scanId, organizationId },
      });
    } catch (err) {
      console.error('[pipeline/results] Failed to query scan result:', err);
      return NextResponse.json(
        { error: 'Failed to retrieve scan result' },
        { status: 500 },
      );
    }

    if (!scanResult) {
      return NextResponse.json(
        { error: 'Scan result not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(scanResult);
  } catch (error) {
    console.error('[API] GET /api/pipeline/results/[scanId] error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve scan results' },
      { status: 500 },
    );
  }
}
