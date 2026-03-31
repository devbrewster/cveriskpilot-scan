/**
 * Terminal Output Formatting
 *
 * Colored severity badges, summary tables, cross-framework compliance impact,
 * and exit code explanations.
 */

import { createRequire } from 'node:module';
import type { CanonicalFinding } from './vendor/parsers/types.js';
import { mapFindingsToComplianceImpact } from './vendor/compliance/mapping/cross-framework.js';
import type { ComplianceImpactReport } from './vendor/compliance/mapping/cross-framework.js';
import type { AiEnrichmentResult } from './ai/types.js';

const __require = createRequire(import.meta.url);
const PKG_VERSION: string = (__require('../package.json') as { version: string }).version;

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
  aiResult?: AiEnrichmentResult;
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
  // Detect terminal width: TTY columns → COLUMNS env → default 80
  const termWidth = process.stdout.columns
    || (process.env['COLUMNS'] ? parseInt(process.env['COLUMNS'], 10) : 0)
    || 80;
  const indent = '           ';  // 11 chars to align under title
  const contentWidth = termWidth - 4; // 2-char left margin + 2 safety

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
    lines.push(c(DIM, '  ' + '-'.repeat(Math.min(contentWidth, 100))));

    const sorted = [...summary.findings].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
    const displayLimit = 50;
    const displayed = sorted.slice(0, displayLimit);

    // Pre-compute per-finding compliance mappings
    const findingComplianceMap = new Map<CanonicalFinding, string[]>();
    const impactForFindings = buildComplianceImpact(summary);
    if (impactForFindings) {
      for (const entry of impactForFindings.entries) {
        for (const cweId of entry.affectedBy) {
          const normalizedCwe = cweId.replace(/^CWE-/i, '');
          for (const f of displayed) {
            if (f.cweIds.some(id => id.replace(/^CWE-/i, '') === normalizedCwe)) {
              const existing = findingComplianceMap.get(f) ?? [];
              const tag = `${entry.framework}:${entry.controlId}`;
              if (!existing.includes(tag)) existing.push(tag);
              findingComplianceMap.set(f, existing);
            }
          }
        }
      }
    }

    // Dynamic truncation widths based on terminal
    const titleMax = Math.max(25, Math.min(50, contentWidth - 45));
    const locMax = Math.max(15, Math.min(35, contentWidth - titleMax - 30));
    const detailMax = contentWidth - indent.length - 4;  // for → / ⚖ / ⮑ prefix

    for (const f of displayed) {
      const location = f.filePath ? `${f.filePath}${f.lineNumber ? `:${f.lineNumber}` : ''}` : f.packageName ?? '';
      const scanner = f.scannerType;
      const cwe = f.cweIds.length > 0 ? f.cweIds[0] : '';
      const verdictTag = f.verdict === 'FALSE_POSITIVE' ? c(DIM, '[FP]')
        : f.verdict === 'NEEDS_REVIEW' ? c(YELLOW, '[REVIEW]')
        : c(GREEN, '[TP]');

      // Line 1: severity + verdict + title
      const cvss = f.cvssScore !== undefined ? c(YELLOW, ` CVSS:${f.cvssScore}`) : '';
      lines.push(
        `  ${severityBadge(f.severity)}${cvss} ${verdictTag} ${c(BOLD, truncate(f.title, titleMax))}`,
      );
      // Line 2: location + CWE + scanner
      lines.push(
        `  ${c(DIM, indent)}${c(DIM, truncate(location, locMax))}  ${c(DIM, cwe)}  ${c(MAGENTA, scanner)}`,
      );
      // Line 3: verdict reason (wrapped)
      if (f.verdictReason) {
        wrapText(`→ ${f.verdictReason}`, detailMax).forEach(line =>
          lines.push(`  ${c(DIM, indent + line)}`),
        );
      }
      // Line 4+: compliance controls (wrapped)
      const controls = findingComplianceMap.get(f);
      if (controls && controls.length > 0) {
        wrapText(`⚖ ${controls.join(', ')}`, detailMax).forEach(line =>
          lines.push(`  ${c(CYAN, indent + line)}`),
        );
      }
      // Line 5: recommendation (wrapped)
      if (f.recommendation) {
        wrapText(`⮑ ${f.recommendation}`, detailMax).forEach(line =>
          lines.push(`  ${c(CYAN, indent + line)}`),
        );
      }
      // Line 6: AI remediation (inline per-finding)
      const findingIdx = summary.findings.indexOf(f);
      if (summary.aiResult?.remediations.has(findingIdx)) {
        wrapText(`→ AI: ${summary.aiResult.remediations.get(findingIdx)!}`, detailMax).forEach(line =>
          lines.push(`  ${c(GREEN, indent + line)}`),
        );
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
    lines.push(c(DIM, '  ' + '-'.repeat(Math.min(contentWidth, 80))));

    for (const fw of impact.frameworkSummary) {
      const prefix = `${fw.frameworkName.padEnd(22)} ${fw.affectedControlCount} controls affected  `;
      const controlsStr = fw.affectedControlIds.join(', ');
      const availableWidth = contentWidth - prefix.length;
      if (controlsStr.length <= availableWidth) {
        lines.push(
          `  ${c(CYAN, fw.frameworkName.padEnd(22))} ${c(YELLOW, `${fw.affectedControlCount}`)} controls affected  ${c(DIM, controlsStr)}`,
        );
      } else {
        lines.push(
          `  ${c(CYAN, fw.frameworkName.padEnd(22))} ${c(YELLOW, `${fw.affectedControlCount}`)} controls affected`,
        );
        const wrapIndent = '                          ';
        wrapText(controlsStr, contentWidth - wrapIndent.length).forEach(line =>
          lines.push(`  ${c(DIM, wrapIndent + line)}`),
        );
      }
    }

    lines.push('');
    lines.push(`  ${c(DIM, `Total: ${impact.totalAffectedControls} controls affected across ${impact.frameworkSummary.length} frameworks`)}`);
    lines.push('');
  }

  // AI Enrichment (if available)
  if (summary.aiResult) {
    const ai = summary.aiResult;
    lines.push(c(BOLD + CYAN, '  AI Risk Assessment'));
    lines.push(c(DIM, '  ' + '\u2500'.repeat(Math.min(contentWidth, 80))));
    lines.push(c(DIM, `  Generated locally via offline LLM in ${ai.durationMs}ms. No data sent externally.`));
    lines.push('');

    if (ai.riskSummary) {
      wrapText(ai.riskSummary, contentWidth - 4).forEach(line =>
        lines.push(`  ${line}`),
      );
      lines.push('');
    }

    if (ai.remediations.size > 0) {
      lines.push(c(BOLD, '  AI Remediations'));
      for (const [idx, text] of ai.remediations) {
        const finding = summary.findings[idx];
        const label = finding ? finding.title.slice(0, 60) : `Finding #${idx}`;
        lines.push(`  ${c(YELLOW, `[${idx}]`)} ${label}`);
        wrapText(`    ${text}`, contentWidth - 4).forEach(line =>
          lines.push(`  ${line}`),
        );
      }
      lines.push('');
    }

    if (ai.priorityOrder.length > 0) {
      lines.push(c(BOLD, '  Remediation Priority'));
      ai.priorityOrder.forEach((idx, rank) => {
        const finding = summary.findings[idx];
        const label = finding ? `${finding.severity} — ${finding.title.slice(0, 50)}` : `Finding #${idx}`;
        lines.push(`  ${c(CYAN, `${rank + 1}.`)} ${label}`);
      });
      lines.push('');
    }

    if (ai.errors.length > 0) {
      lines.push(c(DIM, `  AI warnings: ${ai.errors.join('; ')}`));
      lines.push('');
    }
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
      version: PKG_VERSION,
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
      findings: summary.findings.map((f, idx) => ({
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
        ...(summary.aiResult?.remediations.has(idx) && { aiRemediation: summary.aiResult.remediations.get(idx) }),
      })),
      ...(summary.aiResult?.riskSummary ? { aiRiskSummary: summary.aiResult.riskSummary } : {}),
      ...(summary.aiResult && summary.aiResult.priorityOrder.length > 0 ? { aiPriorityOrder: summary.aiResult.priorityOrder } : {}),
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
      ...(summary.aiResult
        ? {
            aiAnalysis: {
              durationMs: summary.aiResult.durationMs,
              riskSummary: summary.aiResult.riskSummary || undefined,
              remediations: Object.fromEntries(summary.aiResult.remediations),
              priorityOrder: summary.aiResult.priorityOrder,
              errors: summary.aiResult.errors.length > 0 ? summary.aiResult.errors : undefined,
            },
          }
        : {}),
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

  // AI Risk Assessment
  if (summary.aiResult) {
    const ai = summary.aiResult;
    lines.push('## AI Risk Assessment');
    lines.push('');
    lines.push(`> Generated locally via offline LLM in ${ai.durationMs}ms. No data sent externally.`);
    lines.push('');

    if (ai.riskSummary) {
      lines.push(ai.riskSummary);
      lines.push('');
    }

    if (ai.remediations.size > 0) {
      lines.push('### Remediations');
      lines.push('');
      for (const [idx, text] of ai.remediations) {
        const finding = summary.findings[idx];
        const label = finding ? finding.title : `Finding #${idx}`;
        lines.push(`- **${label}**: ${text}`);
      }
      lines.push('');
    }

    if (ai.priorityOrder.length > 0) {
      lines.push('### Remediation Priority');
      lines.push('');
      ai.priorityOrder.forEach((idx, rank) => {
        const finding = summary.findings[idx];
        const label = finding ? `${finding.severity} — ${finding.title}` : `Finding #${idx}`;
        lines.push(`${rank + 1}. ${label}`);
      });
      lines.push('');
    }
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
            version: PKG_VERSION,
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

/** Wrap text to fit within maxLen, breaking at commas or spaces. */
function wrapText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const wrapped: string[] = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    // Prefer breaking at ", " boundary
    let breakAt = remaining.lastIndexOf(', ', maxLen);
    if (breakAt > 0) {
      breakAt += 2; // include the ", "
    } else {
      // Fall back to space
      breakAt = remaining.lastIndexOf(' ', maxLen);
    }
    if (breakAt <= 0) breakAt = maxLen; // no good break point, hard break
    wrapped.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt);
  }
  if (remaining.length > 0) wrapped.push(remaining);
  return wrapped;
}
