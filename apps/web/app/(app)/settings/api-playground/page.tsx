'use client';

import { useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Endpoint catalogue
// ---------------------------------------------------------------------------

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  hasBody: boolean;
}

interface EndpointGroup {
  tag: string;
  endpoints: Endpoint[];
}

const ENDPOINT_GROUPS: EndpointGroup[] = [
  {
    tag: 'Cases',
    endpoints: [
      { method: 'GET', path: '/api/cases', description: 'List cases', hasBody: false },
      { method: 'GET', path: '/api/cases/:id', description: 'Get case by ID', hasBody: false },
      { method: 'POST', path: '/api/cases/:id', description: 'Update case', hasBody: true },
    ],
  },
  {
    tag: 'Findings',
    endpoints: [
      { method: 'GET', path: '/api/findings', description: 'List findings', hasBody: false },
      { method: 'GET', path: '/api/findings/:id', description: 'Get finding by ID', hasBody: false },
      { method: 'POST', path: '/api/findings/:id/enrich', description: 'Enrich finding with AI', hasBody: true },
    ],
  },
  {
    tag: 'Uploads',
    endpoints: [
      { method: 'POST', path: '/api/upload', description: 'Upload scan file', hasBody: true },
    ],
  },
  {
    tag: 'Dashboard',
    endpoints: [
      { method: 'GET', path: '/api/dashboard/stats', description: 'Dashboard statistics', hasBody: false },
      { method: 'GET', path: '/api/dashboard/trends', description: 'Dashboard trends', hasBody: false },
    ],
  },
  {
    tag: 'AI',
    endpoints: [
      { method: 'POST', path: '/api/ai/query', description: 'AI natural-language query', hasBody: true },
      { method: 'POST', path: '/api/ai/executive-summary', description: 'Generate executive summary', hasBody: true },
    ],
  },
  {
    tag: 'Compliance',
    endpoints: [
      { method: 'GET', path: '/api/compliance/scores', description: 'Compliance framework scores', hasBody: false },
    ],
  },
  {
    tag: 'Audit',
    endpoints: [
      { method: 'GET', path: '/api/audit', description: 'Audit log entries', hasBody: false },
      { method: 'POST', path: '/api/audit/verify', description: 'Verify audit chain integrity', hasBody: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  PUT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  PATCH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={`inline-block w-16 text-center rounded text-xs font-semibold px-2 py-0.5 ${METHOD_COLORS[method] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {method}
    </span>
  );
}

function statusColor(status: number): string {
  if (status < 300) return 'text-emerald-600 dark:text-emerald-400';
  if (status < 400) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
}

export default function ApiPlaygroundPage() {
  const [selected, setSelected] = useState<Endpoint>(ENDPOINT_GROUPS[0].endpoints[0]);
  const [resolvedPath, setResolvedPath] = useState(selected.path);
  const [authHeader, setAuthHeader] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectEndpoint = useCallback((ep: Endpoint) => {
    setSelected(ep);
    setResolvedPath(ep.path);
    setRequestBody('');
    setResponse(null);
    setError(null);
  }, []);

  const sendRequest = useCallback(async () => {
    setLoading(true);
    setResponse(null);
    setError(null);

    const start = performance.now();

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (authHeader.trim()) {
        // Detect whether user typed a full header value or just the token
        const trimmed = authHeader.trim();
        if (trimmed.toLowerCase().startsWith('bearer ')) {
          headers['Authorization'] = trimmed;
        } else {
          // Treat as API key
          headers['X-API-Key'] = trimmed;
        }
      }

      const init: RequestInit = {
        method: selected.method,
        headers,
        credentials: 'include', // send cookie session
      };

      if (selected.hasBody && requestBody.trim()) {
        headers['Content-Type'] = 'application/json';
        init.body = requestBody;
      }

      const res = await fetch(resolvedPath, init);
      const text = await res.text();
      const durationMs = Math.round(performance.now() - start);

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        resHeaders[k] = v;
      });

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: text,
        durationMs,
      });
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - start);
      setError(
        `Request failed after ${durationMs}ms: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoading(false);
    }
  }, [selected, resolvedPath, authHeader, requestBody]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">API Playground</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Test CVERiskPilot API endpoints directly from the browser. Your current session cookie is
          sent automatically, or supply an API key below.
        </p>
      </div>

      <div className="flex gap-6">
        {/* ----------------------------------------------------------------- */}
        {/* Left panel: endpoint selector */}
        {/* ----------------------------------------------------------------- */}
        <aside className="w-80 shrink-0">
          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Endpoints</h2>
            </div>
            <nav className="max-h-[calc(100vh-260px)] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {ENDPOINT_GROUPS.map((group) => (
                <div key={group.tag}>
                  <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/60">
                    {group.tag}
                  </div>
                  {group.endpoints.map((ep) => {
                    const isActive =
                      ep.method === selected.method && ep.path === selected.path;
                    return (
                      <button
                        key={`${ep.method}-${ep.path}`}
                        type="button"
                        onClick={() => selectEndpoint(ep)}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <MethodBadge method={ep.method} />
                        <span className="truncate font-mono text-xs">{ep.path}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* ----------------------------------------------------------------- */}
        {/* Right panel: request builder + response */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Request builder */}
          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {selected.description}
            </h2>

            {/* Method + URL */}
            <div className="flex items-center gap-3">
              <MethodBadge method={selected.method} />
              <input
                type="text"
                value={resolvedPath}
                onChange={(e) => setResolvedPath(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="/api/..."
              />
            </div>

            {/* Path hint */}
            {selected.path.includes(':') && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Replace path parameters (e.g. <code>:id</code>) with actual values before sending.
              </p>
            )}

            {/* Auth */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Auth token / API key
              </label>
              <input
                type="text"
                value={authHeader}
                onChange={(e) => setAuthHeader(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Paste API key or Bearer token (session cookie sent automatically)"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Leave blank to use your current session cookie. Prefix with &quot;Bearer &quot; for
                JWT, or paste a raw API key for X-API-Key header. Manage keys in{' '}
                <a
                  href="/settings?tab=api-keys"
                  className="text-indigo-600 dark:text-indigo-400 underline"
                >
                  Settings &rarr; API Keys
                </a>
                .
              </p>
            </div>

            {/* Request body */}
            {selected.hasBody && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Request body (JSON)
                </label>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  rows={8}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                  placeholder='{ "key": "value" }'
                />
              </div>
            )}

            {/* Send */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={sendRequest}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send Request'
                )}
              </button>

              {response && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {response.durationMs}ms
                </span>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-4">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Response */}
          {response && (
            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
              {/* Status bar */}
              <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Response
                </span>
                <span className={`text-sm font-bold ${statusColor(response.status)}`}>
                  {response.status} {response.statusText}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {response.durationMs}ms
                </span>
              </div>

              {/* Headers */}
              <details className="border-b border-gray-200 dark:border-gray-800">
                <summary className="px-5 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 select-none">
                  Headers ({Object.keys(response.headers).length})
                </summary>
                <div className="px-5 pb-3">
                  <table className="w-full text-xs font-mono">
                    <tbody>
                      {Object.entries(response.headers).map(([k, v]) => (
                        <tr key={k} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="py-1 pr-4 text-gray-500 dark:text-gray-400 whitespace-nowrap align-top">
                            {k}
                          </td>
                          <td className="py-1 text-gray-700 dark:text-gray-300 break-all">
                            {v}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>

              {/* Body */}
              <div className="p-5">
                <pre className="max-h-[500px] overflow-auto rounded-md bg-gray-50 dark:bg-gray-800 p-4 text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                  {formatJson(response.body)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
