import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, requireRole, WRITE_ROLES, checkCsrf } from '@cveriskpilot/auth';
import {
  adapterRegistry,
} from '@cveriskpilot/connectors';

/**
 * POST /api/connectors/test
 * Test a scanner connector's connection using provided credentials
 * (before the connector is persisted). Used by the creation wizard.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const roleCheck = requireRole(session.role, WRITE_ROLES);
    if (roleCheck) return roleCheck;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const { type, credentials } = body as {
      type?: string;
      credentials?: Record<string, string>;
    };

    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        { error: 'type is required' },
        { status: 400 },
      );
    }

    if (!credentials || typeof credentials !== 'object') {
      return NextResponse.json(
        { error: 'credentials are required' },
        { status: 400 },
      );
    }

    // Get the adapter for this connector type
    const adapter = adapterRegistry.get(type);
    if (!adapter) {
      return NextResponse.json({
        ok: false,
        message: `No adapter available for scanner type "${type}". Available types: ${adapterRegistry.list().join(', ')}`,
      });
    }

    // Test the connection
    let result: { ok: boolean; message: string };
    try {
      result = await adapter.testConnection(credentials as any);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown connection error';
      console.error('[API] Connector test connection error:', message);

      // Classify common error types — return generic messages without internal details
      if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
        result = { ok: false, message: 'Network error: Unable to reach endpoint' };
      } else if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        result = { ok: false, message: 'Connection timed out' };
      } else if (message.includes('401') || message.includes('403') || message.includes('Unauthorized')) {
        result = { ok: false, message: 'Authentication failed' };
      } else {
        result = { ok: false, message: 'Connection test failed' };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] POST /api/connectors/test error:', error);
    return NextResponse.json(
      { error: 'Failed to test connector' },
      { status: 500 },
    );
  }
}
