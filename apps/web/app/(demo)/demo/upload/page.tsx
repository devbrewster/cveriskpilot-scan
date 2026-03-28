'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { demoRecentScans } from '@/lib/demo-data';
import type { ParserFormat } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Stage =
  | 'idle'
  | 'uploading'
  | 'detecting'
  | 'parsing'
  | 'enriching'
  | 'building'
  | 'complete';

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

function detectFormat(filename: string): ParserFormat {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.nessus')) return 'NESSUS';
  if (lower.endsWith('.sarif') || lower.endsWith('.sarif.json')) return 'SARIF';
  if (lower.endsWith('.cdx.json')) return 'CYCLONEDX';
  if (lower.endsWith('.xml')) return 'QUALYS';
  if (lower.endsWith('.csv')) return 'CSV';
  if (lower.endsWith('.spdx') || lower.endsWith('.spdx.json')) return 'SPDX';
  if (lower.endsWith('.osv.json')) return 'OSV';
  if (lower.endsWith('.csaf.json')) return 'CSAF';
  if (lower.endsWith('.json')) return 'JSON_FORMAT';
  return 'NESSUS';
}

// ---------------------------------------------------------------------------
// Format badge colors
// ---------------------------------------------------------------------------

const formatColors: Record<string, string> = {
  NESSUS: 'bg-green-100 text-green-700',
  SARIF: 'bg-blue-100 text-blue-700',
  CYCLONEDX: 'bg-purple-100 text-purple-700',
  QUALYS: 'bg-orange-100 text-orange-700',
  OPENVAS: 'bg-teal-100 text-teal-700',
  CSV: 'bg-gray-100 text-gray-700',
  JSON_FORMAT: 'bg-gray-100 text-gray-700',
  OSV: 'bg-indigo-100 text-indigo-700',
  SPDX: 'bg-cyan-100 text-cyan-700',
  CSAF: 'bg-rose-100 text-rose-700',
  XLSX: 'bg-emerald-100 text-emerald-700',
};

