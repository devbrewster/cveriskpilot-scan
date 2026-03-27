'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClientContext,
  getActiveClientFromCookie,
  setActiveClientCookie,
} from '@/lib/client-context';

export function ClientContextProvider({ children }: { children: React.ReactNode }) {
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [activeClientName, setActiveClientName] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Read from cookie on mount
  useEffect(() => {
    const { id, name } = getActiveClientFromCookie();
    setActiveClientId(id);
    setActiveClientName(name);
    setInitialized(true);
  }, []);

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
