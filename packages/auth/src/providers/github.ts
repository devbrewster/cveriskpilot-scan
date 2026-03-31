// GitHub OAuth provider for CVERiskPilot
// Handles GitHub OAuth code exchange, user info retrieval, and JIT user provisioning

import type { PrismaClient } from '@cveriskpilot/domain';
import { UserRole, UserStatus, Tier } from '@cveriskpilot/domain';
import crypto from 'node:crypto';

/** User info returned from the GitHub API */
export interface GitHubUserInfo {
  id: number;
  login: string;
  email: string;
  name: string;
  avatar_url?: string;
}

/** GitHub OAuth provider configuration */
export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
}

/**
 * Get GitHub OAuth config from environment variables.
 * Throws if required env vars are missing.
 */
export function getGitHubOAuthConfig(): GitHubOAuthConfig {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing GitHub OAuth configuration. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.',
    );
  }

  return { clientId, clientSecret };
}

/**
 * Exchange a GitHub authorization code for an access token.
 */
export async function exchangeGitHubCode(
  code: string,
  redirectUri: string,
  config?: GitHubOAuthConfig,
): Promise<{ access_token: string }> {
  const { clientId, clientSecret } = config ?? getGitHubOAuthConfig();

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;

  if (data.error) {
    throw new Error(`GitHub token exchange error: ${data.error} - ${data.error_description}`);
  }

  if (!data.access_token || typeof data.access_token !== 'string') {
    throw new Error('GitHub token exchange returned no access_token');
  }

  return { access_token: data.access_token };
}

/**
 * Get GitHub user info using an access token.
 * If the user's email is not public, fetches from /user/emails and picks the primary verified email.
 */
export async function getGitHubUser(accessToken: string): Promise<GitHubUserInfo> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub user info request failed: ${response.status}`);
  }

  const user = (await response.json()) as Record<string, unknown>;

  let email = user.email as string | null;

  // If email is null (private), fetch from /user/emails
  if (!email) {
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!emailsResponse.ok) {
      throw new Error(`GitHub user emails request failed: ${emailsResponse.status}`);
    }

    const emails = (await emailsResponse.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;

    const primaryEmail = emails.find((e) => e.primary && e.verified);
    if (!primaryEmail) {
      throw new Error('No verified primary email found on GitHub account');
    }

    email = primaryEmail.email;
  }

  return {
    id: user.id as number,
    login: user.login as string,
    email,
    name: (user.name as string) || (user.login as string),
    avatar_url: user.avatar_url as string | undefined,
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
 * Authenticate with GitHub and perform JIT provisioning.
 * If the user exists (matched by githubId or email), returns the existing user.
 * Otherwise, creates a new organization and user.
 */
export async function authenticateWithGitHub(
  prisma: PrismaClient,
  code: string,
  redirectUri: string,
  config?: GitHubOAuthConfig,
): Promise<{ userId: string; organizationId: string; isNewUser: boolean }> {
  const { access_token } = await exchangeGitHubCode(code, redirectUri, config);
  const githubUser = await getGitHubUser(access_token);

  const githubIdStr = String(githubUser.id);

  // Try to find existing user by githubId first, then by email
  let existingUser = await (prisma as any).user.findFirst({
    where: {
      githubId: githubIdStr,
      deletedAt: null,
    },
  });

  if (!existingUser) {
    existingUser = await (prisma as any).user.findFirst({
      where: {
        email: githubUser.email,
        deletedAt: null,
      },
    });
  }

  if (existingUser) {
    // Update githubId if not set and update last login
    await (prisma as any).user.update({
      where: { id: existingUser.id },
      data: {
        githubId: existingUser.githubId ?? githubIdStr,
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
    const orgName = `${githubUser.login}'s Org`;
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
        email: githubUser.email,
        name: githubUser.name,
        githubId: githubIdStr,
        role: UserRole.ORG_OWNER,
        status: UserStatus.ACTIVE,
        lastLoginAt: new Date(),
      },
    });

    return { userId: user.id, organizationId: org.id };
  });

  return { ...result, isNewUser: true };
}
