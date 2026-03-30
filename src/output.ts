/**
 * Terminal Output Formatting
 *
 * Colored severity badges, summary tables, cross-framework compliance impact,
 * and exit code explanations.
 */

import type { CanonicalFinding } from './vendor/parsers/types.js';
import { mapFindingsToComplianceImpact } from './vendor/compliance/mapping/cross-framework.js';
import type { ComplianceImpactReport } from './vendor/compliance/mapping/cross-framework.js';

// ---------------------------------------------------------------------------
// ANSI Color Codes
// ---------------------------------------------------------------------------

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';
const BG_RED = '\x1b[41m';

// Detect if color is supported
const NO_COLOR = process.env['NO_COLOR'] !== undefined || process.env['TERM'] === 'dumb';

function c(code: string, text: string): string {
  return NO_COLOR ? text : `${code}${text}${RESET}`;
}

// ---------------------------------------------------------------------------
// Severity Badge
// ---------------------------------------------------------------------------

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: `${BG_RED}${WHITE}${BOLD}`,
  HIGH: `${RED}${BOLD}`,
  MEDIUM: `${YELLOW}${BOLD}`,
  LOW: `${BLUE}`,
  INFO: `${DIM}`,
};

function severityBadge(severity: string): string {
  const color = SEVERITY_COLORS[severity] ?? DIM;
  const padded = ` ${severity} `.padEnd(10);
  return c(color, padded);
}

// ---------------------------------------------------------------------------
// Format Functions
// ---------------------------------------------------------------------------

export type OutputFormat = 'table' | 'json' | 'markdown' | 'sarif';

export interface ScanSummary {
  findings: CanonicalFinding[];
  scannersRun: string[];
  depsCount?: number;
  ecosystems?: string[];
  secretsFilesScanned?: number;
  iacFilesScanned?: number;
  iacRulesPassed?: number;
  iacRulesFailed?: number;
  apiRoutesScanned?: number;
  apiRulesPassed?: number;
  apiRulesFailed?: number;
  failOnSeverity: string;
  exitCode: number;
  durationMs: number;
  activeFrameworks?: string[];
}

export function formatOutput(summary: ScanSummary, format: OutputFormat): string {
  switch (format) {
    case 'json':
      return formatJson(summary);
    case 'markdown':
      return formatMarkdown(summary);
    case 'sarif':
      return formatSarif(summary);
    case 'table':
    default:
      return formatTable(summary);
  }
}

// ---------------------------------------------------------------------------
// Build Compliance Impact (shared across formats)
// ---------------------------------------------------------------------------

function buildComplianceImpact(summary: ScanSummary): ComplianceImpactReport | null {
  if (summary.findings.length === 0) return null;

  const report = mapFindingsToComplianceImpact(summary.findings, summary.activeFrameworks);
  if (report.totalAffectedControls === 0) return null;

  return report;
}

// ---------------------------------------------------------------------------
// Table Format (default terminal output)
// ---------------------------------------------------------------------------

