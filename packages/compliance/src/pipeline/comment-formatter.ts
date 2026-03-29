// ---------------------------------------------------------------------------
// PR / MR Compliance Comment Formatter
// ---------------------------------------------------------------------------
// Produces GitHub-flavored and GitLab-flavored markdown comments from
// pipeline scan results. Used by the GitHub Action, GitLab CI template,
// and the /api/pipeline/scan endpoint to generate pre-formatted comments.
// ---------------------------------------------------------------------------

/** Severity levels in priority order. */
export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

/** A compliance control affected by one or more findings. */
export interface AffectedControl {
  framework: string;
  controlId: string;
  title: string;
  cwes: string[];
}

/** A POAM entry created from the scan. */
export interface PipelinePOAMEntry {
  poamId: string;
  weakness: string;
  controlId: string;
  dueDate: string; // ISO date
}

/** Severity counts keyed by level. */
export interface SeveritySummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

/** Policy configuration that determined the verdict. */
export interface PolicyConfig {
  blockingSeverities: FindingSeverity[];
  frameworks: string[];
}

/** Full scan result returned by POST /api/pipeline/scan. */
export interface PipelineScanResult {
  verdict: 'PASS' | 'FAIL' | 'WARN';
  scanId: string;
  dashboardUrl: string;
  summary: {
    totalFindings: number;
    severity: SeveritySummary;
  };
  affectedControls: AffectedControl[];
  poamEntries: PipelinePOAMEntry[];
  policy: PolicyConfig;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_ICONS: Record<string, string> = {
  critical: '\u{1F534}', // red circle
  high: '\u{1F7E0}',     // orange circle
  medium: '\u{1F7E1}',   // yellow circle
  low: '\u{1F535}',      // blue circle
  info: '\u26AA',        // white circle
};

const VERDICT_ICONS: Record<string, string> = {
  PASS: '\u2705',  // green check
  FAIL: '\u274C',  // red X
  WARN: '\u26A0\uFE0F', // warning
};

function severityLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function formatSeverityTable(severity: SeveritySummary): string {
  const rows = (['critical', 'high', 'medium', 'low', 'info'] as const)
    .filter((key) => severity[key] > 0)
    .map((key) => `| ${SEVERITY_ICONS[key]} ${severityLabel(key)} | ${severity[key]} |`);

  if (rows.length === 0) return '';

  return [
    '### Severity Summary',
    '| Severity | Count |',
    '|----------|-------|',
    ...rows,
  ].join('\n');
}

function formatControlsTable(controls: AffectedControl[]): string {
  if (controls.length === 0) return '';

  const rows = controls.map(
    (c) => `| ${c.framework} | ${c.controlId} | ${c.title} | ${c.cwes.join(', ')} |`,
  );

  return [
    '### Affected Compliance Controls',
    '| Framework | Control | Title | CWEs |',
    '|-----------|---------|-------|------|',
    ...rows,
  ].join('\n');
}

function formatPOAMTable(entries: PipelinePOAMEntry[]): string {
  if (entries.length === 0) return '';

  const rows = entries.map(
    (e) => `| ${e.poamId} | ${e.weakness} | ${e.controlId} | ${e.dueDate} |`,
  );

  return [
    `### New POAM Entries Created: ${entries.length}`,
    '| POAM ID | Weakness | Control | Due Date |',
    '|---------|----------|---------|----------|',
    ...rows,
  ].join('\n');
}

function formatPolicy(policy: PolicyConfig): string {
  const lines = ['### Policy'];
  if (policy.blockingSeverities.length > 0) {
    lines.push(`- Blocking on: ${policy.blockingSeverities.join(', ')} severity`);
  }
  if (policy.frameworks.length > 0) {
    lines.push(`- Frameworks enforced: ${policy.frameworks.join(', ')}`);
  }
  return lines.join('\n');
}

function formatCongratsMessage(): string {
  return [
    '### No Findings',
    '',
    'No vulnerabilities were detected in this scan. All compliance controls are unaffected.',
  ].join('\n');
}

// ── Core formatter ───────────────────────────────────────────────────────────

function formatCommentBody(result: PipelineScanResult): string[] {
  const { verdict, dashboardUrl, summary, affectedControls, poamEntries, policy } = result;
  const icon = VERDICT_ICONS[verdict] ?? '';

  const sections: string[] = [
    `## \u{1F6E1}\uFE0F CVERiskPilot Compliance Scan`,
    '',
    `**Verdict**: ${icon} ${verdict}`,
    '',
  ];

  if (summary.totalFindings === 0) {
    sections.push(formatCongratsMessage());
  } else {
    const severityTable = formatSeverityTable(summary.severity);
    if (severityTable) {
      sections.push(severityTable);
    }

    const controlsTable = formatControlsTable(affectedControls);
    if (controlsTable) {
      sections.push('');
      sections.push(controlsTable);
    }

    const poamTable = formatPOAMTable(poamEntries);
    if (poamTable) {
      sections.push('');
      sections.push(poamTable);
    }
  }

  const policySection = formatPolicy(policy);
  if (policySection) {
    sections.push('');
    sections.push(policySection);
  }

  if (dashboardUrl) {
    sections.push('');
    sections.push(
      `[\u{1F4CA} View Full Results on Dashboard](${dashboardUrl})`,
    );
  }

  return sections;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Format a pipeline scan result as a GitHub-flavored markdown comment.
 * Compatible with GitHub Issues / PR comments API.
 */
export function formatGitHubComment(result: PipelineScanResult): string {
  const sections = formatCommentBody(result);

  sections.push('');
  sections.push('---');
  sections.push(
    '*Generated by [CVERiskPilot](https://cveriskpilot.com) — Veteran-Owned Vulnerability Management*',
  );

  return sections.join('\n');
}

/**
 * Format a pipeline scan result as a GitLab-flavored markdown comment.
 * Compatible with GitLab MR Notes API.
 *
 * GitLab markdown is largely identical to GitHub-flavored markdown.
 * This function exists as a separate export for future divergence
 * (e.g., GitLab-specific collapse sections, badges, or emoji shortcodes).
 */
export function formatGitLabComment(result: PipelineScanResult): string {
  const sections = formatCommentBody(result);

  // GitLab supports collapsible sections — wrap controls table if large
  if (result.affectedControls.length > 10) {
    const controlsHeader = '### Affected Compliance Controls';
    const joined = sections.join('\n');
    const controlsStart = joined.indexOf(controlsHeader);
    if (controlsStart !== -1) {
      const controlsEnd = joined.indexOf('\n### ', controlsStart + controlsHeader.length);
      const controlsBlock =
        controlsEnd === -1
          ? joined.slice(controlsStart)
          : joined.slice(controlsStart, controlsEnd);

      const collapsed = [
        '<details>',
        `<summary>Affected Compliance Controls (${result.affectedControls.length})</summary>`,
        '',
        controlsBlock.replace(controlsHeader, '').trim(),
        '',
        '</details>',
      ].join('\n');

      const before = joined.slice(0, controlsStart);
      const after = controlsEnd === -1 ? '' : joined.slice(controlsEnd);
      const rebuilt = before + collapsed + after;

      return (
        rebuilt +
        '\n\n---\n*Generated by [CVERiskPilot](https://cveriskpilot.com) — Veteran-Owned Vulnerability Management*'
      );
    }
  }

  sections.push('');
  sections.push('---');
  sections.push(
    '*Generated by [CVERiskPilot](https://cveriskpilot.com) — Veteran-Owned Vulnerability Management*',
  );

  return sections.join('\n');
}