function FormatBadge({ format }: { format: string }) {
  const label = format === 'JSON_FORMAT' ? 'JSON' : format;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${formatColors[format] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

// ---------------------------------------------------------------------------
// Pipeline steps configuration
// ---------------------------------------------------------------------------

const TOTAL_FINDINGS = 142;
const TOTAL_CASES = 18;
const TOTAL_KEV = 3;

interface PipelineStep {
  stage: Stage;
  label: string;
  durationMs: number;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { stage: 'uploading', label: 'Uploading file...', durationMs: 1500 },
  { stage: 'detecting', label: 'Detecting format...', durationMs: 800 },
  { stage: 'parsing', label: 'Parsing findings...', durationMs: 2000 },
  { stage: 'enriching', label: 'Enriching with EPSS & KEV data...', durationMs: 1500 },
  { stage: 'building', label: 'Building vulnerability cases...', durationMs: 1000 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DemoUploadPage() {
  const [stage, setStage] = useState<Stage>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [filename, setFilename] = useState('');
  const [detectedFormat, setDetectedFormat] = useState<ParserFormat>('NESSUS');
  const [findingsCount, setFindingsCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset counter when stage leaves parsing
  useEffect(() => {
    if (stage !== 'parsing') return;

    let count = 0;
    const step = Math.ceil(TOTAL_FINDINGS / 40); // ~40 increments over 2s
    const interval = setInterval(() => {
      count = Math.min(count + step, TOTAL_FINDINGS);
      setFindingsCount(count);
      if (count >= TOTAL_FINDINGS) clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);
  }, [stage]);

  // Progress bar for upload step
  useEffect(() => {
    if (stage !== 'uploading') return;

    let pct = 0;
    const interval = setInterval(() => {
      pct = Math.min(pct + 3, 95);
      setProgress(pct);
      if (pct >= 95) clearInterval(interval);
    }, 40);

    return () => clearInterval(interval);
  }, [stage]);

  const runPipeline = useCallback(
    (file: string) => {
      setFilename(file);
      setDetectedFormat(detectFormat(file));
      setFindingsCount(0);
      setProgress(0);

      let delay = 0;
      for (const step of PIPELINE_STEPS) {
        const s = step.stage;
        setTimeout(() => setStage(s), delay);

        // Set format after detecting completes
        if (s === 'detecting') {
          setTimeout(() => setDetectedFormat(detectFormat(file)), delay + step.durationMs - 200);
        }

        delay += step.durationMs;
      }

      // Complete
      setTimeout(() => {
        setProgress(100);
        setStage('complete');
      }, delay);
    },
    [],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      runPipeline(files[0].name);
    },
    [runPipeline],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const reset = useCallback(() => {
    setStage('idle');
    setFilename('');
    setFindingsCount(0);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Which pipeline step index is active?
  const activeStepIdx = PIPELINE_STEPS.findIndex((s) => s.stage === stage);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Scan</h1>
        <p className="mt-1 text-sm text-gray-500">
          Import vulnerability scan results for parsing, enrichment, and case creation &mdash; Demo
          Mode
        </p>
      </div>

      {/* Demo mode banner */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
        <svg
          className="h-4 w-4 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 14.5M14.25 3.104c.251.023.501.05.75.082M19.8 14.5l-2.147 2.146a2.25 2.25 0 01-1.591.659H7.938a2.25 2.25 0 01-1.591-.659L4.2 14.5m15.6 0l.147-.146a2.25 2.25 0 000-3.182l-.31-.31"
          />
        </svg>
        <span className="text-sm font-medium text-amber-800">
          Demo Mode &mdash; files are not actually uploaded. This simulates the ingestion pipeline.
        </span>
      </div>

      {/* Upload zone / Pipeline / Complete */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {/* ---- IDLE STATE ---- */}
        {stage === 'idle' && (
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-16 transition-colors ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-blue-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
            }`}
          >
            {/* Upload icon */}
            <svg
              className="mb-4 h-12 w-12 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>

            <p className="mb-1 text-lg font-semibold text-gray-700">Drop scan files here</p>
            <p className="mb-4 text-sm text-gray-500">or click below to browse</p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Select File
            </button>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".nessus,.sarif,.json,.xml,.csv,.cdx.json,.spdx,.osv,.csaf,.xlsx"
              onChange={(e) => handleFiles(e.target.files)}
            />

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {[
                'Nessus',
                'SARIF',
                'CycloneDX',
                'Qualys',
                'OpenVAS',
                'CSV',
                'JSON',
                'OSV',
                'SPDX',
                'CSAF',
                'XLSX',
              ].map((fmt) => (
                <span
                  key={fmt}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ---- PROCESSING STATE ---- */}
        {stage !== 'idle' && stage !== 'complete' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              {/* Spinner */}
              <svg
                className="h-5 w-5 animate-spin text-blue-600"
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
              <span className="text-sm font-medium text-gray-700">
                Processing <span className="font-semibold text-gray-900">{filename}</span>
              </span>
            </div>

            {/* Pipeline steps */}
            <div className="space-y-3">
              {PIPELINE_STEPS.map((step, idx) => {
                const isActive = idx === activeStepIdx;
                const isComplete = activeStepIdx > idx;

                return (
                  <div key={step.stage} className="flex items-center gap-3">
                    {/* Step indicator */}
                    {isComplete ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                        <svg
                          className="h-4 w-4 text-green-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    ) : isActive ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-600" />
                      </div>
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
                        <div className="h-2 w-2 rounded-full bg-gray-300" />
                      </div>
                    )}

                    {/* Label */}
                    <span
                      className={`text-sm ${
                        isActive
                          ? 'font-medium text-gray-900'
                          : isComplete
                            ? 'text-gray-500'
                            : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>

                    {/* Inline details */}
                    {step.stage === 'uploading' && isActive && (
                      <div className="ml-auto flex w-40 items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-100"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{progress}%</span>
                      </div>
                    )}

                    {step.stage === 'detecting' && (isActive || isComplete) && (
                      <div className="ml-2">
                        <FormatBadge format={detectedFormat} />
                      </div>
                    )}

                    {step.stage === 'parsing' && isActive && (
                      <span className="ml-2 text-sm font-semibold text-blue-600">
                        {findingsCount} / {TOTAL_FINDINGS}
                      </span>
                    )}

                    {step.stage === 'parsing' && isComplete && (
                      <span className="ml-2 text-sm text-gray-500">
                        {TOTAL_FINDINGS} findings
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---- COMPLETE STATE ---- */}
        {stage === 'complete' && (
          <div className="space-y-6">
            {/* Success header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">Processing Complete</p>
                <p className="text-sm text-gray-500">All pipeline stages finished successfully</p>
              </div>
            </div>

            {/* Summary card */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">{filename}</span>
                <FormatBadge format={detectedFormat} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{TOTAL_FINDINGS}</p>
                  <p className="text-xs font-medium text-gray-500">Findings Parsed</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{TOTAL_CASES}</p>
                  <p className="text-xs font-medium text-gray-500">Cases Created</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{TOTAL_KEV}</p>
                  <p className="text-xs font-medium text-red-600">KEV Flagged</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link
                href="/demo/findings"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                View Findings
              </Link>
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Upload Another
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload History */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Upload History</h2>
          <p className="mt-0.5 text-sm text-gray-500">Recent scan imports and processing results</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Filename
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Format
                </th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Findings
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Cases
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Uploaded
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {demoRecentScans.map((scan) => (
                <tr key={scan.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                    {scan.filename}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <FormatBadge format={scan.parserFormat} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                      COMPLETED
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-gray-700">
                    {scan.totalFindings}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-gray-700">
                    {scan.casesCreated}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-gray-500">
                    {relativeTime(scan.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
