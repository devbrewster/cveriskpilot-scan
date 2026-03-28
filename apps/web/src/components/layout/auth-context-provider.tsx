'use client';

import { useState, useEffect, useMemo } from 'react';
import { AuthContext, type AuthContextValue, type UserRole } from '@/lib/auth-context';

function applySession(data: Record<string, unknown>): AuthContextValue {
  return {
    loaded: true,
    authenticated: true,
    userId: data.userId as string,
    organizationId: data.organizationId as string,
    role: data.role as UserRole,
    email: data.email as string,
    tier: (data.tier as string) ?? 'FREE',
    clientId: (data.clientId as string) ?? null,
    clientName: (data.clientName as string) ?? null,
  };
}

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
    async function initSession() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data?.authenticated) {
            setState(applySession(data));
            return;
          }
        }

        // Session invalid or missing — auto-bootstrap in dev mode
        if (process.env.NODE_ENV !== 'production') {
          const devRes = await fetch('/api/auth/dev-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
          });
          if (devRes.ok) {
            const devData = await devRes.json();
            if (devData.success) {
              // Re-fetch session to get the canonical shape
              const retryRes = await fetch('/api/auth/session');
              if (retryRes.ok) {
                const retryData = await retryRes.json();
                if (retryData?.authenticated) {
                  setState(applySession(retryData));
                  return;
                }
              }
            }
          }
        }

        setState((prev) => ({ ...prev, loaded: true, authenticated: false }));
      } catch {
        setState((prev) => ({ ...prev, loaded: true, authenticated: false }));
      }
    }

    initSession();
  }, []);

  const value = useMemo(() => state, [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
