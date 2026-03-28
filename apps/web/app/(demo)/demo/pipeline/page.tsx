'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  demoCWEMappings,
  demoPipelineFindings,
  demoPipelinePOAMs,
  demoPRCommentMarkdown,
} from '@/lib/demo-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PipelineStage = 'idle' | 'uploading' | 'parsing' | 'mapping' | 'evaluating' | 'generating' | 'complete';

interface PipelineStep {
  stage: PipelineStage;
  label: string;
  durationMs: number;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { stage: 'uploading', label: 'Uploading scan results...', durationMs: 1500 },
  { stage: 'parsing', label: 'Parsing findings...', durationMs: 1000 },
  { stage: 'mapping', label: 'Mapping CWE to compliance controls...', durationMs: 2000 },
  { stage: 'evaluating', label: 'Evaluating policy...', durationMs: 800 },
  { stage: 'generating', label: 'Generating POAM entries...', durationMs: 1000 },
];

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-blue-100 text-blue-700 border-blue-200',
};

const SEVERITY_LINE_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#3b82f6',
};

// ---------------------------------------------------------------------------
// Frameworks derived from CWE mappings
// ---------------------------------------------------------------------------

function getFrameworkImpact() {
  const frameworks: Record<string, { controls: Set<string>; verdict: string }> = {
    'NIST 800-53': { controls: new Set(), verdict: 'pass' },
    'SOC 2': { controls: new Set(), verdict: 'pass' },
    'CMMC': { controls: new Set(), verdict: 'pass' },
    'FedRAMP': { controls: new Set(), verdict: 'pass' },
    'ASVS': { controls: new Set(), verdict: 'pass' },
    'SSDF': { controls: new Set(), verdict: 'pass' },
  };

  for (const f of demoPipelineFindings) {
    const mapping = demoCWEMappings.find((m) => m.cweId === f.cweId);
    if (!mapping) continue;
    mapping.nist80053.forEach((c) => frameworks['NIST 800-53'].controls.add(c));
    mapping.soc2.forEach((c) => frameworks['SOC 2'].controls.add(c));
    mapping.cmmc.forEach((c) => frameworks['CMMC'].controls.add(c));
    mapping.fedramp.forEach((c) => frameworks['FedRAMP'].controls.add(c));
    mapping.asvs.forEach((c) => frameworks['ASVS'].controls.add(c));
    mapping.ssdf.forEach((c) => frameworks['SSDF'].controls.add(c));
  }

  // Mark fail if any critical/high
  for (const f of demoPipelineFindings) {
    const mapping = demoCWEMappings.find((m) => m.cweId === f.cweId);
    if (!mapping) continue;
    if (mapping.severity === 'CRITICAL' || mapping.severity === 'HIGH') {
      if (mapping.nist80053.length) frameworks['NIST 800-53'].verdict = 'fail';
      if (mapping.soc2.length) frameworks['SOC 2'].verdict = 'fail';
      if (mapping.cmmc.length) frameworks['CMMC'].verdict = 'fail';
      if (mapping.fedramp.length) frameworks['FedRAMP'].verdict = 'fail';
      if (mapping.asvs.length) frameworks['ASVS'].verdict = 'fail';
      if (mapping.ssdf.length) frameworks['SSDF'].verdict = 'fail';
    }
  }

  return Object.entries(frameworks).map(([name, data]) => ({
    name,
    controlsAffected: data.controls.size,
    controls: Array.from(data.controls),
    verdict: data.verdict,
  }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DemoPipelinePage() {
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [progress, setProgress] = useState(0);
  const [findingsCount, setFindingsCount] = useState(0);
  const [mappedCount, setMappedCount] = useState(0);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [poamCount, setPoamCount] = useState(0);
  const [activeCwe, setActiveCwe] = useState<string | null>(null);
  const [prView, setPrView] = useState<'github' | 'gitlab'>('github');

  const frameworkImpact = getFrameworkImpact();

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

  // Counter for parsing step
  useEffect(() => {
    if (stage !== 'parsing') return;
    let count = 0;
    const interval = setInterval(() => {
      count = Math.min(count + 1, 12);
      setFindingsCount(count);
      if (count >= 12) clearInterval(interval);
    }, 75);
    return () => clearInterval(interval);
  }, [stage]);

  // Counter for mapping step
  useEffect(() => {
    if (stage !== 'mapping') return;
    let count = 0;
    const interval = setInterval(() => {
      count = Math.min(count + 1, 8);
      setMappedCount(count);
      if (count >= 8) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, [stage]);

  // Verdict flip for evaluating step
  useEffect(() => {
    if (stage !== 'evaluating') return;
    const timer = setTimeout(() => setVerdict('FAIL'), 400);
    return () => clearTimeout(timer);
  }, [stage]);

  // POAM counter for generating step
  useEffect(() => {
    if (stage !== 'generating') return;
    let count = 0;
    const interval = setInterval(() => {
      count = Math.min(count + 1, 4);
      setPoamCount(count);
      if (count >= 4) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, [stage]);

  const runScan = useCallback(() => {
    setProgress(0);
    setFindingsCount(0);
    setMappedCount(0);
    setVerdict(null);
    setPoamCount(0);

    let delay = 0;
    for (const step of PIPELINE_STEPS) {
      const s = step.stage;
      setTimeout(() => setStage(s), delay);
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
    setFindingsCount(0);
    setMappedCount(0);
    setVerdict(null);
    setPoamCount(0);
  }, []);

  const activeStepIdx = PIPELINE_STEPS.findIndex((s) => s.stage === stage);

  // Get unique CWEs used in findings for visualization
  const usedCweIds = [...new Set(demoPipelineFindings.map((f) => f.cweId))];
  const usedMappings = demoCWEMappings.filter((m) => usedCweIds.includes(m.cweId));

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pipeline Compliance Scanner</h1>
        <p className="mt-1 text-sm text-gray-500">
          Automatically map code vulnerabilities to compliance controls on every PR &mdash; Demo Mode
        </p>
      </div>

      {/* Demo mode banner */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
        <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 14.5M14.25 3.104c.251.023.501.05.75.082M19.8 14.5l-2.147 2.146a2.25 2.25 0 01-1.591.659H7.938a2.25 2.25 0 01-1.591-.659L4.2 14.5m15.6 0l.147-.146a2.25 2.25 0 000-3.182l-.31-.31" />
        </svg>
        <span className="text-sm font-medium text-amber-800">
          Demo Mode &mdash; This simulates the Pipeline Compliance Scanner experience.
        </span>
      </div>

      {/* ===== SECTION A: Interactive Scan Simulation ===== */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Interactive Scan Simulation</h2>

        {stage === 'idle' && (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue-300 bg-gray-50 px-6 py-12">
            <svg className="mb-4 h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p className="mb-1 text-lg font-semibold text-gray-700">Run a Compliance Scan</p>
            <p className="mb-4 text-sm text-gray-500">Simulate a CI/CD pipeline scan on a pull request</p>
            <button
              type="button"
              onClick={runScan}
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Run Compliance Scan
            </button>
            <p className="mt-3 text-xs text-gray-400">Scanning acmecorp/api-gateway PR #342</p>
          </div>
        )}

        {stage !== 'idle' && stage !== 'complete' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">
                Scanning <span className="font-semibold text-gray-900">acmecorp/api-gateway</span> PR #342
              </span>
            </div>

            <div className="space-y-3">
              {PIPELINE_STEPS.map((step, idx) => {
                const isActive = idx === activeStepIdx;
                const isComplete = activeStepIdx > idx;
                return (
                  <div key={step.stage} className="flex items-center gap-3">
                    {isComplete ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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
                    <span className={`text-sm ${isActive ? 'font-medium text-gray-900' : isComplete ? 'text-gray-500' : 'text-gray-400'}`}>
                      {step.label}
                    </span>

                    {step.stage === 'uploading' && isActive && (
                      <div className="ml-auto flex w-40 items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                          <div className="h-full rounded-full bg-blue-600 transition-all duration-100" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{progress}%</span>
                      </div>
                    )}

                    {step.stage === 'parsing' && isActive && (
                      <span className="ml-2 text-sm font-semibold text-blue-600">{findingsCount} / 12</span>
                    )}
                    {step.stage === 'parsing' && isComplete && (
                      <span className="ml-2 text-sm text-gray-500">12 findings</span>
                    )}

                    {step.stage === 'mapping' && isActive && (
                      <span className="ml-2 text-sm font-semibold text-purple-600">{mappedCount} controls mapped</span>
                    )}
                    {step.stage === 'mapping' && isComplete && (
                      <span className="ml-2 text-sm text-gray-500">8 controls mapped</span>
                    )}

                    {step.stage === 'evaluating' && isActive && verdict && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">FAIL</span>
                    )}
                    {step.stage === 'evaluating' && isComplete && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">FAIL</span>
                    )}

                    {step.stage === 'generating' && isActive && (
                      <span className="ml-2 text-sm font-semibold text-amber-600">{poamCount} / 4 POAM entries</span>
                    )}
                    {step.stage === 'generating' && isComplete && (
                      <span className="ml-2 text-sm text-gray-500">4 POAM entries</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {stage === 'complete' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">Scan Complete</p>
                <p className="text-sm text-gray-500">Pipeline compliance scan finished in 6.3s</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">12</p>
                <p className="text-xs font-medium text-gray-500">Total Findings</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                <p className="text-2xl font-bold text-red-700">2</p>
                <p className="text-xs font-medium text-red-600">Critical</p>
              </div>
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-center">
                <p className="text-2xl font-bold text-orange-700">4</p>
                <p className="text-xs font-medium text-orange-600">High</p>
              </div>
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-center">
                <p className="text-2xl font-bold text-purple-700">8</p>
                <p className="text-xs font-medium text-purple-600">Controls Affected</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">4</p>
                <p className="text-xs font-medium text-amber-600">POAMs Created</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/demo/pipeline/scan-simulation"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                View Full Scan Details
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

      {/* ===== SECTION B: CWE-to-Control Mapping Visualization ===== */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">CWE-to-Control Mapping</h2>
        <p className="mb-6 text-sm text-gray-500">Click a CWE to highlight its downstream compliance controls</p>

        <div className="relative grid grid-cols-3 gap-4">
          {/* Left column — CWE identifiers */}
          <div className="space-y-2">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">CWE Identifiers</div>
            {usedMappings.map((m) => (
              <button
                key={m.cweId}
                type="button"
                onClick={() => setActiveCwe(activeCwe === m.cweId ? null : m.cweId)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                  activeCwe === m.cweId
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : activeCwe
                      ? 'border-gray-200 bg-gray-50 opacity-40'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold">{m.cweId}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${SEVERITY_COLORS[m.severity]}`}>
                    {m.severity}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-gray-600">{m.cweName}</div>
              </button>
            ))}
          </div>

          {/* Middle column — NIST 800-53 controls */}
          <div className="space-y-2">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">NIST 800-53</div>
            {(() => {
              const allControls = [...new Set(usedMappings.flatMap((m) => m.nist80053))];
              return allControls.map((ctrl) => {
                const isHighlighted = activeCwe
                  ? usedMappings.find((m) => m.cweId === activeCwe)?.nist80053.includes(ctrl)
                  : false;
                return (
                  <div
                    key={ctrl}
                    className={`rounded-lg border px-3 py-2 text-sm transition-all ${
                      isHighlighted
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : activeCwe
                          ? 'border-gray-200 bg-gray-50 opacity-40'
                          : 'border-gray-200 bg-white'
                    }`}
                  >
                    <span className="font-mono text-xs font-bold">{ctrl}</span>
                  </div>
                );
              });
            })()}
          </div>

          {/* Right column — Framework controls (SOC2 + CMMC) */}
          <div className="space-y-2">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">SOC 2 / CMMC</div>
            {(() => {
              const allSoc2 = [...new Set(usedMappings.flatMap((m) => m.soc2))];
              const allCmmc = [...new Set(usedMappings.flatMap((m) => m.cmmc))];
              const combined = [...allSoc2.map((c) => ({ id: c, fw: 'SOC 2' })), ...allCmmc.map((c) => ({ id: c, fw: 'CMMC' }))];
              return combined.map((item) => {
                const isHighlighted = activeCwe
                  ? (() => {
                      const m = usedMappings.find((m) => m.cweId === activeCwe);
                      if (!m) return false;
                      return item.fw === 'SOC 2' ? m.soc2.includes(item.id) : m.cmmc.includes(item.id);
                    })()
                  : false;
                return (
                  <div
                    key={`${item.fw}-${item.id}`}
                    className={`rounded-lg border px-3 py-2 text-sm transition-all ${
                      isHighlighted
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : activeCwe
                          ? 'border-gray-200 bg-gray-50 opacity-40'
                          : 'border-gray-200 bg-white'
                    }`}
                  >
                    <span className="font-mono text-xs font-bold">{item.id}</span>
                    <span className="ml-2 text-[10px] text-gray-400">{item.fw}</span>
                  </div>
                );
              });
            })()}
          </div>

          {/* Connection lines overlay */}
          {activeCwe && (
            <div className="pointer-events-none absolute inset-0">
              {(() => {
                const mapping = usedMappings.find((m) => m.cweId === activeCwe);
                if (!mapping) return null;
                const color = SEVERITY_LINE_COLORS[mapping.severity] || '#3b82f6';
                return (
                  <div className="absolute left-[33%] right-[33%] top-0 h-full">
                    <svg className="h-full w-full" style={{ overflow: 'visible' }}>
                      <line x1="0" y1="50%" x2="100%" y2="50%" stroke={color} strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />
                    </svg>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ===== SECTION C: PR Comment Preview ===== */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">PR Comment Preview</h2>
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
              type="button"
              onClick={() => setPrView('github')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                prView === 'github' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              GitHub PR
            </button>
            <button
              type="button"
              onClick={() => setPrView('gitlab')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                prView === 'gitlab' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              GitLab MR
            </button>
          </div>
        </div>

        <div className={`rounded-lg border p-5 ${prView === 'gitlab' ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200 bg-gray-50'}`}>
          {/* Comment header */}
          <div className="mb-4 flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${prView === 'gitlab' ? 'bg-orange-600' : 'bg-gray-800'}`}>
              {prView === 'gitlab' ? 'GL' : 'GH'}
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900">
                {prView === 'gitlab' ? 'cveriskpilot-bot' : 'cveriskpilot[bot]'}
              </span>
              <span className="ml-2 text-xs text-gray-500">commented 2 minutes ago</span>
            </div>
          </div>

          {/* Rendered markdown content */}
          <div className="prose prose-sm max-w-none">
            {demoPRCommentMarkdown.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h3 key={i} className="mb-2 mt-4 text-base font-bold text-gray-900">{line.replace('## ', '')}</h3>;
              if (line.startsWith('### ')) return <h4 key={i} className="mb-2 mt-3 text-sm font-semibold text-gray-800">{line.replace('### ', '')}</h4>;
              if (line.startsWith('**')) return <p key={i} className="mb-2 text-sm font-semibold text-gray-800">{line.replace(/\*\*/g, '')}</p>;
              if (line.startsWith('|')) {
                // Table row
                const cells = line.split('|').filter(Boolean).map((c) => c.trim());
                if (cells.every((c) => c.match(/^[-]+$/))) return null; // separator
                const isHeader = i > 0 && demoPRCommentMarkdown.split('\n')[i + 1]?.match(/^\|[-|]+\|$/);
                return (
                  <div key={i} className={`grid gap-2 border-b border-gray-200 py-1 text-xs ${isHeader ? 'font-semibold text-gray-700' : 'text-gray-600'}`}
                    style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
                    {cells.map((cell, j) => <span key={j}>{cell}</span>)}
                  </div>
                );
              }
              if (line.startsWith('[')) {
                return <p key={i} className="mt-3 text-sm font-medium text-blue-600">{line.replace(/\[|\]\(.*\)/g, '')}</p>;
              }
              if (line.trim() === '') return <div key={i} className="h-2" />;
              return <p key={i} className="text-sm text-gray-700">{line}</p>;
            })}
          </div>
        </div>

        <div className="mt-3 text-center">
          <Link href="/demo/pipeline/pr-comment" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            View full PR comment experience &rarr;
          </Link>
        </div>
      </div>

      {/* ===== SECTION D: Framework Impact Cards ===== */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Framework Impact</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {frameworkImpact.map((fw) => (
            <div
              key={fw.name}
              className={`rounded-lg border-2 p-4 ${
                fw.verdict === 'fail' ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">{fw.name}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  fw.verdict === 'fail' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {fw.verdict.toUpperCase()}
                </span>
              </div>
              <p className="mb-2 text-xs text-gray-600">
                {fw.controlsAffected} control{fw.controlsAffected !== 1 ? 's' : ''} affected
              </p>
              <div className="flex flex-wrap gap-1">
                {fw.controls.map((ctrl) => (
                  <span key={ctrl} className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-700">
                    {ctrl}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== SECTION E: Before/After Comparison ===== */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-6 text-lg font-semibold text-gray-900">Before vs. After</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Without */}
          <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200">
                <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v.375" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-700">Without CVERiskPilot</h3>
                <p className="text-xs text-gray-500">Manual compliance tracking</p>
              </div>
            </div>
            <ul className="space-y-3">
              {[
                { label: '40+ hours/quarter', desc: 'Manual compliance mapping effort' },
                { label: '3-10 business day lag', desc: 'Time from finding to compliance impact' },
                { label: 'Manual CWE-to-control mapping', desc: 'Error-prone spreadsheet lookups' },
                { label: 'No audit trail', desc: 'No link between code and compliance' },
              ].map((item) => (
                <li key={item.label} className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* With */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-800">With CVERiskPilot</h3>
                <p className="text-xs text-blue-600">Automated pipeline compliance</p>
              </div>
            </div>
            <ul className="space-y-3">
              {[
                { label: '30 seconds per PR', desc: 'Automated on every commit' },
                { label: 'Real-time on every commit', desc: 'Zero lag from finding to compliance' },
                { label: 'Automatic 150+ CWE mappings', desc: 'Pre-built mapping to 6 frameworks' },
                { label: 'Full commit-linked evidence', desc: 'Every finding tied to code + framework' },
              ].map((item) => (
                <li key={item.label} className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: '/demo/pipeline/scan-simulation', label: 'Scan Simulation', desc: 'Full stage-by-stage view' },
          { href: '/demo/pipeline/pr-comment', label: 'PR Comment', desc: 'GitHub/GitLab output' },
          { href: '/demo/pipeline/scorecard', label: 'Scorecard', desc: 'Repo compliance scores' },
          { href: '/demo/pipeline/mssp', label: 'MSSP View', desc: 'Multi-client overview' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/50"
          >
            <p className="text-sm font-semibold text-gray-900">{link.label}</p>
            <p className="mt-0.5 text-xs text-gray-500">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
