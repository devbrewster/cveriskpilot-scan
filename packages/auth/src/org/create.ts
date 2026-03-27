// Organization creation for CVERiskPilot
// Creates a new organization with its first owner user

import type { PrismaClient } from '@cveriskpilot/domain';
import { UserRole, UserStatus, Tier } from '@cveriskpilot/domain';
import { hashPassword } from '../providers/credentials.js';
import crypto from 'node:crypto';

/** Default entitlements for free-tier organizations */
export const FREE_TIER_ENTITLEMENTS = {
  max_users: 1,
  max_assets: 50,
  max_monthly_uploads: 3,
  max_ai_calls: 50,
} as const;

/** Result of creating a new organization */
export interface CreateOrganizationResult {
  organizationId: string;
  userId: string;
  slug: string;
}

/**
 * Generate a URL-safe slug from an organization name.
 * Converts to lowercase, replaces non-alphanumeric chars with hyphens,
 * and trims leading/trailing hyphens.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63);
}

/**
 * Create a new organization and its first user (as ORG_OWNER).
 *
 * @param prisma - Prisma client instance (dependency injection)
 * @param name - Organization display name
 * @param ownerEmail - Email of the first user (org owner)
 * @param ownerName - Display name of the first user
 * @param ownerPassword - Optional password for the owner (if using credential auth)
 */
export async function createOrganization(
  prisma: PrismaClient,
  name: string,
  ownerEmail: string,
  ownerName: string,
  ownerPassword?: string,
): Promise<CreateOrganizationResult> {
  let slug = generateSlug(name);

  // Check slug uniqueness and append random suffix if needed
  const existingOrg = await (prisma as any).organization.findUnique({
    where: { slug },
  });
  if (existingOrg) {
    slug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;
  }

  // Hash password if provided
  const passwordHash = ownerPassword
    ? await hashPassword(ownerPassword)
    : null;

  // Create org + owner in a transaction
  const result = await (prisma as any).$transaction(async (tx: any) => {
    const org = await tx.organization.create({
      data: {
        name,
        slug,
        tier: Tier.FREE,
        entitlements: FREE_TIER_ENTITLEMENTS,
      },
    });

    const user = await tx.user.create({
      data: {
        organizationId: org.id,
        email: ownerEmail.toLowerCase().trim(),
        name: ownerName,
        passwordHash,
        role: UserRole.ORG_OWNER,
        status: UserStatus.ACTIVE,
      },
    });

    return {
      organizationId: org.id,
      userId: user.id,
      slug: org.slug,
    };
  });

  return result;
}
