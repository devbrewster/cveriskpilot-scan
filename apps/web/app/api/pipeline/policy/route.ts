import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@cveriskpilot/auth';
import { validateApiKey, hasScope } from '@cveriskpilot/auth';
import { UserRole } from '@cveriskpilot/domain';
import { getDefaultPolicy } from '@cveriskpilot/compliance';
import type { PipelinePolicy } from '@cveriskpilot/compliance';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Roles allowed to modify pipeline policy
// ---------------------------------------------------------------------------

const POLICY_ADMIN_ROLES = new Set<string>([
  UserRole.PLATFORM_ADMIN,
  UserRole.ORG_OWNER,
  UserRole.SECURITY_ADMIN,
]);

// ---------------------------------------------------------------------------
// Auth helper — supports both API key and session
// ---------------------------------------------------------------------------

async function authenticateRequest(
  request: NextRequest,
): Promise<
  | { organizationId: string; role: string; userId: string; error?: undefined; status?: undefined }
  | { error: string; status: number; organizationId?: undefined; role?: undefined; userId?: undefined }
> {
  const authHeader = request.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const apiKey = authHeader.slice(7).trim();
    const keyResult = await validateApiKey(prisma, apiKey);

    if (!keyResult.valid) {
      return { error: keyResult.error ?? 'Invalid API key', status: 401 };
    }

    if (!hasScope(keyResult.scope ?? '', 'pipeline') && !hasScope(keyResult.scope ?? '', 'admin')) {
      return { error: 'API key does not have pipeline or admin scope', status: 403 };
    }

    return {
      organizationId: keyResult.organizationId!,
      role: keyResult.scope === 'admin' ? UserRole.ORG_OWNER : UserRole.ANALYST,
      userId: keyResult.keyId ?? 'api-key',
    };
  }

  const session = await getServerSession(request);
  if (!session) {
    return { error: 'Unauthorized', status: 401 };
  }

  return {
    organizationId: session.organizationId,
    role: session.role,
    userId: session.userId,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_SEVERITIES = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);

function validatePolicyInput(body: unknown): { data: Partial<PipelinePolicy>; error?: never } | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' };
  }

  const data = body as Record<string, unknown>;
  const policy: Partial<PipelinePolicy> = {};

  if (data['frameworks'] !== undefined) {
    if (!Array.isArray(data['frameworks'])) {
      return { error: 'frameworks must be an array of framework ID strings' };
    }
    policy.frameworks = data['frameworks'] as string[];
  }

  if (data['blockOnSeverity'] !== undefined) {
    if (!VALID_SEVERITIES.has(data['blockOnSeverity'] as string)) {
      return { error: `blockOnSeverity must be one of: ${[...VALID_SEVERITIES].join(', ')}` };
    }
    policy.blockOnSeverity = data['blockOnSeverity'] as PipelinePolicy['blockOnSeverity'];
  }

  if (data['blockOnControlViolation'] !== undefined) {
    if (typeof data['blockOnControlViolation'] !== 'boolean') {
      return { error: 'blockOnControlViolation must be a boolean' };
    }
    policy.blockOnControlViolation = data['blockOnControlViolation'];
  }

  if (data['warnOnly'] !== undefined) {
    if (typeof data['warnOnly'] !== 'boolean') {
      return { error: 'warnOnly must be a boolean' };
    }
    policy.warnOnly = data['warnOnly'];
  }

  if (data['autoExceptionRules'] !== undefined) {
    if (!Array.isArray(data['autoExceptionRules'])) {
      return { error: 'autoExceptionRules must be an array' };
    }
    policy.autoExceptionRules = data['autoExceptionRules'] as PipelinePolicy['autoExceptionRules'];
  }

  if (data['gracePeriodDays'] !== undefined) {
    if (typeof data['gracePeriodDays'] !== 'number' || data['gracePeriodDays'] < 0) {
      return { error: 'gracePeriodDays must be a non-negative number' };
    }
    policy.gracePeriodDays = data['gracePeriodDays'];
  }

  return { data: policy };
}

// ---------------------------------------------------------------------------
// GET /api/pipeline/policy — fetch org's pipeline policy
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let policy: PipelinePolicy;

    try {
      const stored = await (prisma as any).pipelinePolicy?.findUnique?.({
        where: { organizationId: auth.organizationId },
      });

      if (stored) {
        policy = {
          orgId: auth.organizationId,
          frameworks: stored.frameworks ?? ['nist-800-53'],
          blockOnSeverity: stored.blockOnSeverity ?? 'CRITICAL',
          blockOnControlViolation: stored.blockOnControlViolation ?? false,
          warnOnly: stored.warnOnly ?? false,
          autoExceptionRules: stored.autoExceptionRules ?? [],
          gracePeriodDays: stored.gracePeriodDays ?? 0,
        };
      } else {
        policy = getDefaultPolicy(auth.organizationId);
      }
    } catch {
      // PipelinePolicy table may not exist yet — return defaults
      policy = getDefaultPolicy(auth.organizationId);
    }

    return NextResponse.json({ policy });
  } catch (error) {
    console.error('[API] GET /api/pipeline/policy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline policy' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/pipeline/policy — update org's pipeline policy (admin only)
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Admin role check
    if (!POLICY_ADMIN_ROLES.has(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: only admins can update pipeline policy' },
        { status: 403 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400 },
      );
    }

    const validation = validatePolicyInput(body);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const updates = validation.data;

    // Try to persist — if PipelinePolicy table doesn't exist, return the merged defaults
    let savedPolicy: PipelinePolicy;

    try {
      const stored = await (prisma as any).pipelinePolicy?.upsert?.({
        where: { organizationId: auth.organizationId },
        update: {
          ...updates,
          updatedAt: new Date(),
        },
        create: {
          organizationId: auth.organizationId,
          frameworks: updates.frameworks ?? ['nist-800-53'],
          blockOnSeverity: updates.blockOnSeverity ?? 'CRITICAL',
          blockOnControlViolation: updates.blockOnControlViolation ?? false,
          warnOnly: updates.warnOnly ?? false,
          autoExceptionRules: updates.autoExceptionRules ?? [],
          gracePeriodDays: updates.gracePeriodDays ?? 0,
        },
      });

      savedPolicy = {
        orgId: auth.organizationId,
        frameworks: stored.frameworks,
        blockOnSeverity: stored.blockOnSeverity,
        blockOnControlViolation: stored.blockOnControlViolation,
        warnOnly: stored.warnOnly,
        autoExceptionRules: stored.autoExceptionRules,
        gracePeriodDays: stored.gracePeriodDays,
      };
    } catch {
      // PipelinePolicy table may not exist yet — return merged defaults
      const defaults = getDefaultPolicy(auth.organizationId);
      savedPolicy = { ...defaults, ...updates, orgId: auth.organizationId };
    }

    // Audit log (fire-and-forget)
    (prisma as any).auditLog?.create?.({
      data: {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'UPDATE',
        entityType: 'PipelinePolicy',
        entityId: auth.organizationId,
        details: { updates },
        hash: `pipeline-policy-${auth.organizationId}-${Date.now()}`,
      },
    }).catch(() => {
      // Best-effort audit logging
    });

    return NextResponse.json({ policy: savedPolicy });
  } catch (error) {
    console.error('[API] PUT /api/pipeline/policy error:', error);
    return NextResponse.json(
      { error: 'Failed to update pipeline policy' },
      { status: 500 },
    );
  }
}
