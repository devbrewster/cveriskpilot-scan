'use client';

import { useState } from 'react';
import Link from 'next/link';
import { demoPRCommentMarkdown } from '@/lib/demo-data';

// ---------------------------------------------------------------------------
// Helpers — render inline markdown as React elements (no dangerouslySetInnerHTML)
// ---------------------------------------------------------------------------

/** Convert **bold** and `code` markdown to React inline elements. */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Match **bold**, `code`, and <a href="...">text</a>
  const TOKEN_RE = /\*\*(.+?)\*\*|`([^`]+)`|<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>|<sub>|<\/sub>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = TOKEN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      nodes.push(<strong key={key++}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      nodes.push(
        <code key={key++} className="rounded bg-gray-100 px-1 py-0.5 text-[11px] font-mono text-gray-800">
          {match[2]}
        </code>,
      );
    } else if (match[3] !== undefined && match[4] !== undefined) {
      nodes.push(
        <a key={key++} href={match[3]} className="text-blue-600 hover:underline">
          {match[4]}
        </a>,
      );
    }
    // skip bare <sub> / </sub> tags — we wrap the whole line
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Verdict variants with realistic data matching the formatter output
// ---------------------------------------------------------------------------

const VERDICTS = {
  fail: {
    markdown: demoPRCommentMarkdown,
  },
  warn: {
    markdown: `## ⚠️ CVERiskPilot Compliance Scan

> **WARN** — 1 finding at **HIGH** severity. Policy set to warn-only.

🔴 **0** Critical  🟠 **1** High  🟡 **2** Medium  🔵 **1** Low  ⚪ **0** Info

**Triage:** 3 actionable · 1 needs review · 0 auto-dismissed

<sub>312 dependencies (npm) · Scanners: sbom, secrets, iac · Duration: 890ms</sub>

<details>
<summary><strong>🔍 3 Findings Requiring Attention</strong></summary>

| Severity | Verdict | Finding | CWE | Location |
|----------|---------|---------|-----|----------|
| 🟠 HIGH | 🔴 TP | express@4.17.1 — Open Redirect | CWE-601 | \`express@4.17.1\` |
| 🟡 MEDIUM | 🟡 Review | Terraform RDS instance publicly accessible | CWE-284 | \`infra/rds.tf:18\` |
| 🟡 MEDIUM | 🔴 TP | Missing X-Frame-Options header | CWE-693 | \`next.config.js:1\` |

</details>

<details>
<summary><strong>🏛️ Compliance Impact — 4 controls affected</strong></summary>

| Framework | Controls Affected | Control IDs |
|-----------|:-----------------:|-------------|
| **NIST 800-53 Rev 5** | 2 | SI-2, AC-4 |
| **SOC 2 Type II** | 1 | CC6.1 |
| **OWASP ASVS 4.0** | 1 | V5.1 |

</details>

---
<sub>🛡️ Scanned by <a href="https://cveriskpilot.com">CVERiskPilot</a> · <a href="https://www.npmjs.com/package/@cveriskpilot/scan">CLI</a> · <a href="https://cveriskpilot.com/docs/pipeline">Setup Guide</a></sub>`,
  },
  pass: {
    markdown: `## ✅ CVERiskPilot Compliance Scan

> **PASS** — No findings at or above **CRITICAL** severity.

🔴 **0** Critical  🟠 **0** High  🟡 **1** Medium  🔵 **2** Low  ⚪ **3** Info

**Triage:** 0 actionable · 1 needs review · 5 auto-dismissed

<sub>156 dependencies (npm) · Scanners: sbom, secrets, iac · Duration: 620ms</sub>

---
<sub>🛡️ Scanned by <a href="https://cveriskpilot.com">CVERiskPilot</a> · <a href="https://www.npmjs.com/package/@cveriskpilot/scan">CLI</a> · <a href="https://cveriskpilot.com/docs/pipeline">Setup Guide</a></sub>`,
  },
};

type VerdictType = 'fail' | 'warn' | 'pass';
type ViewType = 'github' | 'gitlab';

// ---------------------------------------------------------------------------
// GitHub-flavored markdown renderer (handles tables, details, blockquotes)
// ---------------------------------------------------------------------------

