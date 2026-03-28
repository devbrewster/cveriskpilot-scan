'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  demoCWEMappings,
  demoPipelineFindings,
  demoPipelinePOAMs,
} from '@/lib/demo-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Stage = 'idle' | 'upload' | 'parse' | 'map' | 'policy' | 'poam' | 'complete';

interface StepConfig {
  stage: Stage;
  label: string;
  durationMs: number;
  description: string;
}

const STEPS: StepConfig[] = [
  { stage: 'upload', label: 'Upload Scan Results', durationMs: 1500, description: 'Ingesting SARIF output from CI/CD pipeline' },
  { stage: 'parse', label: 'Parse Findings', durationMs: 1200, description: 'Extracting vulnerability findings from scanner output' },
  { stage: 'map', label: 'Map CWE to Controls', durationMs: 2500, description: 'Cross-referencing CWE identifiers against 6 compliance frameworks' },
  { stage: 'policy', label: 'Evaluate Policy', durationMs: 1000, description: 'Checking findings against organization compliance policy' },
  { stage: 'poam', label: 'Generate POAMs', durationMs: 1200, description: 'Creating Plan of Action & Milestones entries for critical/high findings' },
];

const SAMPLE_FILES = [
  { name: 'semgrep-results.sarif', format: 'SARIF', size: '342 KB' },
  { name: 'snyk-scan.sarif.json', format: 'SARIF', size: '128 KB' },
  { name: 'trivy-sbom.cdx.json', format: 'CycloneDX', size: '567 KB' },
];

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-blue-100 text-blue-700',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DemoScanSimulationPage() {
  const [stage, setStage] = useState<Stage>('idle');
  const [selectedFile, setSelectedFile] = useState(0);
  const [progress, setProgress] = useState(0);
  const [parsedCount, setParsedCount] = useState(0);
  const [mappedCount, setMappedCount] = useState(0);
  const [expandedStep, setExpandedStep] = useState<Stage | null>(null);

  // Progress for upload
  useEffect(() => {
    if (stage !== 'upload') return;
    let pct = 0;
    const interval = setInterval(() => {
      pct = Math.min(pct + 4, 95);
      setProgress(pct);
      if (pct >= 95) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [stage]);

  // Counter for parse
  useEffect(() => {
    if (stage !== 'parse') return;
    let count = 0;
    const interval = setInterval(() => {
      count = Math.min(count + 1, 12);
      setParsedCount(count);
      if (count >= 12) clearInterval(interval);
    }, 90);
    return () => clearInterval(interval);
  }, [stage]);

  // Counter for mapping
  useEffect(() => {
    if (stage !== 'map') return;
    let count = 0;
    const total = demoPipelineFindings.length;
    const interval = setInterval(() => {
      count = Math.min(count + 1, total);
      setMappedCount(count);
      if (count >= total) clearInterval(interval);
    }, 180);
    return () => clearInterval(interval);
  }, [stage]);

  const runScan = useCallback(() => {
    setProgress(0);
    setParsedCount(0);
    setMappedCount(0);
    setExpandedStep(null);

    let delay = 0;
    for (const step of STEPS) {
      const s = step.stage;
      setTimeout(() => {
        setStage(s);
        setExpandedStep(s);
      }, delay);
      delay += step.durationMs;
    }
    setTimeout(() => {
      setProgress(100);
      setStage('complete');
    }, delay);
  }, []);

  const reset = useCallback(() => {
    setStage('idle');
    setProgress(0);
    setParsedCount(0);
    setMappedCount(0);
    setExpandedStep(null);
  }, []);

  const activeStepIdx = STEPS.findIndex((s) => s.stage === stage);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/demo/pipeline" className="hover:text-blue-600">Pipeline Scanner</Link>
        <span>/</span>
        <span className="text-gray-900">Scan Simulation</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scan Simulation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Full stage-by-stage compliance scan with expandable details &mdash; Demo Mode
        </p>
      </div>

      {/* File selector */}
      {stage === 'idle' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Select Sample Scan File</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {SAMPLE_FILES.map((file, idx) => (
              <button
                key={file.name}
                type="button"
                onClick={() => setSelectedFile(idx)}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  selectedFile === idx
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900">{file.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{file.format}</span>
                  <span className="text-xs text-gray-500">{file.size}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={runScan}
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Start Compliance Scan
            </button>
          </div>
        </div>
      )}

      {/* Pipeline progress */}
      {stage !== 'idle' && (
        <div className="space-y-4">
          {STEPS.map((step, idx) => {
            const isActive = idx === activeStepIdx;
            const isComplete = stage === 'complete' || activeStepIdx > idx;
            const isExpanded = expandedStep === step.stage;

            return (
              <div key={step.stage} className={`rounded-lg border transition-all ${isActive ? 'border-blue-300 bg-white shadow-sm' : isComplete ? 'border-green-200 bg-white' : 'border-gray-200 bg-gray-50'}`}>
                <button
                  type="button"
                  onClick={() => isComplete || isActive ? setExpandedStep(isExpanded ? null : step.stage) : undefined}
                  className="flex w-full items-center gap-3 p-4"
                >
                  {isComplete ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : isActive ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <div className="h-3 w-3 animate-pulse rounded-full bg-blue-600" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                      <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                    </div>
                  )}

                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isActive ? 'text-blue-700' : isComplete ? 'text-gray-900' : 'text-gray-400'}`}>
                        Step {idx + 1}: {step.label}
                      </span>
                      {step.stage === 'upload' && isActive && (
                        <span className="text-xs text-gray-500">{progress}%</span>
                      )}
                      {step.stage === 'parse' && (isActive || isComplete) && (
                        <span className="text-xs text-gray-500">{isComplete ? 12 : parsedCount} findings</span>
                      )}
                      {step.stage === 'map' && (isActive || isComplete) && (
                        <span className="text-xs text-purple-600">{isComplete ? 12 : mappedCount} mapped</span>
                      )}
                      {step.stage === 'policy' && isComplete && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">FAIL</span>
                      )}
                      {step.stage === 'poam' && isComplete && (
                        <span className="text-xs text-amber-600">4 entries created</span>
                      )}
                    </div>
                    <p className={`text-xs ${isActive || isComplete ? 'text-gray-500' : 'text-gray-400'}`}>{step.description}</p>
                  </div>

                  {(isComplete || isActive) && (
                    <svg className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {/* Expanded detail */}
                {isExpanded && (isComplete || isActive) && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4">
                    {step.stage === 'upload' && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-700">Source: CI/CD Pipeline (GitHub Actions)</p>
                        <p className="text-xs text-gray-600">File: {SAMPLE_FILES[selectedFile].name} ({SAMPLE_FILES[selectedFile].size})</p>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                          <div className="h-full rounded-full bg-green-500" style={{ width: '100%' }} />
                        </div>
                      </div>
                    )}

                    {step.stage === 'parse' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="pb-2 pr-4 font-semibold text-gray-500">Severity</th>
                              <th className="pb-2 pr-4 font-semibold text-gray-500">Title</th>
                              <th className="pb-2 pr-4 font-semibold text-gray-500">CWE</th>
                              <th className="pb-2 pr-4 font-semibold text-gray-500">File</th>
                              <th className="pb-2 font-semibold text-gray-500">Line</th>
                            </tr>
                          </thead>
                          <tbody>
                            {demoPipelineFindings.map((f) => (
                              <tr key={f.id} className="border-b border-gray-100">
                                <td className="py-1.5 pr-4">
                                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${SEVERITY_COLORS[f.severity]}`}>{f.severity}</span>
                                </td>
                                <td className="py-1.5 pr-4 text-gray-900">{f.title}</td>
                                <td className="py-1.5 pr-4 font-mono text-gray-600">{f.cweId}</td>
                                <td className="py-1.5 pr-4 font-mono text-gray-600">{f.filePath}</td>
                                <td className="py-1.5 font-mono text-gray-600">L{f.lineNumber}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {step.stage === 'map' && (
                      <div className="space-y-2">
                        {demoPipelineFindings.slice(0, 6).map((f) => {
                          const mapping = demoCWEMappings.find((m) => m.cweId === f.cweId);
                          if (!mapping) return null;
                          return (
                            <div key={f.id} className="flex items-center gap-3 rounded border border-gray-200 bg-white p-2">
                              <span className="font-mono text-xs font-bold text-gray-700">{f.cweId}</span>
                              <svg className="h-3 w-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                              <div className="flex flex-wrap gap-1">
                                {mapping.nist80053.map((c) => (
                                  <span key={c} className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">{c}</span>
                                ))}
                                {mapping.soc2.map((c) => (
                                  <span key={c} className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">{c}</span>
                                ))}
                                {mapping.cmmc.map((c) => (
                                  <span key={c} className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">{c}</span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        <p className="text-xs text-gray-400">... and {demoPipelineFindings.length - 6} more mappings</p>
                      </div>
                    )}

                    {step.stage === 'policy' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">FAIL</span>
                          <span className="text-xs text-gray-700">Policy: Block PR on CRITICAL or HIGH findings with compliance impact</span>
                        </div>
                        <div className="rounded border border-red-200 bg-red-50 p-3">
                          <p className="text-xs text-red-800">2 CRITICAL and 4 HIGH findings affect 8 compliance controls across 3 frameworks.</p>
                          <p className="mt-1 text-xs text-red-700">PR merge blocked until findings are resolved or exception granted.</p>
                        </div>
                      </div>
                    )}

                    {step.stage === 'poam' && (
                      <div className="space-y-2">
                        {demoPipelinePOAMs.map((p) => (
                          <div key={p.id} className="rounded border border-gray-200 bg-white p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-900">{p.id}</span>
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${SEVERITY_COLORS[p.severity]}`}>{p.severity}</span>
                            </div>
                            <p className="mt-1 text-xs text-gray-700">{p.findingTitle}</p>
                            <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-500">
                              <span>{p.controlId} ({p.framework})</span>
                              <span>Due: {p.dueDate}</span>
                              <span>{p.owner}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Complete summary */}
          {stage === 'complete' && (
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">Scan Complete</p>
                  <p className="text-sm text-gray-500">All 5 stages finished successfully</p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">12</p>
                  <p className="text-[10px] font-medium text-gray-500">Findings</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                  <p className="text-xl font-bold text-purple-700">8</p>
                  <p className="text-[10px] font-medium text-gray-500">Controls</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                  <p className="text-xl font-bold text-red-700">FAIL</p>
                  <p className="text-[10px] font-medium text-red-600">Verdict</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                  <p className="text-xl font-bold text-amber-700">4</p>
                  <p className="text-[10px] font-medium text-amber-600">POAMs</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/demo/pipeline/pr-comment"
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  View PR Comment
                </Link>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  Run Again
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