function formatTable(summary: ScanSummary): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(c(BOLD + CYAN, '  CVERiskPilot Scan Results'));
  lines.push(c(DIM, `  ${new Date().toISOString()}  |  ${summary.scannersRun.join(', ')}  |  ${summary.durationMs}ms`));
  lines.push('');

  // Summary stats
  const counts = countBySeverity(summary.findings);
  lines.push(c(BOLD, '  Summary'));
  lines.push(`  ${c(RED + BOLD, `${counts.CRITICAL}`)} critical  ${c(RED, `${counts.HIGH}`)} high  ${c(YELLOW, `${counts.MEDIUM}`)} medium  ${c(BLUE, `${counts.LOW}`)} low  ${c(DIM, `${counts.INFO}`)} info`);
  const verdictCounts = countByVerdict(summary.findings);
  lines.push(`  ${c(DIM, `Total: ${summary.findings.length} findings`)}  ${c(GREEN + BOLD, `${verdictCounts.TRUE_POSITIVE} actionable`)}  ${c(YELLOW, `${verdictCounts.NEEDS_REVIEW} review`)}  ${c(DIM, `${verdictCounts.FALSE_POSITIVE} auto-dismissed`)}`);
  lines.push('');

  if (summary.depsCount !== undefined) {
    lines.push(`  ${c(CYAN, 'Dependencies:')} ${summary.depsCount} packages (${summary.ecosystems?.join(', ') ?? 'none'})`);
  }
  if (summary.secretsFilesScanned !== undefined) {
    lines.push(`  ${c(CYAN, 'Secrets scan:')} ${summary.secretsFilesScanned} files scanned`);
  }
  if (summary.iacFilesScanned !== undefined) {
    lines.push(`  ${c(CYAN, 'IaC scan:')} ${summary.iacFilesScanned} files, ${summary.iacRulesPassed ?? 0} rules passed, ${summary.iacRulesFailed ?? 0} rules failed`);
  }
  lines.push('');

  // Findings table
  if (summary.findings.length > 0) {
    lines.push(c(BOLD, '  Findings'));
    lines.push(c(DIM, '  ' + '-'.repeat(100)));

    const sorted = [...summary.findings].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
    const displayLimit = 50;
    const displayed = sorted.slice(0, displayLimit);

    // Pre-compute per-finding compliance mappings
    const findingComplianceMap = new Map<CanonicalFinding, string[]>();
    const impactForFindings = buildComplianceImpact(summary);
    if (impactForFindings) {
      for (const entry of impactForFindings.entries) {
        for (const cweId of entry.affectedBy) {
          // Match findings by CWE
          const normalizedCwe = cweId.replace(/^CWE-/i, '');
          for (const f of displayed) {
            if (f.cweIds.some(c => c.replace(/^CWE-/i, '') === normalizedCwe)) {
              const existing = findingComplianceMap.get(f) ?? [];
              const tag = `${entry.framework}:${entry.controlId}`;
              if (!existing.includes(tag)) existing.push(tag);
              findingComplianceMap.set(f, existing);
            }
          }
        }
      }
    }

    for (const f of displayed) {
      const location = f.filePath ? `${f.filePath}${f.lineNumber ? `:${f.lineNumber}` : ''}` : f.packageName ?? '';
      const scanner = f.scannerType;
      const cwe = f.cweIds.length > 0 ? f.cweIds[0] : '';
      const cvss = f.cvssScore !== undefined ? c(YELLOW, ` CVSS:${f.cvssScore}`) : '';
      const verdictTag = f.verdict === 'FALSE_POSITIVE' ? c(DIM, ' [FP]')
        : f.verdict === 'NEEDS_REVIEW' ? c(YELLOW, ' [REVIEW]')
        : c(GREEN, ' [TP]');
      lines.push(
        `  ${severityBadge(f.severity)}${cvss}${verdictTag} ${c(BOLD, truncate(f.title, 45))} ${c(DIM, cwe)} ${c(DIM, truncate(location, 30))} ${c(MAGENTA, scanner)}`,
      );
      if (f.verdictReason) {
        lines.push(`  ${c(DIM, '           → ' + truncate(f.verdictReason, 90))}`);
      }
      const controls = findingComplianceMap.get(f);
      if (controls && controls.length > 0) {
        lines.push(`  ${c(CYAN, '           ⚖ ' + controls.join(', '))}`);
      }
      if (f.recommendation) {
        lines.push(`  ${c(CYAN, '           ⮑ ' + truncate(f.recommendation, 90))}`);
      }
    }

    if (summary.findings.length > displayLimit) {
      lines.push(c(DIM, `  ... and ${summary.findings.length - displayLimit} more findings`));
    }
    lines.push('');
  }

  // Cross-Framework Compliance Impact
  const impact = buildComplianceImpact(summary);
  if (impact) {
    lines.push(c(BOLD, '  Compliance Impact'));
    lines.push(c(DIM, '  ' + '-'.repeat(80)));

    for (const fw of impact.frameworkSummary) {
      lines.push(
        `  ${c(CYAN, fw.frameworkName.padEnd(22))} ${c(YELLOW, `${fw.affectedControlCount}`)} controls affected  ${c(DIM, fw.affectedControlIds.join(', '))}`,
      );
    }

    lines.push('');
    lines.push(`  ${c(DIM, `Total: ${impact.totalAffectedControls} controls affected across ${impact.frameworkSummary.length} frameworks`)}`);
    lines.push('');
  }

  // Exit code explanation
  lines.push(c(BOLD, '  Exit Status'));
  if (summary.exitCode === 0) {
    lines.push(`  ${c(GREEN + BOLD, 'PASS')} No findings at or above ${summary.failOnSeverity} severity.`);
  } else {
    const failCount = summary.findings.filter(
      (f) =>
        (f.verdict ?? 'TRUE_POSITIVE') === 'TRUE_POSITIVE' &&
        severityRank(f.severity) <= severityRank(summary.failOnSeverity),
    ).length;
    lines.push(`  ${c(RED + BOLD, 'FAIL')} ${failCount} true-positive finding(s) at or above ${summary.failOnSeverity} severity.`);
    lines.push(c(DIM, `  Exit code: ${summary.exitCode}`));
  }
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// JSON Format
// ---------------------------------------------------------------------------

