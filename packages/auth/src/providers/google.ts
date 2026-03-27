// Google OIDC provider for CVERiskPilot
// Handles Google ID token verification and JIT user provisioning

import type { PrismaClient } from '@cveriskpilot/domain';
import { UserRole, UserStatus, Tier } from '@cveriskpilot/domain';
import crypto from 'node:crypto';

/** Decoded payload from a Google ID token */
export interface GoogleUserInfo {
  sub: string;       // Google unique user ID
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  hd?: string;       // hosted domain (Google Workspace)
}

/** Google OIDC provider configuration */
export interface GoogleOIDCConfig {
  clientId: string;
  clientSecret: string;
}

/**
 * Get Google OIDC config from environment variables.
 * Throws if required env vars are missing.
 */
export function getGoogleOIDCConfig(): GoogleOIDCConfig {
  const clientId = process.env.GOOGLE_OIDC_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OIDC_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing Google OIDC configuration. Set GOOGLE_OIDC_CLIENT_ID and GOOGLE_OIDC_CLIENT_SECRET environment variables.',
    );
  }

  return { clientId, clientSecret };
}

/**
 * Verify a Google ID token by calling Google's tokeninfo endpoint.
 * Returns the decoded user info if valid.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  config?: GoogleOIDCConfig,
): Promise<GoogleUserInfo> {
  const { clientId } = config ?? getGoogleOIDCConfig();

  // Use Google's tokeninfo endpoint for verification
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );

  if (!response.ok) {
    throw new Error('Invalid Google ID token');
  }

  const payload = (await response.json()) as Record<string, unknown>;

  // Verify the audience matches our client ID
  if (payload.aud !== clientId) {
    throw new Error('Google ID token audience mismatch');
  }

  // Verify email is verified
  if (payload.email_verified !== 'true' && payload.email_verified !== true) {
    throw new Error('Google account email is not verified');
  }

  return {
    sub: payload.sub as string,
    email: payload.email as string,
    email_verified: true,
    name: payload.name as string,
    picture: payload.picture as string | undefined,
    hd: payload.hd as string | undefined,
  };
}

/**
 * Generate a URL-safe slug from an organization name.
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63);
}

/** Default entitlements for free-tier organizations */
const FREE_TIER_ENTITLEMENTS = {
  max_users: 1,
  max_assets: 50,
  max_monthly_uploads: 3,
  max_ai_calls: 50,
};

/**
 * Authenticate with Google and perform JIT provisioning.
 * If the user exists (matched by googleId or email), returns the existing user.
 * Otherwise, creates a new organization and user.
 */
export async function authenticateWithGoogle(
  prisma: PrismaClient,
  idToken: string,
  config?: GoogleOIDCConfig,
): Promise<{ userId: string; organizationId: string; isNewUser: boolean }> {
  const googleUser = await verifyGoogleIdToken(idToken, config);

  // Try to find existing user by googleId first, then by email
  let existingUser = await (prisma as any).user.findFirst({
    where: {
      googleId: googleUser.sub,
      deletedAt: null,
    },
  });

  if (!existingUser) {
    existingUser = await (prisma as any).user.findFirst({
      where: {
        email: googleUser.email,
        deletedAt: null,
      },
    });
  }

  if (existingUser) {
    // Update googleId if not set and update last login
    await (prisma as any).user.update({
      where: { id: existingUser.id },
      data: {
        googleId: existingUser.googleId ?? googleUser.sub,
        lastLoginAt: new Date(),
      },
    });

    return {
      userId: existingUser.id,
      organizationId: existingUser.organizationId,
      isNewUser: false,
    };
  }

  // JIT provisioning: create org + user in a transaction
  const result = await (prisma as any).$transaction(async (tx: any) => {
    const orgName = googleUser.hd
      ? googleUser.hd.split('.')[0]
      : `${googleUser.name}'s Org`;

    let slug = generateSlug(orgName);

    // Ensure slug uniqueness
    const existingOrg = await tx.organization.findUnique({
      where: { slug },
    });
    if (existingOrg) {
      slug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;
    }

    const org = await tx.organization.create({
      data: {
        name: orgName,
        slug,
        tier: Tier.FREE,
        entitlements: FREE_TIER_ENTITLEMENTS,
      },
    });

    const user = await tx.user.create({
      data: {
        organizationId: org.id,
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.sub,
        role: UserRole.ORG_OWNER,
        status: UserStatus.ACTIVE,
        lastLoginAt: new Date(),
      },
    });

    return { userId: user.id, organizationId: org.id };
  });

  return { ...result, isNewUser: true };
}
