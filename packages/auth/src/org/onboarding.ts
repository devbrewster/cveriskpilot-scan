// @cveriskpilot/auth — automated tenant onboarding pipeline

import type { PrismaClient } from '@cveriskpilot/domain';
import { UserRole, UserStatus, Tier } from '@cveriskpilot/domain';
import { hashPassword } from '../providers/credentials';
import { generateSlug } from './create';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingParams {
  orgName: string;
  ownerEmail: string;
  ownerName: string;
  ownerPassword?: string;
  tier?: string;
  features?: string[];
  defaultClientName?: string;
}

export interface OnboardingResult {
  orgId: string;
  userId: string;
  clientId: string;
  apiKey: string;
  slug: string;
}

// ---------------------------------------------------------------------------
// Tier entitlements mapping (kept in sync with billing config)
// ---------------------------------------------------------------------------

const TIER_ENTITLEMENTS: Record<string, Record<string, unknown>> = {
  FREE: { max_users: 1, max_assets: 50, max_monthly_uploads: 3, max_ai_calls: 50 },
  FOUNDERS_BETA: { max_users: 5, max_assets: 250, max_monthly_uploads: 'unlimited', max_ai_calls: 250 },
  PRO: { max_users: 10, max_assets: 500, max_monthly_uploads: 'unlimited', max_ai_calls: 500 },
  ENTERPRISE: { max_users: 50, max_assets: 5000, max_monthly_uploads: 'unlimited', max_ai_calls: 5000 },
  MSSP: { max_users: 'unlimited', max_assets: 'unlimited', max_monthly_uploads: 'unlimited', max_ai_calls: 'unlimited' },
};

function getEntitlementsForTier(tier: string): Record<string, unknown> {
  return TIER_ENTITLEMENTS[tier.toUpperCase()] ?? TIER_ENTITLEMENTS.FREE;
}

// Default SLA policy values
const DEFAULT_SLA = {
  name: 'Default SLA Policy',
  description: 'Automatically created during onboarding',
  criticalDays: 7,
  highDays: 30,
  mediumDays: 90,
  lowDays: 180,
  kevCriticalDays: 3,
  isDefault: true,
};

// ---------------------------------------------------------------------------
// Main onboarding pipeline
// ---------------------------------------------------------------------------

/**
 * Full tenant onboarding pipeline:
 * 1. Create Organization with tier/entitlements
 * 2. Create owner User
 * 3. Create default Client
 * 4. Set up default SLA policy
 * 5. Create default API key
 * 6. Initialize usage counters (handled via billing package at first use)
 * 7. Send welcome email (logged, actual send deferred to notification service)
 */
export async function onboardTenant(
  prisma: PrismaClient,
  params: OnboardingParams,
): Promise<OnboardingResult> {
  const {
    orgName,
    ownerEmail,
    ownerName,
    ownerPassword,
    tier = 'FREE',
    features,
    defaultClientName,
  } = params;

  // Resolve tier
  const tierEnum = (tier.toUpperCase() in Tier ? tier.toUpperCase() : 'FREE') as keyof typeof Tier;
  const entitlements = getEntitlementsForTier(tierEnum);

  // Merge feature overrides
  if (features && features.length > 0) {
    (entitlements as Record<string, unknown>).enabledFeatures = features;
  }

  // Generate slug
  let slug = generateSlug(orgName);
  const existingOrg = await (prisma as any).organization.findUnique({
    where: { slug },
  });
  if (existingOrg) {
    slug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;
  }

  // Hash password if provided
  const passwordHash = ownerPassword ? await hashPassword(ownerPassword) : null;

  // Generate API key
  const rawApiKey = `crp_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');

  // Execute everything in a transaction
  const result = await (prisma as any).$transaction(async (tx: any) => {
    // 1. Create Organization
    const org = await tx.organization.create({
      data: {
        name: orgName,
        slug,
        tier: Tier[tierEnum],
        entitlements,
      },
    });

    // 2. Create owner User
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

    // 3. Create default Client
    const clientName = defaultClientName || orgName;
    const clientSlug = generateSlug(clientName);
    const client = await tx.client.create({
      data: {
        organizationId: org.id,
        name: clientName,
        slug: clientSlug,
      },
    });

    // 4. Set up default SLA policy
    await tx.slaPolicy.create({
      data: {
        organizationId: org.id,
        ...DEFAULT_SLA,
      },
    });

    // 5. Create default API key
    await tx.apiKey.create({
      data: {
        organizationId: org.id,
        name: 'Default API Key',
        keyHash,
        scope: 'full',
        assignedClients: [client.id],
      },
    });

    return {
      orgId: org.id,
      userId: user.id,
      clientId: client.id,
      slug: org.slug,
    };
  });

  // 7. Log welcome email (actual sending deferred to notification service)
  console.log(
    `[onboarding] Welcome email queued for ${ownerEmail} (org: ${result.orgId}, tier: ${tierEnum})`,
  );

  return {
    ...result,
    apiKey: rawApiKey,
  };
}
