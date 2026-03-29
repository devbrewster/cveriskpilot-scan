'use client';

import { useState } from 'react';
import Link from 'next/link';
import { demoPRCommentMarkdown } from '@/lib/demo-data';

// ---------------------------------------------------------------------------
// Verdict variants
// ---------------------------------------------------------------------------

const VERDICTS = {
  fail: {
    label: 'FAIL',
    emoji: '\u274c',
    color: 'bg-red-100 text-red-700',
    summary: '8 compliance controls affected across 3 frameworks',
    findings: 12,
    critical: 2,
    high: 4,
    controls: 8,
    poams: 4,
  },
  warn: {
    label: 'WARN',
    emoji: '\u26a0\ufe0f',
    color: 'bg-yellow-100 text-yellow-700',
    summary: '3 compliance controls affected across 2 frameworks',
    findings: 3,
    critical: 0,
    high: 1,
    controls: 3,
    poams: 1,
  },
  pass: {
    label: 'PASS',
    emoji: '\u2705',
    color: 'bg-green-100 text-green-700',
    summary: 'No compliance controls affected',
    findings: 0,
    critical: 0,
    high: 0,
    controls: 0,
    poams: 0,
  },
};

type VerdictType = 'fail' | 'warn' | 'pass';
type ViewType = 'github' | 'gitlab';

// ---------------------------------------------------------------------------
// Simple markdown line renderer
// ---------------------------------------------------------------------------

function MarkdownLine({ line, index: _index }: { line: string; index: number }) {
  if (line.startsWith('## ')) return <h3 className="mb-2 mt-4 text-base font-bold text-gray-900">{line.replace('## ', '')}</h3>;
  if (line.startsWith('### ')) return <h4 className="mb-2 mt-3 text-sm font-semibold text-gray-800">{line.replace('### ', '')}</h4>;
  if (line.startsWith('**')) return <p className="mb-2 text-sm font-semibold text-gray-800">{line.replace(/\*\*/g, '')}</p>;
  if (line.startsWith('|')) {
    const cells = line.split('|').filter(Boolean).map((c) => c.trim());
    if (cells.every((c) => /^[-]+$/.test(c))) return null;
    return (
      <div
        className="grid gap-2 border-b border-gray-200 py-1 text-xs text-gray-600"
        style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
      >
        {cells.map((cell, j) => <span key={j}>{cell}</span>)}
      </div>
    );
  }
  if (line.startsWith('[')) {
    return <p className="mt-3 text-sm font-medium text-blue-600">{line.replace(/\[|\]\(.*\)/g, '')}</p>;
  }
  if (line.trim() === '') return <div className="h-2" />;
  return <p className="text-sm text-gray-700">{line}</p>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DemoPRCommentPage() {
  const [view, setView] = useState<ViewType>('github');
  const [verdict, setVerdict] = useState<VerdictType>('fail');

  const v = VERDICTS[verdict];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/demo/pipeline" className="hover:text-blue-600">Pipeline Scanner</Link>
        <span>/</span>
        <span className="text-gray-900">PR Comment</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">PR Comment Preview</h1>
        <p className="mt-1 text-sm text-gray-500">
          See what the CVERiskPilot bot posts on every pull request &mdash; Demo Mode
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Platform toggle */}
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={() => setView('github')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              view === 'github' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            GitHub PR
          </button>
          <button
            type="button"
            onClick={() => setView('gitlab')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              view === 'gitlab' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            GitLab MR
          </button>
        </div>

        {/* Verdict toggle */}
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          {(['pass', 'warn', 'fail'] as VerdictType[]).map((vt) => (
            <button
              key={vt}
              type="button"
              onClick={() => setVerdict(vt)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                verdict === vt ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {vt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* PR Comment Card */}
      <div className={`rounded-lg border-2 ${view === 'gitlab' ? 'border-orange-200' : 'border-gray-200'}`}>
        {/* Comment header */}
        <div className={`flex items-center gap-3 border-b p-4 ${view === 'gitlab' ? 'border-orange-200 bg-orange-50/50' : 'border-gray-200 bg-gray-50'}`}>
          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${view === 'gitlab' ? 'bg-orange-600' : 'bg-gray-800'}`}>
            {view === 'gitlab' ? 'GL' : 'GH'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">
                {view === 'gitlab' ? 'cveriskpilot-bot' : 'cveriskpilot[bot]'}
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-500">bot</span>
            </div>
            <span className="text-xs text-gray-500">commented 2 minutes ago</span>
          </div>
        </div>

        {/* Comment body */}
        <div className="p-6">
          {verdict === 'fail' ? (
            <div className="prose prose-sm max-w-none">
              {demoPRCommentMarkdown.split('\n').map((line, i) => (
                <MarkdownLine key={i} line={line} index={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900">
                {'\ud83d\udd12'} CVERiskPilot Compliance Scan
              </h3>
              <p className="text-sm font-semibold text-gray-800">
                Verdict: {v.emoji} {v.label} {'\u2014'} {v.summary}
              </p>

              {verdict === 'warn' && (
                <>
                  <div className="grid gap-2 border-b border-gray-200 py-1 text-xs font-semibold text-gray-700"
                    style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
                    <span>Metric</span><span>Count</span><span></span><span></span><span></span>
                  </div>
                  {[
                    ['Total Findings', '3'],
                    ['Critical', '0'],
                    ['High', '1'],
                    ['Controls Affected', '3'],
                    ['POAM Entries Created', '1'],
                  ].map(([label, count]) => (
                    <div key={label} className="grid gap-2 border-b border-gray-100 py-1 text-xs text-gray-600"
                      style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
                      <span>{label}</span><span>{count}</span><span></span><span></span><span></span>
                    </div>
                  ))}
                </>
              )}

              {verdict === 'pass' && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">All compliance controls satisfied. No findings detected.</span>
                  </div>
                  <p className="mt-2 text-xs text-green-700">0 findings | 0 controls affected | 0 POAM entries</p>
                </div>
              )}

              <p className="mt-3 text-sm font-medium text-blue-600">View full report {'\u2192'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Section explanations */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Anatomy of a Compliance Comment</h2>
        <div className="space-y-4">
          {[
            { title: 'Verdict', desc: 'PASS, WARN, or FAIL based on your organization\'s compliance policy. Configurable thresholds per framework.' },
            { title: 'Summary Table', desc: 'Quick stats: total findings, severity breakdown, controls affected, and POAM entries auto-created.' },
            { title: 'Findings Table', desc: 'Each finding mapped to its CWE and the corresponding controls across every active framework.' },
            { title: 'POAM Entries', desc: 'Automatically generated Plan of Action & Milestones entries with due dates, owners, and remediation milestones.' },
            { title: 'Full Report Link', desc: 'Deep link into CVERiskPilot for the complete scan report with remediation guidance and AI recommendations.' },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {item.title[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
