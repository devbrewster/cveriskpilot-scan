import { prisma } from '@/lib/prisma';

/**
 * Check whether an organization's Pro trial has expired.
 * If expired, automatically downgrades the org to FREE tier.
 *
 * @returns true if the trial just expired and was downgraded
 */
export async function checkTrialExpired(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { tier: true, trialEndsAt: true },
  });

  if (!org) return false;

  // No trial set — nothing to expire
  if (!org.trialEndsAt) return false;

  // Trial is still active
  if (org.trialEndsAt > new Date()) return false;

  // Trial has expired — downgrade to FREE
  await prisma.organization.update({
    where: { id: organizationId },
    data: { tier: 'FREE', trialEndsAt: null },
  });

  return true;
}
