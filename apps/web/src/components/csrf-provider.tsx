'use client';

import { useEffect } from 'react';
import { installCsrfInterceptor } from '@/lib/csrf';

/**
 * Installs a global fetch interceptor that auto-injects the CSRF token
 * (from the crp_csrf cookie) on all mutation requests (POST/PUT/DELETE/PATCH).
 *
 * Mount once in the root layout. No visual output.
 */
export function CsrfProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    installCsrfInterceptor();
  }, []);

  return <>{children}</>;
}