function formatJson(summary: ScanSummary): string {
  const impact = buildComplianceImpact(summary);

  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      version: '0.1.7',
      scannersRun: summary.scannersRun,
      frameworks: summary.activeFrameworks ?? 'all',
      summary: countBySeverity(summary.findings),
      totalFindings: summary.findings.length,
      exitCode: summary.exitCode,
      failOnSeverity: summary.failOnSeverity,
      durationMs: summary.durationMs,
      dependencies: summary.depsCount,
      ecosystems: summary.ecosystems,
      verdictSummary: countByVerdict(summary.findings),
      findings: summary.findings.map((f) => ({
        title: f.title,
        severity: f.severity,
        verdict: f.verdict ?? 'TRUE_POSITIVE',
        verdictReason: f.verdictReason ?? '',
        scanner: f.scannerType,
        filePath: f.filePath,
        lineNumber: f.lineNumber,
        packageName: f.packageName,
        packageVersion: f.packageVersion,
        cveIds: f.cveIds,
        cweIds: f.cweIds,
        ...(f.cvssScore !== undefined && { cvssScore: f.cvssScore }),
        ...(f.cvssVector && { cvssVector: f.cvssVector }),
        ...(f.fixedVersion && { fixedVersion: f.fixedVersion }),
        ...(f.advisoryUrl && { advisoryUrl: f.advisoryUrl }),
        ...(f.recommendation && { recommendation: f.recommendation }),
      })),
      complianceImpact: impact
        ? {
            totalAffectedControls: impact.totalAffectedControls,
            frameworkSummary: impact.frameworkSummary.map((fw) => ({
              framework: fw.frameworkName,
              frameworkId: fw.frameworkId,
              affectedControls: fw.affectedControlCount,
              controlIds: fw.affectedControlIds,
            })),
            entries: impact.entries.map((e) => ({
              framework: e.framework,
              controlId: e.controlId,
              controlTitle: e.controlTitle,
              affectedBy: e.affectedBy,
            })),
          }
        : null,
    },
    null,
    2,
  );
}

// ---------------------------------------------------------------------------
// Markdown Format
// ---------------------------------------------------------------------------

