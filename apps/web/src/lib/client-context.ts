'use client';

import { createContext, useContext, useCallback, useMemo } from 'react';

export interface ClientContextValue {
  /** Current active client ID, or null for "All Clients" org-wide view */
  activeClientId: string | null;
  /** Current active client name for display */
  activeClientName: string | null;
  /** Switch to a specific client, or null for org-wide */
  setActiveClient: (clientId: string | null, clientName?: string | null) => void;
}

export const ClientContext = createContext<ClientContextValue>({
  activeClientId: null,
  activeClientName: null,
  setActiveClient: () => {},
});

export function useClientContext(): ClientContextValue {
  return useContext(ClientContext);
}

const COOKIE_NAME = 'crp_active_client';
const COOKIE_NAME_LABEL = 'crp_active_client_name';

/** Read the active client ID from the cookie (client-side only) */
export function getActiveClientFromCookie(): { id: string | null; name: string | null } {
  if (typeof document === 'undefined') return { id: null, name: null };
  const cookies = document.cookie.split(';').reduce<Record<string, string>>((acc, c) => {
    const [key, ...val] = c.trim().split('=');
    if (key) acc[key] = decodeURIComponent(val.join('='));
    return acc;
  }, {});
  return {
    id: cookies[COOKIE_NAME] || null,
    name: cookies[COOKIE_NAME_LABEL] || null,
  };
}

/** Set the active client cookie */
export function setActiveClientCookie(clientId: string | null, clientName: string | null = null) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  if (clientId) {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(clientId)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `${COOKIE_NAME_LABEL}=${encodeURIComponent(clientName || '')}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } else {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
    document.cookie = `${COOKIE_NAME_LABEL}=; path=/; max-age=0`;
  }
}
