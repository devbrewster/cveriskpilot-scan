'use client';

import { createContext, useContext } from 'react';

export type UserRole =
  | 'PLATFORM_ADMIN'
  | 'PLATFORM_SUPPORT'
  | 'ORG_OWNER'
  | 'SECURITY_ADMIN'
  | 'ANALYST'
  | 'DEVELOPER'
  | 'VIEWER'
  | 'SERVICE_ACCOUNT'
  | 'CLIENT_ADMIN'
  | 'CLIENT_VIEWER';

export interface AuthContextValue {
  /** Whether the session has been fetched (regardless of auth status) */
  loaded: boolean;
  /** Whether the user is authenticated */
  authenticated: boolean;
  userId: string | null;
  organizationId: string | null;
  role: UserRole | null;
  email: string | null;
  tier: string | null;
  /** ISO date string — set when org is on a Pro trial */
  trialEndsAt: string | null;
  clientId: string | null;
  clientName: string | null;
}

export const AuthContext = createContext<AuthContextValue>({
  loaded: false,
  authenticated: false,
  userId: null,
  organizationId: null,
  role: null,
  email: null,
  tier: null,
  trialEndsAt: null,
  clientId: null,
  clientName: null,
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
