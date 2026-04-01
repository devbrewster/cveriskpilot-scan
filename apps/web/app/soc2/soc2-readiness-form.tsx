"use client";

import { useState, useCallback, useRef } from "react";

interface AnalysisResult {
  email: string;
  totalFindings: number;
  severityBreakdown: Record<string, number>;
  affectedCriteria: Array<{
    controlId: string;
    controlTitle: string;
    category: string;
    affectedBy: string[];
    highestSeverity: string;
  }>;
  totalCriteriaAssessed: number;
  totalCriteriaAffected: number;
  gapPercentage: number;
  remediationPriorities: Array<{
    priority: number;
    controlId: string;
    controlTitle: string;
    severity: string;
    findingCount: number;
    recommendation: string;
  }>;
}

export function Soc2ReadinessForm() {
  const [email, setEmail] = useState("");
  const [scanData, setScanData] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleAnalyze = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setResult(null);
      setLoading(true);

      try {
        const res = await fetch("/api/soc2-readiness", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, scanData }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error || `Analysis failed (${res.status})`
          );
        }

        const data: AnalysisResult = await res.json();
        setResult(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    },
    [email, scanData]
  );

  const handleDownloadPdf = useCallback(async () => {
    if (!result) return;
    setPdfLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/soc2-readiness/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `PDF generation failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "soc2-readiness-report.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "PDF download failed"
      );
    } finally {
      setPdfLoading(false);
    }
  }, [result]);

  const severityColor = (sev: string) => {
    switch (sev.toUpperCase()) {
      case "CRITICAL":
        return "text-red-400";
      case "HIGH":
        return "text-orange-400";
      case "MEDIUM":
        return "text-yellow-400";
      case "LOW":
        return "text-green-400";
      default:
        return "text-blue-400";
    }
  };

  return (
    <div>
      {/* Analysis Form */}
      {!result && (
        <form
          ref={formRef}
          onSubmit={handleAnalyze}
          className="space-y-6"
        >
          {/* Email */}
          <div>
            <label
              htmlFor="soc2-email"
              className="block text-sm font-medium text-gray-300"
            >
              Work email <span className="text-red-400">*</span>
            </label>
            <input
              id="soc2-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="mt-2 block w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              We will send your PDF report to this address.
            </p>
          </div>

          {/* Scan Data */}
          <div>
            <label
              htmlFor="soc2-scan-data"
              className="block text-sm font-medium text-gray-300"
            >
              Scan data (JSON) <span className="text-red-400">*</span>
            </label>
            <textarea
              id="soc2-scan-data"
              required
              rows={12}
              value={scanData}
              onChange={(e) => setScanData(e.target.value)}
              placeholder={`Paste JSON scan output here. Accepted formats:\n\n1. CVERiskPilot CLI output (npx @cveriskpilot/scan)\n2. Array of findings: [{"title":"...","severity":"HIGH","cweIds":["CWE-79"],...}]\n3. ParseResult format: {"findings":[...],"format":"...","metadata":{...}}`}
              className="mt-2 block w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 font-mono text-sm text-white placeholder-gray-500 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Run{" "}
              <code className="rounded bg-gray-800 px-1.5 py-0.5 text-primary-400">
                npx @cveriskpilot/scan --output json
              </code>{" "}
              to generate compatible scan data.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-500 hover:shadow-xl hover:shadow-primary-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-5 w-5 animate-spin"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Analyzing...
              </span>
            ) : (
              "Analyze My SOC 2 Readiness"
            )}
          </button>
        </form>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {result.totalFindings}
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Total Findings
              </div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
              <div className="text-2xl font-bold text-red-400">
                {result.totalCriteriaAffected}
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Criteria Affected
              </div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {result.totalCriteriaAssessed - result.totalCriteriaAffected}
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Criteria Clean
              </div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {result.gapPercentage}%
              </div>
              <div className="mt-1 text-xs text-gray-400">Gap Rate</div>
            </div>
          </div>

          {/* Severity Breakdown */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">
              Severity Breakdown
            </h3>
            <div className="flex flex-wrap gap-4">
              {Object.entries(result.severityBreakdown).map(
                ([sev, count]) => (
                  <div
                    key={sev}
                    className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-950 px-4 py-2"
                  >
                    <span
                      className={`text-sm font-bold ${severityColor(sev)}`}
                    >
                      {sev}
                    </span>
                    <span className="text-sm text-gray-400">{count}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Affected Criteria */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">
              Affected Trust Service Criteria
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="pb-3 pr-4 font-medium">Control</th>
                    <th className="pb-3 pr-4 font-medium">Title</th>
                    <th className="pb-3 pr-4 font-medium">Category</th>
                    <th className="pb-3 pr-4 font-medium">Severity</th>
                    <th className="pb-3 font-medium">CWEs</th>
                  </tr>
                </thead>
                <tbody>
                  {result.affectedCriteria.slice(0, 20).map((c) => (
                    <tr
                      key={c.controlId}
                      className="border-b border-gray-800/50"
                    >
                      <td className="py-2.5 pr-4 font-mono text-primary-400">
                        {c.controlId}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-300">
                        {c.controlTitle}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500">
                        {c.category}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`text-xs font-bold ${severityColor(c.highestSeverity)}`}
                        >
                          {c.highestSeverity}
                        </span>
                      </td>
                      <td className="py-2.5 text-xs text-gray-500">
                        {c.affectedBy.slice(0, 3).join(", ")}
                        {c.affectedBy.length > 3 &&
                          ` +${c.affectedBy.length - 3}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.affectedCriteria.length > 20 && (
                <p className="mt-3 text-sm text-gray-500">
                  ...and {result.affectedCriteria.length - 20} more
                  criteria. Download the PDF for the full report.
                </p>
              )}
            </div>
          </div>

          {/* Remediation Priorities */}
          {result.remediationPriorities.length > 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">
                Top Remediation Priorities
              </h3>
              <div className="space-y-3">
                {result.remediationPriorities.slice(0, 5).map((p) => (
                  <div
                    key={p.controlId}
                    className="flex items-start gap-4 rounded-lg border border-gray-800 bg-gray-950 p-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
                      {p.priority}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-primary-400">
                          {p.controlId}
                        </span>
                        <span
                          className={`text-xs font-bold ${severityColor(p.severity)}`}
                        >
                          {p.severity}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({p.findingCount} findings)
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-400">
                        {p.recommendation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="flex-1 rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-500 hover:shadow-xl hover:shadow-primary-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pdfLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-5 w-5 animate-spin"
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating PDF...
                </span>
              ) : (
                "Download PDF Report"
              )}
            </button>
            <button
              onClick={() => {
                setResult(null);
                setError(null);
              }}
              className="flex-1 rounded-xl border border-gray-700 px-8 py-4 text-base font-semibold text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-800"
            >
              Analyze Another Scan
            </button>
          </div>

          {/* Upsell */}
          <div className="rounded-xl border border-primary-800 bg-primary-900/20 p-6 text-center">
            <h3 className="text-lg font-semibold text-white">
              Want to track remediation progress?
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              CVERiskPilot Pro gives you AI-powered triage, team workflows,
              POAM generation, and real-time compliance scores across 13
              frameworks.
            </p>
            <a
              href="/pricing?ref=soc2-report"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary-600/20 transition-all hover:bg-primary-500"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
