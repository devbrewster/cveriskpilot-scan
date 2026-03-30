// Per-tenant SSO provider for CVERiskPilot
// Allows each client organization to configure their own IdP

import type { PrismaClient } from '@cveriskpilot/domain';
import { UserRole, UserStatus } from '@cveriskpilot/domain';
import crypto from 'node:crypto';
import { validateExternalUrl } from '../security/url-validator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** IdP configuration stored in org entitlements JSON */
export interface TenantIdPConfig {
  provider: 'saml' | 'oidc';
  /** SAML: SSO URL; OIDC: Authorization endpoint */
  ssoUrl: string;
  /** SAML: Certificate (PEM); OIDC: Client ID */
  certificate?: string;
  /** OIDC-specific fields */
  clientId?: string;
  clientSecret?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  /** Issuer for token validation */
  issuer?: string;
  /** Redirect URI override for this tenant */
  redirectUri?: string;
  /** Whether this IdP config is enabled */
  enabled: boolean;
}

export interface TenantSSOProfile {
  email: string;
  name: string;
  sub: string;
  groups?: string[];
  rawAttributes?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the tenant IdP config from the organization's entitlements JSON.
 */
export async function getTenantIdPConfig(
  prisma: PrismaClient,
  clientId: string,
): Promise<TenantIdPConfig | null> {
  const client = await (prisma as any).client.findUnique({
    where: { id: clientId },
    include: { organization: true },
  });

  if (!client?.organization?.entitlements) {
    return null;
  }

  const entitlements = client.organization.entitlements as Record<string, unknown>;
  const tenantSso = entitlements.tenantSso as Record<string, TenantIdPConfig> | undefined;

  if (!tenantSso?.[clientId]) {
    return null;
  }

  return tenantSso[clientId];
}

/**
 * Save tenant IdP config to the organization's entitlements.
 */
export async function saveTenantIdPConfig(
  prisma: PrismaClient,
  orgId: string,
  clientId: string,
  config: TenantIdPConfig,
): Promise<void> {
  const org = await (prisma as any).organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw new Error(`Organization ${orgId} not found`);
  }

  const entitlements = (org.entitlements ?? {}) as Record<string, unknown>;
  const tenantSso = (entitlements.tenantSso ?? {}) as Record<string, TenantIdPConfig>;

  // Validate URLs at configuration time to reject private/internal IPs early
  const urlsToValidate: { label: string; url: string | undefined }[] = [
    { label: 'ssoUrl', url: config.ssoUrl },
    { label: 'tokenEndpoint', url: config.tokenEndpoint },
    { label: 'userinfoEndpoint', url: config.userinfoEndpoint },
  ];

  for (const { label, url } of urlsToValidate) {
    if (url) {
      const result = validateExternalUrl(url);
      if (!result.valid) {
        throw new Error(`Invalid ${label}: ${result.reason}`);
      }
    }
  }

  tenantSso[clientId] = config;

  await (prisma as any).organization.update({
    where: { id: orgId },
    data: {
      entitlements: { ...entitlements, tenantSso },
    },
  });
}

// ---------------------------------------------------------------------------
// SSO Flow
// ---------------------------------------------------------------------------

/**
 * Initiate SSO for a specific client's IdP.
 * Returns the authorization URL the user should be redirected to.
 */
export async function initiateTenantSSO(
  clientId: string,
  config: TenantIdPConfig,
): Promise<string> {
  if (!config.enabled) {
    throw new Error('SSO is not enabled for this tenant');
  }

  const state = crypto.randomUUID();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (config.provider === 'oidc') {
    if (!config.clientId) {
      throw new Error('OIDC client ID is required for tenant SSO');
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri ?? `${baseUrl}/api/auth/sso/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state: `${clientId}:${state}`,
    });

    return `${config.ssoUrl}?${params.toString()}`;
  }

  if (config.provider === 'saml') {
    // For SAML, we redirect to the IdP's SSO URL with RelayState
    const params = new URLSearchParams({
      RelayState: `${clientId}:${state}`,
    });

    return `${config.ssoUrl}?${params.toString()}`;
  }

  throw new Error(`Unsupported SSO provider: ${config.provider}`);
}

/**
 * Handle SSO callback for a specific client's IdP.
 * Exchanges the authorization code for a user profile.
 */
export async function handleTenantSSOCallback(
  code: string,
  clientId: string,
  config: TenantIdPConfig,
): Promise<TenantSSOProfile> {
  if (config.provider !== 'oidc') {
    throw new Error('Only OIDC tenant SSO callback is currently supported');
  }

  if (!config.clientId || !config.clientSecret || !config.tokenEndpoint) {
    throw new Error('OIDC tenant SSO configuration is incomplete');
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Validate token endpoint URL against SSRF (defense-in-depth; also checked at config save time)
  const tokenUrlCheck = validateExternalUrl(config.tokenEndpoint);
  if (!tokenUrlCheck.valid) {
    throw new Error(`Blocked tokenEndpoint URL: ${tokenUrlCheck.reason}`);
  }

  // Exchange code for tokens
  const tokenResponse = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri ?? `${baseUrl}/api/auth/sso/callback`,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    throw new Error(`Tenant SSO token exchange failed: ${tokenResponse.status} ${errorBody}`);
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    id_token?: string;
  };

  // Fetch user info
  if (!config.userinfoEndpoint) {
    throw new Error('Userinfo endpoint is required for OIDC tenant SSO');
  }

  // Validate userinfo endpoint URL against SSRF (defense-in-depth)
  const userinfoUrlCheck = validateExternalUrl(config.userinfoEndpoint);
  if (!userinfoUrlCheck.valid) {
    throw new Error(`Blocked userinfoEndpoint URL: ${userinfoUrlCheck.reason}`);
  }

  const userinfoResponse = await fetch(config.userinfoEndpoint, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!userinfoResponse.ok) {
    throw new Error(`Failed to fetch user info: ${userinfoResponse.status}`);
  }

  const userinfo = (await userinfoResponse.json()) as Record<string, unknown>;

  return {
    email: userinfo.email as string,
    name: (userinfo.name as string) ?? `${userinfo.given_name ?? ''} ${userinfo.family_name ?? ''}`.trim(),
    sub: userinfo.sub as string,
    groups: userinfo.groups as string[] | undefined,
    rawAttributes: userinfo,
  };
}

/**
 * Find or create a user from a tenant SSO profile.
 */
export async function getOrCreateTenantSSOUser(
  prisma: PrismaClient,
  profile: TenantSSOProfile,
  orgId: string,
): Promise<{ userId: string; organizationId: string; isNewUser: boolean }> {
  // Find existing user in the org by email
  const existingUser = await (prisma as any).user.findFirst({
    where: {
      email: profile.email,
      organizationId: orgId,
      deletedAt: null,
    },
  });

  if (existingUser) {
    await (prisma as any).user.update({
      where: { id: existingUser.id },
      data: {
        lastLoginAt: new Date(),
        status: existingUser.status === UserStatus.PENDING_INVITE
          ? UserStatus.ACTIVE
          : existingUser.status,
      },
    });

    return {
      userId: existingUser.id,
      organizationId: existingUser.organizationId,
      isNewUser: false,
    };
  }

  // Create new user
  const user = await (prisma as any).user.create({
    data: {
      organizationId: orgId,
      email: profile.email,
      name: profile.name,
      role: UserRole.VIEWER,
      status: UserStatus.ACTIVE,
      lastLoginAt: new Date(),
    },
  });

  return {
    userId: user.id,
    organizationId: orgId,
    isNewUser: true,
  };
}
