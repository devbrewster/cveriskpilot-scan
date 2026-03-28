'use client';

import { useState, useEffect, useMemo } from 'react';
import { AuthContext, type AuthContextValue, type UserRole } from '@/lib/auth-context';

export function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthContextValue>({
    loaded: false,
    authenticated: false,
    userId: null,
    organizationId: null,
    role: null,
    email: null,
    tier: null,
    clientId: null,
    clientName: null,
  });

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => {
        if (!res.ok) {
          setState((prev) => ({ ...prev, loaded: true, authenticated: false }));
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.authenticated) {
          setState({
            loaded: true,
            authenticated: true,
            userId: data.userId,
            organizationId: data.organizationId,
            role: data.role as UserRole,
            email: data.email,
            tier: data.tier,
            clientId: data.clientId,
            clientName: data.clientName,
          });
        }
      })
      .catch(() => {
        setState((prev) => ({ ...prev, loaded: true, authenticated: false }));
      });
  }, []);

  const value = useMemo(() => state, [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
