'use client';

import { useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CaseOption {
  id: string;
  title: string;
  severity: string;
  status: string;
  cveIds: string[];
}

interface BulkItemResult {
  caseId: string;
  success: boolean;
  jiraKey?: string;
  jiraUrl?: string;
  error?: string;
}

interface BulkResponse {
  total: number;
  succeeded: number;
  failed: number;
  results: BulkItemResult[];
}

interface JiraBulkCreateProps {
  cases: CaseOption[];
  organizationId: string;
  defaultProjectKey?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800';
    case 'LOW':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JiraBulkCreate({
  cases,
  organizationId,
  defaultProjectKey = '',
}: JiraBulkCreateProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [projectKey, setProjectKey] = useState(defaultProjectKey);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<BulkResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === cases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cases.map((c) => c.id)));
    }
  }, [cases, selectedIds.size]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!projectKey.trim()) {
      setError('Please enter a Jira project key');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/integrations/jira/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseIds: Array.from(selectedIds),
          projectKey: projectKey.trim(),
          organizationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Unknown error');
        return;
      }

      setResponse(data as BulkResponse);
      // Clear selection for successfully created tickets
      const succeededIds = new Set(
        (data as BulkResponse).results
          .filter((r: BulkItemResult) => r.success)
          .map((r: BulkItemResult) => r.caseId),
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of succeededIds) {
          next.delete(id);
        }
        return next;
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedIds, projectKey, organizationId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label
            htmlFor="jira-project-key"
            className="block text-sm font-medium text-gray-700"
          >
            Jira Project Key
          </label>
          <input
            id="jira-project-key"
            type="text"
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
            placeholder="e.g. VULN"
            className="mt-1 w-40 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          type="button"
          disabled={isSubmitting || selectedIds.size === 0}
          onClick={handleSubmit}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? 'Creating...'
            : `Create Tickets (${selectedIds.size})`}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results summary */}
      {response && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Created {response.succeeded} of {response.total} tickets.
          {response.failed > 0 && (
            <span className="ml-1 text-red-700">
              {response.failed} failed.
            </span>
          )}
        </div>
      )}

      {/* Cases table */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === cases.length && cases.length > 0}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Severity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                CVEs
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Result
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {cases.map((c) => {
              const resultItem = response?.results.find(
                (r) => r.caseId === c.id,
              );
              return (
                <tr
                  key={c.id}
                  className={selectedIds.has(c.id) ? 'bg-blue-50' : ''}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleOne(c.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm font-medium text-gray-900">
                    {c.title}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${severityColor(c.severity)}`}
                    >
                      {c.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.status.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {c.cveIds.slice(0, 3).join(', ')}
                    {c.cveIds.length > 3 && ` +${c.cveIds.length - 3}`}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {resultItem ? (
                      resultItem.success ? (
                        <a
                          href={resultItem.jiraUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {resultItem.jiraKey}
                        </a>
                      ) : (
                        <span className="text-red-600" title={resultItem.error}>
                          Failed
                        </span>
                      )
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {cases.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  No cases available for ticket creation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
