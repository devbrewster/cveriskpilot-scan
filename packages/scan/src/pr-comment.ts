/**
 * PR Comment Formatter
 *
 * Takes crp-scan JSON output and produces GitHub-flavored markdown
 * suitable for posting as a PR comment.
 */

export interface ScanJsonOutput {
  timestamp: string;
  scannersRun: string[];
  frameworks: string[] | string;
  summary: Record<string, number>;
  totalFindings: number;
  exitCode: number;
  failOnSeverity: string;
  durationMs: number;
  dependencies?: number;
  ecosystems?: string[];
  verdictSummary: Record<string, number>;
  findings: Array<{
    title: string;
    severity: string;
    verdict: string;
    verdictReason: string;
    scanner: string;
    filePath?: string;
    lineNumber?: number;
    packageName?: string;
    packageVersion?: string;
    cveIds: string[];
    cweIds: string[];
  }>;
  complianceImpact: {
    totalAffectedControls: number;
    frameworkSummary: Array<{
      framework: string;
      frameworkId: string;
      affectedControls: number;
      controlIds: string[];
    }>;
  } | null;
}

const SEVERITY_EMOJI: Record<string, string> = {
  CRITICAL: '\u{1F534}',
  HIGH: '\u{1F7E0}',
  MEDIUM: '\u{1F7E1}',
  LOW: '\u{1F535}',
  INFO: '\u{26AA}',
};

const VERDICT_LABEL: Record<string, string> = {
  TRUE_POSITIVE: 'Actionable',
  NEEDS_REVIEW: 'Needs Review',
  FALSE_POSITIVE: 'Auto-Dismissed',
};

export function formatPrComment(scan: ScanJsonOutput): string {
  const lines: string[] = [];
  const s = scan.summary;
  const v = scan.verdictSummary;
  const passed = scan.exitCode === 0;

  // Header
  lines.push(`## ${passed ? '\u{2705}' : '\u{274C}'} CVERiskPilot Compliance Scan`);
  lines.push('');

  // Verdict banner
  if (passed) {
    lines.push(`> **PASS** \u{2014} No findings at or above **${scan.failOnSeverity}** severity.`);
  } else {
    const failCount = scan.findings.filter(
      (f) => severityRank(f.severity) <= severityRank(scan.failOnSeverity) && f.verdict !== 'FALSE_POSITIVE',
    ).length;
    lines.push(`> **FAIL** \u{2014} ${failCount} finding(s) at or above **${scan.failOnSeverity}** severity.`);
  }
  lines.push('');

  // Summary badges
  lines.push(
    `${SEVERITY_EMOJI['CRITICAL']} **${s['CRITICAL'] ?? 0}** Critical \u{00A0}\u{00A0} ` +
    `${SEVERITY_EMOJI['HIGH']} **${s['HIGH'] ?? 0}** High \u{00A0}\u{00A0} ` +
    `${SEVERITY_EMOJI['MEDIUM']} **${s['MEDIUM'] ?? 0}** Medium \u{00A0}\u{00A0} ` +
    `${SEVERITY_EMOJI['LOW']} **${s['LOW'] ?? 0}** Low \u{00A0}\u{00A0} ` +
    `${SEVERITY_EMOJI['INFO']} **${s['INFO'] ?? 0}** Info`,
  );
  lines.push('');

  // Triage summary
  lines.push(
    `**Triage:** ${v['TRUE_POSITIVE'] ?? 0} actionable \u{00B7} ` +
    `${v['NEEDS_REVIEW'] ?? 0} needs review \u{00B7} ` +
    `${v['FALSE_POSITIVE'] ?? 0} auto-dismissed`,
  );
  lines.push('');

  // Scanner stats
  const stats: string[] = [];
  if (scan.dependencies) {
    stats.push(`${scan.dependencies} dependencies (${(scan.ecosystems ?? []).join(', ')})`);
  }
  stats.push(`Scanners: ${scan.scannersRun.join(', ')}`);
  stats.push(`Duration: ${scan.durationMs}ms`);
  lines.push(`<sub>${stats.join(' \u{00B7} ')}</sub>`);
  lines.push('');

  // Findings table (actionable + review only, limit 25)
  const actionable = scan.findings
    .filter((f) => f.verdict !== 'FALSE_POSITIVE')
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  if (actionable.length > 0) {
    lines.push('<details>');
    lines.push(`<summary><strong>\u{1F50D} ${actionable.length} Findings Requiring Attention</strong></summary>`);
    lines.push('');
    lines.push('| Severity | Verdict | Finding | CWE | Location |');
    lines.push('|----------|---------|---------|-----|----------|');

    const display = actionable.slice(0, 25);
    for (const f of display) {
      const sev = `${SEVERITY_EMOJI[f.severity] ?? ''} ${f.severity}`;
      const verdict = f.verdict === 'NEEDS_REVIEW' ? '\u{1F7E1} Review' : '\u{1F534} TP';
      const cwe = f.cweIds.length > 0 ? f.cweIds[0] : '-';
      const loc = f.filePath
        ? `\`${f.filePath}${f.lineNumber ? `:${f.lineNumber}` : ''}\``
        : f.packageName
          ? `\`${f.packageName}${f.packageVersion ? `@${f.packageVersion}` : ''}\``
          : '-';
      lines.push(`| ${sev} | ${verdict} | ${f.title} | ${cwe} | ${loc} |`);
    }

    if (actionable.length > 25) {
      lines.push('');
      lines.push(`*... and ${actionable.length - 25} more findings*`);
    }

    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  // Compliance impact
  if (scan.complianceImpact && scan.complianceImpact.totalAffectedControls > 0) {
    lines.push('<details>');
    lines.push(`<summary><strong>\u{1F3DB}\u{FE0F} Compliance Impact \u{2014} ${scan.complianceImpact.totalAffectedControls} controls affected</strong></summary>`);
    lines.push('');
    lines.push('| Framework | Controls Affected | Control IDs |');
    lines.push('|-----------|:-----------------:|-------------|');

    for (const fw of scan.complianceImpact.frameworkSummary) {
      const ids = fw.controlIds.length > 5
        ? fw.controlIds.slice(0, 5).join(', ') + ` (+${fw.controlIds.length - 5} more)`
        : fw.controlIds.join(', ');
      lines.push(`| **${fw.framework}** | ${fw.affectedControls} | ${ids} |`);
    }

    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(
    '<sub>\u{1F6E1}\u{FE0F} Scanned by <a href="https://cveriskpilot.com">CVERiskPilot</a> ' +
    '\u{00B7} <a href="https://www.npmjs.com/package/@cveriskpilot/scan">CLI</a> ' +
    '\u{00B7} <a href="https://cveriskpilot.com/docs/pipeline">Setup Guide</a></sub>',
  );

  return lines.join('\n');
}

function severityRank(severity: string): number {
  const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  const idx = order.indexOf(severity.toUpperCase());
  return idx >= 0 ? idx : 99;
}
