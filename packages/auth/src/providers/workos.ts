// WorkOS SAML SSO provider for CVERiskPilot
// Handles WorkOS SSO initiation, callback, and JIT user provisioning

import type { PrismaClient } from '@cveriskpilot/domain';
import { UserRole, UserStatus } from '@cveriskpilot/domain';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkOSConfig {
  apiKey: string;
  clientId: string;
  redirectUri: string;
}

export interface SSOProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
  connectionId?: string;
  connectionType?: string;
  idpId?: string;
  rawAttributes?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

let workosConfig: WorkOSConfig | null = null;

/**
 * Get WorkOS configuration from environment variables.
 * Returns null if WorkOS is not configured (graceful degradation).
 */
export function getWorkOSConfig(): WorkOSConfig | null {
  if (workosConfig) return workosConfig;

  const apiKey = process.env.WORKOS_API_KEY;
  const clientId = process.env.WORKOS_CLIENT_ID;
  const redirectUri = process.env.WORKOS_REDIRECT_URI;

  if (!apiKey || !clientId || !redirectUri) {
    return null;
  }

  workosConfig = { apiKey, clientId, redirectUri };
  return workosConfig;
}

/**
 * Check if WorkOS SSO is available (configured).
 */
export function isWorkOSConfigured(): boolean {
  return getWorkOSConfig() !== null;
}

// ---------------------------------------------------------------------------
// SSO Flow
// ---------------------------------------------------------------------------

/**
 * Initiate a WorkOS SSO flow.
 * Returns the authorization URL to redirect the user to.
 */
export async function initiateSSO(
  organizationId: string,
  redirectUri?: string,
): Promise<string> {
  const config = getWorkOSConfig();
  if (!config) {
    throw new Error('WorkOS SSO is not configured. Set WORKOS_API_KEY, WORKOS_CLIENT_ID, and WORKOS_REDIRECT_URI.');
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri ?? config.redirectUri,
    response_type: 'code',
    organization: organizationId,
    state: crypto.randomUUID(),
  });

  return `https://api.workos.com/sso/authorize?${params.toString()}`;
}

/**
 * Handle the WorkOS SSO callback by exchanging the authorization code for a profile.
 */
export async function handleSSOCallback(code: string): Promise<SSOProfile> {
  const config = getWorkOSConfig();
  if (!config) {
    throw new Error('WorkOS SSO is not configured.');
  }

  const response = await fetch('https://api.workos.com/sso/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.apiKey,
      grant_type: 'authorization_code',
      code,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`WorkOS SSO token exchange failed: ${response.status} ${errorBody}`);
  }

  const data = (await response.json()) as {
    profile: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      organization_id?: string;
      connection_id?: string;
      connection_type?: string;
      idp_id?: string;
      raw_attributes?: Record<string, unknown>;
    };
  };

  const { profile } = data;

  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    organizationId: profile.organization_id,
    connectionId: profile.connection_id,
    connectionType: profile.connection_type,
    idpId: profile.idp_id,
    rawAttributes: profile.raw_attributes,
  };
}

/**
 * Find or create a user from an SSO profile.
 * If the user exists (matched by email within the org), updates SSO metadata.
 * Otherwise, creates a new user in the specified organization.
 */
export async function getOrCreateSSOUser(
  prisma: PrismaClient,
  profile: SSOProfile,
  orgId: string,
): Promise<{ userId: string; organizationId: string; isNewUser: boolean }> {
  // Try to find existing user by email in the organization
  let existingUser = await (prisma as any).user.findFirst({
    where: {
      email: profile.email,
      organizationId: orgId,
      deletedAt: null,
    },
  });

  if (existingUser) {
    // Update SSO metadata and last login
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

  // Check if org exists
  const org = await (prisma as any).organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw new Error(`Organization ${orgId} not found`);
  }

  // Create user in the org
  const user = await (prisma as any).user.create({
    data: {
      organizationId: orgId,
      email: profile.email,
      name: `${profile.firstName} ${profile.lastName}`.trim(),
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