function renderMarkdown(md: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = md.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Details block
    if (line.trim() === '<details>') {
      let summary = '';
      let innerLines: string[] = [];
      i++;
      while (i < lines.length && lines[i]!.trim() !== '</details>') {
        const l = lines[i]!;
        if (l.trim().startsWith('<summary>')) {
          summary = l.replace(/<\/?summary>/g, '').replace(/<\/?strong>/g, '').trim();
        } else {
          innerLines.push(l);
        }
        i++;
      }
      i++; // skip </details>

      nodes.push(
        <details key={`details-${i}`} className="my-3 rounded-lg border border-gray-200">
          <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50">
            {summary}
          </summary>
          <div className="border-t border-gray-200 px-4 py-3">
            {renderMarkdown(innerLines.join('\n'))}
          </div>
        </details>,
      );
      continue;
    }

    // <sub> line — render as React elements instead of raw HTML
    if (line.trim().startsWith('<sub>')) {
      const inner = line.trim().replace(/^<sub>/, '').replace(/<\/sub>$/, '');
      nodes.push(
        <p key={`sub-${i}`} className="text-xs text-gray-500">
          {renderInline(inner)}
        </p>,
      );
      i++;
      continue;
    }

    // HR
    if (line.trim() === '---') {
      nodes.push(<hr key={`hr-${i}`} className="my-3 border-gray-200" />);
      i++;
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      nodes.push(
        <h3 key={`h2-${i}`} className="mb-2 mt-3 text-lg font-bold text-gray-900">
          {line.replace('## ', '')}
        </h3>,
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const text = line.replace('> ', '');
      const isFail = text.includes('FAIL');
      const isWarn = text.includes('WARN');
      nodes.push(
        <div
          key={`bq-${i}`}
          className={`my-2 rounded-md border-l-4 px-4 py-2 text-sm ${
            isFail
              ? 'border-red-500 bg-red-50 text-red-800'
              : isWarn
                ? 'border-yellow-500 bg-yellow-50 text-yellow-800'
                : 'border-green-500 bg-green-50 text-green-800'
          }`}
        >
          {renderInline(text)}
        </div>,
      );
      i++;
      continue;
    }

    // Table
    if (line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('|')) {
        tableLines.push(lines[i]!);
        i++;
      }

      const headerLine = tableLines[0]!;
      const dataRows = tableLines.slice(2); // skip header + separator

      const headerCells = headerLine.split('|').filter(Boolean).map((c) => c.trim());

      nodes.push(
        <div key={`table-${i}`} className="my-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {headerCells.map((cell, j) => (
                  <th key={j} className="px-3 py-1.5 text-left font-semibold text-gray-700">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => {
                const cells = row.split('|').filter(Boolean).map((c) => c.trim());
                return (
                  <tr key={ri} className="border-b border-gray-100 hover:bg-gray-50/50">
                    {cells.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-3 py-1.5 text-gray-600"
                      >
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Bold paragraph
    if (line.startsWith('**') && !line.startsWith('**Triage')) {
      nodes.push(
        <p key={`bold-${i}`} className="my-1 text-sm font-semibold text-gray-800">
          {renderInline(line)}
        </p>,
      );
      i++;
      continue;
    }

    // Triage line
    if (line.startsWith('**Triage')) {
      nodes.push(
        <p key={`triage-${i}`} className="my-1 text-sm text-gray-600">
          {renderInline(line)}
        </p>,
      );
      i++;
      continue;
    }

    // Severity badge line (emoji + counts)
    if (line.includes('🔴') && line.includes('Critical')) {
      nodes.push(
        <p key={`sev-${i}`} className="my-2 text-sm">
          {renderInline(line)}
        </p>,
      );
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Default paragraph
    nodes.push(
      <p key={`p-${i}`} className="my-1 text-sm text-gray-700">{renderInline(line)}</p>,
    );
    i++;
  }

  return nodes;
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
          Every pull request gets an automated compliance scan comment &mdash; real output from <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">crp-scan</code>
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

      {/* Setup snippet */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-medium text-blue-900">Add to your workflow:</p>
        <pre className="mt-2 overflow-x-auto rounded bg-blue-900 p-3 text-xs text-blue-100">
{`- uses: devbrewster/cveriskpilot-scan/action@main
  with:
    preset: 'startup'
    fail-on: 'critical'
    api-key: \${{ secrets.CRP_API_KEY }}`}
        </pre>
      </div>

      {/* PR Comment Card */}
      <div className={`rounded-lg border-2 ${view === 'gitlab' ? 'border-orange-200' : 'border-gray-200'}`}>
        {/* Comment header */}
        <div className={`flex items-center gap-3 border-b p-4 ${view === 'gitlab' ? 'border-orange-200 bg-orange-50/50' : 'border-gray-200 bg-gray-50'}`}>
          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${view === 'gitlab' ? 'bg-orange-600' : 'bg-gray-800'}`}>
            {view === 'gitlab' ? 'CR' : (
              <svg className="h-6 w-6" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 01-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 010 8c0-4.42 3.58-8 8-8z"/></svg>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">
                {view === 'gitlab' ? 'cveriskpilot-bot' : 'github-actions[bot]'}
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-500">bot</span>
            </div>
            <span className="text-xs text-gray-500">commented 2 minutes ago</span>
          </div>
        </div>

        {/* Comment body */}
        <div className="p-6">
          <div className="prose prose-sm max-w-none">
            {renderMarkdown(v.markdown)}
          </div>
        </div>
      </div>

      {/* Tier info */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">PR Comment Limits by Tier</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { tier: 'Free', limit: '3/mo', current: true },
            { tier: 'Founders', limit: '100/mo' },
            { tier: 'Pro', limit: 'Unlimited' },
            { tier: 'Enterprise', limit: 'Unlimited' },
            { tier: 'MSSP', limit: 'Unlimited' },
          ].map((t) => (
            <div
              key={t.tier}
              className={`rounded-lg border p-3 text-center ${
                t.current ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <p className="text-xs font-medium text-gray-500">{t.tier}</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{t.limit}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Anatomy */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Anatomy of a Compliance Comment</h2>
        <div className="space-y-4">
          {[
            { title: 'Verdict Banner', desc: 'PASS or FAIL based on your --fail-on severity threshold. Color-coded for instant visibility in PR reviews.' },
            { title: 'Severity Summary', desc: 'Emoji-coded counts for each severity level. One glance tells you the risk profile.' },
            { title: 'Auto-Triage', desc: 'Findings are automatically classified as actionable, needs review, or auto-dismissed. False positives from test files and examples are filtered out.' },
            { title: 'Findings Table', desc: 'Collapsible table showing each finding with CWE, verdict, and exact file location. Sorted by severity.' },
            { title: 'Compliance Impact', desc: 'Shows which controls across NIST 800-53, SOC 2, CMMC, FedRAMP, and ASVS are affected by the scan findings.' },
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