function formatMarkdown(summary: ScanSummary): string {
  const lines: string[] = [];
  const counts = countBySeverity(summary.findings);

  lines.push('# CVERiskPilot Scan Results');
  lines.push('');
  lines.push(`**Date:** ${new Date().toISOString()}`);
  lines.push(`**Scanners:** ${summary.scannersRun.join(', ')}`);
  lines.push(`**Duration:** ${summary.durationMs}ms`);
  if (summary.activeFrameworks) {
    lines.push(`**Frameworks:** ${summary.activeFrameworks.join(', ')}`);
  }
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(`| Severity | Count |`);
  lines.push(`|----------|-------|`);
  lines.push(`| Critical | ${counts.CRITICAL} |`);
  lines.push(`| High | ${counts.HIGH} |`);
  lines.push(`| Medium | ${counts.MEDIUM} |`);
  lines.push(`| Low | ${counts.LOW} |`);
  lines.push(`| Info | ${counts.INFO} |`);
  lines.push(`| **Total** | **${summary.findings.length}** |`);
  lines.push('');

  if (summary.findings.length > 0) {
    const hasEnriched = summary.findings.some((f) => f.recommendation || f.fixedVersion);
    lines.push('## Findings');
    lines.push('');

    if (hasEnriched) {
      lines.push('| Severity | Verdict | Title | CWE | Location | Fix Version | Recommendation |');
      lines.push('|----------|---------|-------|-----|----------|-------------|----------------|');
    } else {
      lines.push('| Severity | Verdict | Title | CWE | Location | Scanner |');
      lines.push('|----------|---------|-------|-----|----------|---------|');
    }

    const sorted = [...summary.findings].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
    for (const f of sorted.slice(0, 100)) {
      const location = f.filePath ? `${f.filePath}${f.lineNumber ? `:${f.lineNumber}` : ''}` : f.packageName ?? '';
      const cwe = f.cweIds.length > 0 ? f.cweIds.join(', ') : '-';
      const verdict = f.verdict === 'FALSE_POSITIVE' ? 'FP' : f.verdict === 'NEEDS_REVIEW' ? 'REVIEW' : 'TP';
      if (hasEnriched) {
        const fix = f.fixedVersion ?? '-';
        const rec = f.recommendation ?? '-';
        lines.push(`| ${f.severity} | ${verdict} | ${f.title} | ${cwe} | ${location} | ${fix} | ${rec} |`);
      } else {
        lines.push(`| ${f.severity} | ${verdict} | ${f.title} | ${cwe} | ${location} | ${f.scannerType} |`);
      }
    }
    lines.push('');
  }

  // Compliance Impact
  const impact = buildComplianceImpact(summary);
  if (impact) {
    lines.push('## Compliance Impact');
    lines.push('');
    lines.push('| Framework | Affected Controls | Control IDs |');
    lines.push('|-----------|------------------|-------------|');

    for (const fw of impact.frameworkSummary) {
      lines.push(`| ${fw.frameworkName} | ${fw.affectedControlCount} | ${fw.affectedControlIds.join(', ')} |`);
    }
    lines.push('');
    lines.push(`**Total:** ${impact.totalAffectedControls} controls affected across ${impact.frameworkSummary.length} frameworks`);
    lines.push('');
  }

  lines.push('## Exit Status');
  lines.push('');
  if (summary.exitCode === 0) {
    lines.push(`**PASS** - No findings at or above ${summary.failOnSeverity} severity.`);
  } else {
    lines.push(`**FAIL** - Findings found at or above ${summary.failOnSeverity} severity.`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// SARIF 2.1.0 Format
// ---------------------------------------------------------------------------

function formatSarif(summary: ScanSummary): string {
  const rules = new Map<string, { id: string; name: string; shortDescription: string; helpUri?: string; cwes: string[] }>();

  // Build unique rules
  for (const f of summary.findings) {
    const ruleId = f.cveIds?.[0] ?? f.cweIds?.[0] ?? `crp-${f.scannerType}-${f.title.slice(0, 30).replace(/\W+/g, '-')}`;
    if (!rules.has(ruleId)) {
      rules.set(ruleId, {
        id: ruleId,
        name: f.title,
        shortDescription: f.title,
        helpUri: f.advisoryUrl,
        cwes: f.cweIds,
      });
    }
  }

  const sarifLevel = (severity: string): string => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return 'error';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
      case 'INFO':
        return 'note';
      default:
        return 'none';
    }
  };

  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'CVERiskPilot Scanner',
            version: '0.1.7',
            informationUri: 'https://cveriskpilot.com',
            rules: Array.from(rules.values()).map((r) => ({
              id: r.id,
              name: r.name,
              shortDescription: { text: r.shortDescription },
              ...(r.helpUri && { helpUri: r.helpUri }),
              properties: {
                ...(r.cwes.length > 0 && { cwe: r.cwes }),
              },
            })),
          },
        },
        results: summary.findings.map((f) => {
          const ruleId = f.cveIds?.[0] ?? f.cweIds?.[0] ?? `crp-${f.scannerType}-${f.title.slice(0, 30).replace(/\W+/g, '-')}`;
          return {
            ruleId,
            level: sarifLevel(f.severity),
            message: { text: f.title },
            locations: f.filePath
              ? [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: f.filePath },
                      ...(f.lineNumber && {
                        region: { startLine: f.lineNumber },
                      }),
                    },
                  },
                ]
              : [],
            ...(f.recommendation && {
              fixes: [{ description: { text: f.recommendation } }],
            }),
            properties: {
              severity: f.severity,
              verdict: f.verdict ?? 'TRUE_POSITIVE',
              verdictReason: f.verdictReason ?? '',
              scanner: f.scannerType,
              ...(f.packageName && { packageName: f.packageName }),
              ...(f.packageVersion && { packageVersion: f.packageVersion }),
              ...(f.cveIds.length > 0 && { cveIds: f.cveIds }),
              ...(f.cweIds.length > 0 && { cweIds: f.cweIds }),
              ...(f.cvssScore !== undefined && { cvssScore: f.cvssScore }),
              ...(f.fixedVersion && { fixedVersion: f.fixedVersion }),
              ...(f.recommendation && { recommendation: f.recommendation }),
            },
          };
        }),
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countBySeverity(findings: CanonicalFinding[]): Record<string, number> {
  const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  }
  return counts;
}

function countByVerdict(findings: CanonicalFinding[]): Record<string, number> {
  const counts: Record<string, number> = { TRUE_POSITIVE: 0, FALSE_POSITIVE: 0, NEEDS_REVIEW: 0 };
  for (const f of findings) {
    const v = f.verdict ?? 'TRUE_POSITIVE';
    counts[v] = (counts[v] ?? 0) + 1;
  }
  return counts;
}

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

export function severityRank(severity: string): number {
  const idx = SEVERITY_ORDER.indexOf(severity.toUpperCase());
  return idx >= 0 ? idx : 99;
}

function truncate(s: string, maxLen: number): string {
  return s.length > maxLen ? s.slice(0, maxLen - 3) + '...' : s;
}
