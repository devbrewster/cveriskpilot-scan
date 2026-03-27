import { PrismaClient } from '@cveriskpilot/domain';

/**
 * SLA breach check cron function.
 *
 * Designed to be called by Cloud Scheduler, a cron job, or any external trigger.
 * Checks all organizations for SLA breaches and creates notifications for
 * assigned users.
 *
 * Usage:
 *   import { checkSlaBreaches } from '@/lib/sla-cron';
 *   await checkSlaBreaches();
 */

const CLOSED_STATUSES = [
  'VERIFIED_CLOSED',
  'ACCEPTED_RISK',
  'FALSE_POSITIVE',
  'NOT_APPLICABLE',
  'DUPLICATE',
] as const;

export interface SlaBreachResult {
  organizationId: string;
  breachedCases: number;
  approachingCases: number;
  notificationsCreated: number;
}

export async function checkSlaBreaches(
  prismaClient?: PrismaClient,
): Promise<SlaBreachResult[]> {
  const prisma = prismaClient ?? new PrismaClient();
  const results: SlaBreachResult[] = [];

  try {
    // Get all organizations
    const organizations = await prisma.organization.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    const now = new Date();
    const approachingThreshold = new Date(
      now.getTime() + 3 * 24 * 60 * 60 * 1000,
    );

    for (const org of organizations) {
      let notificationsCreated = 0;

      // Find breached cases (dueAt < now, not closed)
      const breachedCases = await prisma.vulnerabilityCase.findMany({
        where: {
          organizationId: org.id,
          dueAt: { lt: now },
          status: { notIn: [...CLOSED_STATUSES] },
        },
        select: {
          id: true,
          title: true,
          severity: true,
          dueAt: true,
          assignedToId: true,
        },
      });

      // Find approaching cases (dueAt between now and now+3 days)
      const approachingCases = await prisma.vulnerabilityCase.findMany({
        where: {
          organizationId: org.id,
          dueAt: { gte: now, lte: approachingThreshold },
          status: { notIn: [...CLOSED_STATUSES] },
        },
        select: {
          id: true,
          title: true,
          severity: true,
          dueAt: true,
          assignedToId: true,
        },
      });

      // Create notifications for breached cases
      for (const c of breachedCases) {
        if (!c.assignedToId || !c.dueAt) continue;

        const daysOverdue = Math.ceil(
          (now.getTime() - c.dueAt.getTime()) / (1000 * 60 * 60 * 24),
        );

        await prisma.notification.create({
          data: {
            userId: c.assignedToId,
            type: 'SLA_BREACH',
            title: `SLA Breached: ${c.title}`,
            message: `Case is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue (${c.severity} severity).`,
            relatedEntityType: 'VulnerabilityCase',
            relatedEntityId: c.id,
          },
        });
        notificationsCreated++;
      }

      // Create notifications for approaching deadlines
      for (const c of approachingCases) {
        if (!c.assignedToId || !c.dueAt) continue;

        const daysRemaining = Math.ceil(
          (c.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        await prisma.notification.create({
          data: {
            userId: c.assignedToId,
            type: 'SLA_APPROACHING',
            title: `SLA Deadline Approaching: ${c.title}`,
            message: `Case is due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} (${c.severity} severity).`,
            relatedEntityType: 'VulnerabilityCase',
            relatedEntityId: c.id,
          },
        });
        notificationsCreated++;
      }

      results.push({
        organizationId: org.id,
        breachedCases: breachedCases.length,
        approachingCases: approachingCases.length,
        notificationsCreated,
      });
    }

    return results;
  } finally {
    // Only disconnect if we created our own client
    if (!prismaClient) {
      await prisma.$disconnect();
    }
  }
}

/**
 * Check for expired risk exceptions and revert case statuses.
 */
export async function checkExpiredExceptions(
  prismaClient?: PrismaClient,
): Promise<number> {
  const prisma = prismaClient ?? new PrismaClient();
  let reverted = 0;

  try {
    const now = new Date();

    // Find approved exceptions that have expired
    const expired = await prisma.riskException.findMany({
      where: {
        approvedById: { not: null },
        expiresAt: { lt: now },
      },
      include: {
        vulnerabilityCase: {
          select: { id: true, status: true },
        },
      },
    });

    for (const ex of expired) {
      const evidence = ex.evidence as Record<string, unknown> | null;
      // Skip already-processed expired exceptions
      if (evidence?.expiredProcessed) continue;

      const caseStatus = ex.vulnerabilityCase.status;
      // Only revert if case is still in the exception-granted status
      if (
        caseStatus === 'ACCEPTED_RISK' ||
        caseStatus === 'FALSE_POSITIVE' ||
        caseStatus === 'NOT_APPLICABLE'
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).$transaction(async (tx: any) => {
          // Revert case to REOPENED
          await tx.vulnerabilityCase.update({
            where: { id: ex.vulnerabilityCaseId },
            data: { status: 'REOPENED' },
          });

          // Record workflow lineage
          await tx.workflowLineage.create({
            data: {
              vulnerabilityCaseId: ex.vulnerabilityCaseId,
              fromStatus: caseStatus,
              toStatus: 'REOPENED',
              reason: `Risk exception expired on ${ex.expiresAt?.toISOString()}`,
              metadata: { exceptionId: ex.id },
            },
          });

          // Mark exception as processed
          await tx.riskException.update({
            where: { id: ex.id },
            data: {
              evidence: {
                ...(evidence ?? {}),
                expiredProcessed: true,
                expiredProcessedAt: now.toISOString(),
              },
            },
          });
        });

        reverted++;
      }
    }

    return reverted;
  } finally {
    if (!prismaClient) {
      await prisma.$disconnect();
    }
  }
}
