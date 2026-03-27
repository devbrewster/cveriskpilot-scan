'use client';

import { useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PermanentFix {
  description: string;
  codeExample?: string;
  configChange?: string;
}

interface RemediationResult {
  riskAssessment: string;
  immediateActions: string[];
  permanentFix: PermanentFix;
  verificationSteps: string[];
  references: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  priority: 'immediate' | 'short-term' | 'long-term';
  raw: string;
  model: string;
  generatedAt: string;
}

interface CaseData {
  title: string;
  description?: string;
  cveIds: string[];
  cweIds: string[];
  severity: string;
  cvssScore: number | null;
  cvssVector: string | null;
  epssScore: number | null;
  epssPercentile: number | null;
  kevListed: boolean;
  kevDueDate: string | null;
}

interface AiRemediationProps {
  caseId: string;
  caseData: CaseData;
  existingAdvisory: RemediationResult | null;
}

// ---------------------------------------------------------------------------
// Mock data for development
// ---------------------------------------------------------------------------

function generateMockRemediation(caseData: CaseData): RemediationResult {
  const cveLabel =
    caseData.cveIds.length > 0 ? caseData.cveIds.join(', ') : 'this vulnerability';

  return {
    riskAssessment: `${caseData.severity} severity vulnerability (${cveLabel}) poses significant risk. ${
      caseData.kevListed
        ? 'This vulnerability is listed in CISA KEV, indicating active exploitation in the wild. '
        : ''
    }${
      caseData.cvssScore && caseData.cvssScore >= 9.0
        ? 'The CVSS score indicates maximum impact across confidentiality, integrity, and availability. '
        : ''
    }${
      caseData.epssScore && caseData.epssScore > 0.5
        ? `With an EPSS score of ${(caseData.epssScore * 100).toFixed(1)}%, there is a high probability of exploitation within the next 30 days. `
        : ''
    }Immediate remediation is strongly recommended.`,
    immediateActions: [
      'Apply vendor-provided security patches or upgrade to the latest stable version',
      'If patching is not immediately possible, implement recommended workarounds or mitigations',
      'Review access logs for indicators of compromise or exploitation attempts',
      'Restrict network access to affected systems where possible',
      'Enable enhanced monitoring and alerting on affected assets',
    ],
    permanentFix: {
      description:
        'Upgrade the affected component to the latest patched version. Ensure all instances across the environment are updated consistently.',
      codeExample:
        caseData.cveIds.includes('CVE-2021-44228')
          ? '# For Log4j (CVE-2021-44228):\n# Upgrade to Log4j 2.17.1+\nmvn versions:use-latest-versions -Dincludes=org.apache.logging.log4j\n\n# Or set mitigation flag:\n-Dlog4j2.formatMsgNoLookups=true'
          : undefined,
      configChange:
        'Review and harden the configuration of affected services. Disable unnecessary features that expand the attack surface.',
    },
    verificationSteps: [
      'Run a vulnerability scan to confirm the issue is resolved',
      'Verify the patched version is deployed across all affected assets',
      'Check application logs to ensure normal operation after patching',
      'Confirm no regression in functionality after the fix',
    ],
    references: [
      ...(caseData.cveIds.length > 0
        ? caseData.cveIds.map(
            (cve) => `https://nvd.nist.gov/vuln/detail/${cve}`,
          )
        : []),
      'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
    ],
    estimatedEffort:
      caseData.severity === 'CRITICAL' || caseData.severity === 'HIGH'
        ? 'medium'
        : 'low',
    priority:
      caseData.kevListed || caseData.severity === 'CRITICAL'
        ? 'immediate'
        : caseData.severity === 'HIGH'
          ? 'short-term'
          : 'long-term',
    raw: '(mock response)',
    model: 'claude-sonnet-4-20250514 (simulated)',
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
      />
    </svg>
  );
}

function EffortPill({ effort }: { effort: string }) {
  const colors: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[effort] ?? 'bg-gray-100 text-gray-800'}`}
    >
      Effort: {effort}
    </span>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    immediate: 'bg-red-100 text-red-800',
    'short-term': 'bg-yellow-100 text-yellow-800',
    'long-term': 'bg-blue-100 text-blue-800',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[priority] ?? 'bg-gray-100 text-gray-800'}`}
    >
      Priority: {priority}
    </span>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
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
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AiRemediation({
  caseId,
  caseData,
  existingAdvisory,
}: AiRemediationProps) {
  const [result, setResult] = useState<RemediationResult | null>(existingAdvisory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchRemediation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call with 3-second delay (replace with real call later)
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const mockResult = generateMockRemediation(caseData);

      // When the API is live, use this instead:
      // const res = await fetch('/api/ai/remediation', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ caseId, caseData }),
      // });
      // if (!res.ok) {
      //   const err = await res.json();
      //   throw new Error(err.error ?? `Request failed (${res.status})`);
      // }
      // const mockResult = await res.json();

      setResult(mockResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate remediation');
    } finally {
      setLoading(false);
    }
  }, [caseData]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!result) return;

    const text = [
      `Risk Assessment: ${result.riskAssessment}`,
      '',
      'Immediate Actions:',
      ...result.immediateActions.map((a, i) => `  ${i + 1}. ${a}`),
      '',
      `Permanent Fix: ${result.permanentFix.description}`,
      ...(result.permanentFix.codeExample
        ? ['', 'Code Example:', result.permanentFix.codeExample]
        : []),
      ...(result.permanentFix.configChange
        ? ['', 'Config Change:', result.permanentFix.configChange]
        : []),
      '',
      'Verification Steps:',
      ...result.verificationSteps.map((s, i) => `  ${i + 1}. ${s}`),
      '',
      'References:',
      ...result.references.map((r) => `  - ${r}`),
      '',
      `Estimated Effort: ${result.estimatedEffort}`,
      `Priority: ${result.priority}`,
      `Generated by: ${result.model}`,
      `Generated at: ${new Date(result.generatedAt).toLocaleString()}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      console.warn('Clipboard API not available');
    }
  }, [result]);

  // --- No result yet: show CTA button ---
  if (!result && !loading && !error) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 p-6 text-center">
        <SparkleIcon className="mx-auto h-10 w-10 text-purple-400" />
        <p className="mt-2 text-sm text-gray-500">
          No AI advisory available yet.
        </p>
        <button
          type="button"
          onClick={fetchRemediation}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          <SparkleIcon className="h-4 w-4" />
          Get AI Remediation
        </button>
      </div>
    );
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="rounded-md border border-purple-200 bg-purple-50 p-6 text-center">
        <div className="flex items-center justify-center gap-3">
          <Spinner />
          <span className="text-sm font-medium text-purple-700">
            Analyzing vulnerability...
          </span>
        </div>
        <p className="mt-2 text-xs text-purple-500">
          Claude is generating remediation guidance
        </p>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-800">
          Failed to generate remediation
        </p>
        <p className="mt-1 text-xs text-red-600">{error}</p>
        <button
          type="button"
          onClick={fetchRemediation}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // --- Result display ---
  if (!result) return null;

  return (
    <div className="space-y-4">
      {/* Metadata bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
          <SparkleIcon className="mr-1 h-3 w-3" />
          Generated by Claude
        </span>
        <span className="text-xs text-gray-500">
          {new Date(result.generatedAt).toLocaleString()}
        </span>
        <EffortPill effort={result.estimatedEffort} />
        <PriorityPill priority={result.priority} />
      </div>

      {/* Risk Assessment */}
      <div className="rounded-md border border-purple-200 bg-purple-50 p-4">
        <h4 className="text-sm font-semibold text-purple-900">
          Risk Assessment
        </h4>
        <p className="mt-1 text-sm text-purple-800">{result.riskAssessment}</p>
      </div>

      {/* Immediate Actions */}
      {result.immediateActions.length > 0 && (
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-gray-900">
            Immediate Actions
          </h4>
          <ol className="mt-2 list-inside list-decimal space-y-1.5">
            {result.immediateActions.map((action, idx) => (
              <li key={idx} className="text-sm text-gray-700">
                {action}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Permanent Fix */}
      <div className="rounded-md border border-gray-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-gray-900">Permanent Fix</h4>
        <p className="mt-1 text-sm text-gray-700">
          {result.permanentFix.description}
        </p>
        {result.permanentFix.codeExample && (
          <pre className="mt-3 overflow-x-auto rounded-md bg-gray-900 p-3 text-xs text-green-400">
            <code>{result.permanentFix.codeExample}</code>
          </pre>
        )}
        {result.permanentFix.configChange && (
          <div className="mt-3 rounded-md bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-800">
              Configuration Change
            </p>
            <p className="mt-1 text-xs text-amber-700">
              {result.permanentFix.configChange}
            </p>
          </div>
        )}
      </div>

      {/* Verification Steps */}
      {result.verificationSteps.length > 0 && (
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-gray-900">
            Verification Steps
          </h4>
          <ol className="mt-2 list-inside list-decimal space-y-1.5">
            {result.verificationSteps.map((step, idx) => (
              <li key={idx} className="text-sm text-gray-700">
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* References */}
      {result.references.length > 0 && (
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-gray-900">References</h4>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {result.references.map((ref, idx) => (
              <li key={idx}>
                <a
                  href={ref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 underline hover:text-blue-800"
                >
                  {ref}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={fetchRemediation}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-purple-300 bg-white px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-50"
        >
          <SparkleIcon className="h-4 w-4" />
          Regenerate
        </button>
        <button
          type="button"
          onClick={handleCopyToClipboard}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
      </div>
    </div>
  );
}
