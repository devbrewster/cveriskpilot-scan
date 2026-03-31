'use client';

import { useState, useCallback } from 'react';

interface TriageResult {
  recommendedAction: string;
  severityOverride: string | null;
  priority: string;
  reasoning: string;
  confidenceScore: number;
  requiresHumanReview: boolean;
  model: string;
  triagedAt: string;
  feedbackEnriched: boolean;
  feedbackStats: { totalReviews: number; accuracy: number };
}

interface AiTriagePanelProps {
  caseId: string;
  currentSeverity: string;
  existingVerdict?: string | null;
  existingConfidence?: number | null;
  existingModel?: string | null;
  existingTriageAt?: string | null;
}

function ConfidenceMeter({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = pct >= 80 ? 'text-green-700 dark:text-green-400' : pct >= 60 ? 'text-yellow-700 dark:text-yellow-400' : 'text-red-700 dark:text-red-400';
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-sm font-semibold ${textColor}`}>{pct}%</span>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const colors: Record<string, string> = {
    TRUE_POSITIVE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    FALSE_POSITIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    NEEDS_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    REMEDIATE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    ACCEPT_RISK: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    DEFER: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };
  const colorClass = colors[verdict] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colorClass}`}>
      {verdict.replace(/_/g, ' ')}
    </span>
  );
}

export function AiTriagePanel({ caseId, currentSeverity, existingVerdict, existingConfidence, existingModel, existingTriageAt }: AiTriagePanelProps) {
  const [result, setResult] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const runTriage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 402) {
          setError(`${data.error}. Upgrade to ${data.upgradeRequired} at ${data.upgradeUrl}`);
        } else {
          setError(data.error || 'Triage failed');
        }
        return;
      }
      const data = await res.json();
      setResult(data);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const sendFeedback = useCallback(async (outcome: string, correctedVerdict?: string) => {
    setFeedbackLoading(true);
    try {
      const body: Record<string, unknown> = {
        outcome,
        originalSeverity: currentSeverity,
        originalVerdict: result?.recommendedAction ?? existingVerdict,
      };
      if (correctedVerdict) body.correctedVerdict = correctedVerdict;

      await fetch(`/api/cases/${caseId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setFeedbackSent(true);
    } catch {
      // best effort
    } finally {
      setFeedbackLoading(false);
    }
  }, [caseId, currentSeverity, result, existingVerdict]);

  const displayVerdict = result?.recommendedAction ?? existingVerdict;
  const displayConfidence = result?.confidenceScore ?? existingConfidence;
  const displayModel = result?.model ?? existingModel;
  const displayTriageAt = result?.triagedAt ?? existingTriageAt;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Triage</h2>
        <button
          type="button"
          onClick={runTriage}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </>
          ) : displayVerdict ? (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-triage
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Run AI Triage
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {displayVerdict && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Verdict</p>
              <div className="mt-1">
                <VerdictBadge verdict={displayVerdict} />
              </div>
            </div>
            {displayConfidence != null && (
              <div>
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Confidence</p>
                <div className="mt-1">
                  <ConfidenceMeter score={displayConfidence} />
                </div>
              </div>
            )}
          </div>

          {result?.severityOverride && result.severityOverride !== currentSeverity && (
            <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
              <p className="text-sm text-amber-800 dark:text-amber-400">
                AI suggests severity override: <strong>{currentSeverity}</strong> → <strong>{result.severityOverride}</strong>
              </p>
            </div>
          )}

          {result?.reasoning && (
            <div>
              <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Reasoning</p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{result.reasoning}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-gray-400 dark:text-gray-500">
            {displayModel && <span>Model: {displayModel}</span>}
            {displayTriageAt && <span>Triaged: {new Date(displayTriageAt).toLocaleString()}</span>}
            {result?.feedbackEnriched && (
              <span className="text-purple-600 dark:text-purple-400">
                Enriched by {result.feedbackStats.totalReviews} org reviews ({Math.round(result.feedbackStats.accuracy * 100)}% accuracy)
              </span>
            )}
          </div>

          {/* Feedback buttons */}
          {!feedbackSent && (
            <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
              <p className="mb-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Was this helpful?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => sendFeedback('APPROVED')}
                  disabled={feedbackLoading}
                  className="inline-flex items-center gap-1 rounded-md border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Agree
                </button>
                <button
                  type="button"
                  onClick={() => sendFeedback('REJECTED')}
                  disabled={feedbackLoading}
                  className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Disagree
                </button>
              </div>
            </div>
          )}
          {feedbackSent && (
            <p className="text-xs text-green-600 dark:text-green-400">Feedback recorded. Thank you!</p>
          )}
        </div>
      )}

      {!displayVerdict && !loading && !error && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          No triage data yet. Click &ldquo;Run AI Triage&rdquo; to analyze this vulnerability.
        </p>
      )}
    </div>
  );
}
