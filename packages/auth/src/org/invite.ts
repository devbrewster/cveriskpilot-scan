// Organization invite flow for CVERiskPilot
// Handles creating invites and accepting them to provision new users

import type { PrismaClient } from '@cveriskpilot/domain';
import { UserRole, UserStatus } from '@cveriskpilot/domain';
import { hashPassword } from '../providers/credentials.js';
import crypto from 'node:crypto';

/** Default invite expiry: 7 days in milliseconds */
const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** Invite token data structure */
export interface InviteToken {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
  expiresAt: Date;
  token: string;
}

/** In-memory invite store (replace with DB table in production) */
// NOTE: For MVP, invites are stored in-memory. In production, this should be
// a database table or Redis store. The interface remains the same.
const inviteStore = new Map<string, InviteToken>();

/**
 * Create an invite for a user to join an organization.
 *
 * @param prisma - Prisma client instance
 * @param orgId - Organization ID to invite the user to
 * @param email - Email of the invited user
 * @param role - Role to assign to the invited user
 * @returns The created invite token data
 */
export async function createInvite(
  prisma: PrismaClient,
  orgId: string,
  email: string,
  role: UserRole,
): Promise<InviteToken> {
  const normalizedEmail = email.toLowerCase().trim();

  // Check that the organization exists
  const org = await (prisma as any).organization.findUnique({
    where: { id: orgId },
  });
  if (!org || org.deletedAt) {
    throw new Error('Organization not found');
  }

  // Check that the user doesn't already exist in this org
  const existingUser = await (prisma as any).user.findFirst({
    where: {
      organizationId: orgId,
      email: normalizedEmail,
      deletedAt: null,
    },
  });
  if (existingUser) {
    throw new Error('User already exists in this organization');
  }

  const invite: InviteToken = {
    id: crypto.randomUUID(),
    organizationId: orgId,
    email: normalizedEmail,
    role,
    expiresAt: new Date(Date.now() + INVITE_EXPIRY_MS),
    token: crypto.randomUUID(),
  };

  inviteStore.set(invite.token, invite);

  return invite;
}

/**
 * Get an invite by its token.
 * Returns null if the token is invalid or expired.
 */
export function getInvite(token: string): InviteToken | null {
  const invite = inviteStore.get(token);
  if (!invite) return null;

  if (invite.expiresAt <= new Date()) {
    inviteStore.delete(token);
    return null;
  }

  return invite;
}

/** Result of accepting an invite */
export interface AcceptInviteResult {
  userId: string;
  organizationId: string;
  email: string;
  role: UserRole;
}

/**
 * Accept an invite and create the user in the organization.
 *
 * @param prisma - Prisma client instance
 * @param token - The invite token string
 * @param name - Display name for the new user
 * @param password - Optional password for credential-based auth
 * @returns The created user's details
 */
export async function acceptInvite(
  prisma: PrismaClient,
  token: string,
  name: string,
  password?: string,
): Promise<AcceptInviteResult> {
  const invite = getInvite(token);
  if (!invite) {
    throw new Error('Invalid or expired invite token');
  }

  // Check the user doesn't already exist
  const existingUser = await (prisma as any).user.findFirst({
    where: {
      organizationId: invite.organizationId,
      email: invite.email,
      deletedAt: null,
    },
  });
  if (existingUser) {
    // Clean up the invite
    inviteStore.delete(token);
    throw new Error('User already exists in this organization');
  }

  // Hash password if provided
  const passwordHash = password ? await hashPassword(password) : null;

  // Create the user
  const user = await (prisma as any).user.create({
    data: {
      organizationId: invite.organizationId,
      email: invite.email,
      name,
      passwordHash,
      role: invite.role,
      status: UserStatus.ACTIVE,
    },
  });

  // Remove the used invite
  inviteStore.delete(token);

  return {
    userId: user.id,
    organizationId: invite.organizationId,
    email: invite.email,
    role: invite.role,
  };
}

/**
 * Revoke an existing invite by its token.
 */
export function revokeInvite(token: string): boolean {
  return inviteStore.delete(token);
}

/**
 * List all pending invites for an organization.
 */
export function listOrgInvites(orgId: string): InviteToken[] {
  const now = new Date();
  const invites: InviteToken[] = [];

  for (const invite of inviteStore.values()) {
    if (invite.organizationId === orgId && invite.expiresAt > now) {
      invites.push(invite);
    }
  }

  return invites;
}
