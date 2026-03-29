import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';

type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'STATE_CHANGE'
  | 'RISK_EXCEPTION'
  | 'EXPORT'
  | 'LOGIN'
  | 'LOGOUT';

const VALID_ACTIONS: AuditAction[] = [
  'CREATE', 'READ', 'UPDATE', 'DELETE', 'STATE_CHANGE',
  'RISK_EXCEPTION', 'EXPORT', 'LOGIN', 'LOGOUT',
];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

    // Filters
    const actionFilter = searchParams.get('action') as AuditAction | null;
    const entityTypeFilter = searchParams.get('entityType');
    const fromFilter = searchParams.get('from');
    const toFilter = searchParams.get('to');

    // Validate action filter if provided
    if (actionFilter && !VALID_ACTIONS.includes(actionFilter)) {
      return NextResponse.json(
        { error: `Invalid action filter. Must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 },
      );
    }

    // Build Prisma where clause, scoped to organization
    const where: Record<string, unknown> = {
      organizationId: session.organizationId,
    };

    if (actionFilter) {
      where.action = actionFilter;
    }
    if (entityTypeFilter) {
      where.entityType = entityTypeFilter;
    }
    if (fromFilter || toFilter) {
      const createdAt: Record<string, Date> = {};
      if (fromFilter) {
        const fromDate = new Date(fromFilter);
        if (!isNaN(fromDate.getTime())) {
          createdAt.gte = fromDate;
        }
      }
      if (toFilter) {
        const toDate = new Date(toFilter);
        if (!isNaN(toDate.getTime())) {
          createdAt.lte = toDate;
        }
      }
      if (Object.keys(createdAt).length > 0) {
        where.createdAt = createdAt;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Map to response shape matching what the frontend expects
    const mapped = logs.map((l) => ({
      id: l.id,
      organizationId: l.organizationId,
      entityType: l.entityType,
      entityId: l.entityId,
      action: l.action,
      actorId: l.actorId,
      actorIp: l.actorIp,
      details: l.details,
      hash: l.hash,
      previousHash: l.previousHash,
      createdAt: l.createdAt.toISOString(),
    }));

    return NextResponse.json({
      logs: mapped,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('[API] GET /api/audit-logs error:', error);
    return NextResponse.json(
      { error: 'Failed to load audit logs' },
      { status: 500 },
    );
  }
}
