'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  ClientContext,
  getActiveClientFromCookie,
  setActiveClientCookie,
} from '@/lib/client-context';

export function ClientContextProvider({ children }: { children: React.ReactNode }) {
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [activeClientName, setActiveClientName] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const { loaded: authLoaded, clientId: sessionClientId, clientName: sessionClientName } = useAuth();

  // Read from cookie on mount; fall back to session clientId if no cookie
  useEffect(() => {
    if (!authLoaded) return;
    const { id, name } = getActiveClientFromCookie();
    if (id) {
      setActiveClientId(id);
      setActiveClientName(name);
    } else if (sessionClientId) {
      // No cookie yet — seed from session (e.g., first dev-session)
      setActiveClientId(sessionClientId);
      setActiveClientName(sessionClientName);
      setActiveClientCookie(sessionClientId, sessionClientName);
    }
    setInitialized(true);
  }, [authLoaded, sessionClientId, sessionClientName]);

  const setActiveClient = useCallback(
    (clientId: string | null, clientName: string | null = null) => {
      setActiveClientId(clientId);
      setActiveClientName(clientName);
      setActiveClientCookie(clientId, clientName);
    },
    [],
  );

  const value = useMemo(
    () => ({ activeClientId, activeClientName, setActiveClient }),
    [activeClientId, activeClientName, setActiveClient],
  );

  // Don't render children until we've read the cookie to avoid hydration mismatch
  if (!initialized) return null;

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
}
