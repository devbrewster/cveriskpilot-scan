/**
 * CSRF helper for client-side fetch calls.
 *
 * Reads the crp_csrf cookie and includes it as X-CSRF-Token header
 * on state-changing requests (POST, PUT, DELETE, PATCH).
 */

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)crp_csrf=([^;]*)/);
  return match?.[1] ?? '';
}

/**
 * Wrapper around fetch that automatically includes the CSRF token
 * on mutation requests.
 */
export function fetchWithCsrf(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase();

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const headers = new Headers(init?.headers);
    if (!headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', getCsrfToken());
    }
    if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(input, { ...init, headers });
  }

  return fetch(input, init);
}

/**
 * Install a global fetch interceptor that auto-injects the CSRF token
 * on all mutation requests. Call once in the app root (client-side only).
 */
let installed = false;
export function installCsrfInterceptor(): void {
  if (installed) return;
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = function csrfFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const method = (init?.method ?? 'GET').toUpperCase();

    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const headers = new Headers(init?.headers);
      if (!headers.has('X-CSRF-Token')) {
        const token = getCsrfToken();
        if (token) {
          headers.set('X-CSRF-Token', token);
        }
      }
      return originalFetch(input, { ...init, headers });
    }

    return originalFetch(input, init);
  };

  installed = true;
}
