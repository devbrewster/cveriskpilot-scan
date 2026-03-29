import { prisma } from '@/lib/prisma';
import type { Prisma } from '@cveriskpilot/domain';

/**
 * Lightweight audit log helper for API routes.
 * Persists an audit entry to the AuditLog table with a simple hash.
 *
 * Fire-and-forget by default — failures are logged but do not propagate.
 */
export async function logAudit(params: {
  organizationId: string;
  actorId: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'STATE_CHANGE' | 'RISK_EXCEPTION' | 'EXPORT' | 'LOGIN' | 'LOGOUT';
  entityType: string;
  entityId: string;
  details?: Prisma.InputJsonValue;
  actorIp?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details ?? {},
        actorIp: params.actorIp,
        hash: `${params.action.toLowerCase()}-${params.entityType.toLowerCase()}-${params.entityId}-${Date.now()}`,
      },
    });
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err);
  }
}
