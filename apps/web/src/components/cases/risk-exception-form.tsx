'use client';

import { useState, useEffect, useCallback } from 'react';

interface RiskException {
  id: string;
  type: string;
  reason: string;
  vexRationale: string | null;
  expiresAt: string | null;
  evidence: Record<string, unknown> | null;
  createdAt: string;
  derivedStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  decidedBy: { id: string; name: string; email: string };
  approvedBy: { id: string; name: string; email: string } | null;
}

interface RiskExceptionFormProps {
  caseId: string;
  caseSeverity: string;
  organizationId: string;
  /** Current user ID for submitting requests */
  currentUserId: string;
  /** Current user role for showing approve/reject actions */
  currentUserRole: string;
  onExceptionChange?: () => void;
}

const EXCEPTION_TYPES = [
  { value: 'ACCEPTED_RISK', label: 'Accepted Risk', description: 'Risk acknowledged and accepted' },
  { value: 'FALSE_POSITIVE', label: 'False Positive', description: 'Finding is not a real vulnerability' },
  { value: 'NOT_APPLICABLE', label: 'Not Applicable', description: 'Vulnerability does not apply to this context' },
] as const;

const DURATION_OPTIONS = [
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '180 days' },
  { value: 0, label: 'Custom' },
] as const;

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-800' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800' },
  EXPIRED: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      {status}
    </span>
  );
}

export function RiskExceptionForm({
  caseId,
  caseSeverity,
  organizationId,
  currentUserId,
  currentUserRole,
  onExceptionChange,
}: RiskExceptionFormProps) {
  const [exceptions, setExceptions] = useState<RiskException[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState<string>('ACCEPTED_RISK');
  const [reason, setReason] = useState('');
  const [vexRationale, setVexRationale] = useState('');
  const [durationOption, setDurationOption] = useState(90);
  const [customDays, setCustomDays] = useState(90);

  const isAdmin = ['ORG_OWNER', 'SECURITY_ADMIN', 'PLATFORM_ADMIN'].includes(currentUserRole);
  const requestedDays = durationOption === 0 ? customDays : durationOption;

  const fetchExceptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/exceptions?organizationId=${organizationId}&vulnerabilityCaseId=${caseId}`,
      );
      if (!res.ok) throw new Error('Failed to load exceptions');
      const data = await res.json();
      // Filter to only this case's exceptions (API returns org-wide, but we want case-specific)
      const caseExceptions = data.exceptions.filter(
        (ex: RiskException & { vulnerabilityCase: { id: string } }) =>
          ex.vulnerabilityCase?.id === caseId,
      );
      setExceptions(caseExceptions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exceptions');
    } finally {
      setLoading(false);
    }
  }, [organizationId, caseId]);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vulnerabilityCaseId: caseId,
          type,
          reason,
          vexRationale: vexRationale || undefined,
          requestedDays,
          decidedById: currentUserId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to submit exception');
      }

      setShowForm(false);
      setReason('');
      setVexRationale('');
      await fetchExceptions();
      onExceptionChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (exceptionId: string, action: 'approve' | 'reject') => {
    setError(null);
    try {
      const res = await fetch(`/api/exceptions/${exceptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          approvedById: currentUserId,
          durationDays: action === 'approve' ? requestedDays : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `Failed to ${action} exception`);
      }

      await fetchExceptions();
      onExceptionChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`);
    }
  };

  const activeException = exceptions.find(
    (ex) => ex.derivedStatus === 'PENDING' || ex.derivedStatus === 'APPROVED',
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Risk Exceptions</h3>
        {!showForm && !activeException && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Request Exception
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-2">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Active exception display */}
      {activeException && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusBadge status={activeException.derivedStatus} />
              <span className="text-xs text-gray-500">
                {EXCEPTION_TYPES.find((t) => t.value === activeException.type)?.label ??
                  activeException.type}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(activeException.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-700">{activeException.reason}</p>
            {activeException.vexRationale && (
              <p className="mt-1 text-xs text-gray-500">
                VEX: {activeException.vexRationale}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>Requested by: {activeException.decidedBy.name}</span>
            {activeException.approvedBy && (
              <span>Approved by: {activeException.approvedBy.name}</span>
            )}
            {activeException.expiresAt && (
              <span>
                Expires: {new Date(activeException.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Admin actions for pending exceptions */}
          {activeException.derivedStatus === 'PENDING' && isAdmin && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => handleAction(activeException.id, 'approve')}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleAction(activeException.id, 'reject')}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}

      {/* Request form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-md border border-gray-200 bg-white dark:bg-gray-900 p-4 space-y-4"
        >
          <div>
            <label htmlFor="exception-type" className="block text-sm font-medium text-gray-700">
              Exception Type
            </label>
            <select
              id="exception-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {EXCEPTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} - {t.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="exception-reason" className="block text-sm font-medium text-gray-700">
              Justification
            </label>
            <textarea
              id="exception-reason"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder={`Why should this ${caseSeverity.toLowerCase()} severity finding be excepted?`}
            />
          </div>

          <div>
            <label htmlFor="exception-vex" className="block text-sm font-medium text-gray-700">
              VEX Rationale (optional)
            </label>
            <input
              id="exception-vex"
              type="text"
              value={vexRationale}
              onChange={(e) => setVexRationale(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="e.g., component_not_present, inline_mitigations_already_exist"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Requested Duration</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDurationOption(opt.value)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    durationOption === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 bg-white dark:bg-gray-900 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {durationOption === 0 && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value, 10) || 1)}
                  className="w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-500">days</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Exception Request'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setReason('');
                setVexRationale('');
              }}
              className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Previous exceptions (non-active) */}
      {exceptions.filter((ex) => ex.id !== activeException?.id).length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
            Previous Exceptions
          </p>
          <div className="space-y-2">
            {exceptions
              .filter((ex) => ex.id !== activeException?.id)
              .map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={ex.derivedStatus} />
                    <span className="text-xs text-gray-600 truncate max-w-xs">
                      {ex.reason}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(ex.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {loading && exceptions.length === 0 && (
        <p className="text-xs text-gray-400">Loading exceptions...</p>
      )}
    </div>
  );
}
