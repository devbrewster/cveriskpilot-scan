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
import { IMPLEMENTED_FRAMEWORKS } from './constants.js';

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
  /** Framework IDs that this tier has full detail access to. Undefined = all. */
  allowedFrameworks?: string[];
  /** Enrichment stats from free EPSS/KEV enrichment */
  enrichStats?: { epssEnriched: number; kevEnriched: number; kevListed: number; riskScored: number; durationMs: number };
  /** Previous scan data for --compare delta */
  previousScan?: { findings: number; timestamp: string; severityCounts: Record<string, number> } | null;
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

      // Line 1: severity + verdict + title + risk score
      const cvss = f.cvssScore !== undefined ? c(YELLOW, ` CVSS:${f.cvssScore}`) : '';
      const risk = f.riskScore !== undefined ? c(f.riskScore >= 70 ? RED : f.riskScore >= 40 ? YELLOW : BLUE, ` Risk:${f.riskScore}`) : '';
      lines.push(
        `  ${severityBadge(f.severity)}${cvss}${risk} ${verdictTag} ${c(BOLD, truncate(f.title, titleMax))}`,
      );
      // Line 2: location + CWE + scanner + EPSS + KEV
      const epssTag = f.epssPercentile !== undefined ? c(f.epssPercentile >= 90 ? RED : YELLOW, `EPSS:${f.epssPercentile.toFixed(0)}th`) : '';
      const kevTag = f.kevListed ? c(BG_RED + WHITE + BOLD, ' KEV ') : '';
      const effortTag = f.remediationEffort ? c(f.remediationEffort === 'LOW' ? GREEN : f.remediationEffort === 'HIGH' ? RED : YELLOW, `[${f.remediationEffort}]`) : '';
      lines.push(
        `  ${c(DIM, indent)}${c(DIM, truncate(location, locMax))}  ${c(DIM, cwe)}  ${c(MAGENTA, scanner)}  ${epssTag} ${kevTag} ${effortTag}`,
      );
      // Line 2b: KEV deadline alert
      if (f.kevListed && f.kevDueDate) {
        const dueDate = new Date(f.kevDueDate);
        const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const urgency = daysLeft <= 0 ? c(BG_RED + WHITE + BOLD, ' OVERDUE ') : daysLeft <= 14 ? c(RED + BOLD, `${daysLeft}d left`) : c(YELLOW, `${daysLeft}d left`);
        lines.push(
          `  ${c(DIM, indent)}${c(RED + BOLD, `⚠ CISA KEV — federal remediation deadline: ${f.kevDueDate}`)} ${urgency}`,
        );
      }
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

    // Determine which frameworks are gated for this tier
    const gatedSet = summary.allowedFrameworks
      ? new Set(summary.allowedFrameworks)
      : null; // null = all allowed

    for (const fw of impact.frameworkSummary) {
      const isGated = gatedSet !== null && !gatedSet.has(fw.frameworkId);
      const tierTag = isGated ? c(MAGENTA, ' [PRO]') : '';
      const controlsStr = isGated
        ? '' // Don't show control IDs for gated frameworks
        : fw.affectedControlIds.join(', ');
      const prefix = `${fw.frameworkName.padEnd(22)} ${fw.affectedControlCount} controls affected  `;
      const availableWidth = contentWidth - prefix.length;

      if (isGated) {
        // Gated: show framework name + count only (teaser)
        lines.push(
          `  ${c(CYAN, fw.frameworkName.padEnd(22))} ${c(YELLOW, `${fw.affectedControlCount}`)} controls affected${tierTag}`,
        );
      } else if (controlsStr.length <= availableWidth) {
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

    // Upsell for gated frameworks
    if (gatedSet !== null) {
      const gatedFrameworks = impact.frameworkSummary.filter(fw => !gatedSet.has(fw.frameworkId));
      if (gatedFrameworks.length > 0) {
        lines.push('');
        lines.push(`  ${c(MAGENTA, `Unlock ${gatedFrameworks.length} additional framework(s) with PRO → https://cveriskpilot.com/pricing`)}`);
      }
    }

    lines.push('');
    lines.push(`  ${c(DIM, `Total: ${impact.totalAffectedControls} controls affected across ${impact.frameworkSummary.length} frameworks`)}`);
    lines.push('');

    // Compliance Scorecard — show % score per framework (free, gates drill-down)
    lines.push(c(BOLD, '  Compliance Scorecard'));
    lines.push(c(DIM, '  ' + '-'.repeat(Math.min(contentWidth, 80))));
    for (const fw of impact.frameworkSummary) {
      const fwDef = IMPLEMENTED_FRAMEWORKS[fw.frameworkId];
      const totalControls = fwDef?.controls ?? fw.affectedControlCount;
      const passing = Math.max(0, totalControls - fw.affectedControlCount);
      const pct = totalControls > 0 ? Math.round((passing / totalControls) * 100) : 100;
      const barLen = 20;
      const filled = Math.round((pct / 100) * barLen);
      const bar = c(pct >= 80 ? GREEN : pct >= 50 ? YELLOW : RED,
        '\u2588'.repeat(filled) + c(DIM, '\u2591'.repeat(barLen - filled)));
      const pctStr = `${pct}%`.padStart(4);
      const pctColor = pct >= 80 ? GREEN + BOLD : pct >= 50 ? YELLOW + BOLD : RED + BOLD;
      lines.push(`  ${fw.frameworkName.padEnd(22)} ${bar} ${c(pctColor, pctStr)}  ${c(DIM, `${fw.affectedControlCount}/${totalControls} controls impacted`)}`);
    }
    lines.push('');
    lines.push(`  ${c(DIM, 'Full control drill-down + evidence tracking →')} ${c(CYAN, 'https://cveriskpilot.com/compliance')}`);
    lines.push('');
  }

  // Risk Priority Table (sorted by riskScore desc)
  const actionable = summary.findings.filter(f => (f.verdict ?? 'TRUE_POSITIVE') === 'TRUE_POSITIVE' && f.riskScore !== undefined);
  if (actionable.length > 0) {
    const ranked = [...actionable].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
    const top10 = ranked.slice(0, 10);
    lines.push(c(BOLD, '  Risk Priority'));
    lines.push(c(DIM, '  ' + '-'.repeat(Math.min(contentWidth, 80))));
    lines.push(c(DIM, `  #   Risk  Severity   EPSS         CVE              Title`));
    for (let i = 0; i < top10.length; i++) {
      const f = top10[i]!;
      const rank = `${i + 1}.`.padEnd(4);
      const riskStr = `${f.riskScore ?? '-'}`.padStart(3);
      const riskColor = (f.riskScore ?? 0) >= 70 ? RED + BOLD : (f.riskScore ?? 0) >= 40 ? YELLOW : BLUE;
      const sev = f.severity.padEnd(10);
      const epss = f.epssPercentile !== undefined ? `${f.epssPercentile.toFixed(0)}th pctl`.padEnd(12) : '—'.padEnd(12);
      const cve = (f.cveIds[0] ?? '—').padEnd(16);
      const kev = f.kevListed ? c(BG_RED + WHITE, 'KEV') + ' ' : '    ';
      lines.push(`  ${rank} ${c(riskColor, riskStr)}   ${sev} ${epss} ${kev}${cve} ${truncate(f.title, 40)}`);
    }
    if (ranked.length > 10) {
      lines.push(c(DIM, `  ... and ${ranked.length - 10} more ranked findings`));
    }
    lines.push('');
    lines.push(`  ${c(DIM, 'AI-powered triage reasoning for each finding →')} ${c(CYAN, 'https://cveriskpilot.com/ai/triage')}`);
    lines.push('');
  }

  // KEV Summary
  const kevFindings = summary.findings.filter(f => f.kevListed);
  if (kevFindings.length > 0) {
    lines.push(c(BG_RED + WHITE + BOLD, '  ⚠ CISA Known Exploited Vulnerabilities '));
    lines.push(c(DIM, '  ' + '-'.repeat(Math.min(contentWidth, 80))));
    lines.push(`  ${c(RED + BOLD, `${kevFindings.length}`)} finding(s) are on the CISA KEV catalog — federal agencies must remediate by deadline.`);
    for (const f of kevFindings.slice(0, 5)) {
      const dueDate = f.kevDueDate ? new Date(f.kevDueDate) : null;
      const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
      const deadline = dueDate ? (daysLeft !== null && daysLeft <= 0 ? c(BG_RED + WHITE, ' OVERDUE ') : daysLeft !== null && daysLeft <= 14 ? c(RED + BOLD, `${daysLeft} days`) : c(YELLOW, `${daysLeft} days`)) : '';
      lines.push(`  ${c(RED, f.cveIds[0] ?? f.title)}  ${deadline}  ${f.fixedVersion ? c(GREEN, `→ fix: ${f.fixedVersion}`) : c(RED, 'no fix available')}`);
    }
    lines.push('');
    lines.push(`  ${c(DIM, 'SLA tracking + auto-escalation →')} ${c(CYAN, 'https://cveriskpilot.com/cases')}`);
    lines.push('');
  }

  // Remediation Effort Summary
  if (summary.findings.length > 0) {
    const effortCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    for (const f of summary.findings) {
      if (f.remediationEffort && (f.verdict ?? 'TRUE_POSITIVE') === 'TRUE_POSITIVE') {
        effortCounts[f.remediationEffort]++;
      }
    }
    if (effortCounts.LOW + effortCounts.MEDIUM + effortCounts.HIGH > 0) {
      lines.push(c(BOLD, '  Remediation Effort'));
      lines.push(c(DIM, '  ' + '-'.repeat(Math.min(contentWidth, 80))));
      lines.push(`  ${c(GREEN + BOLD, `${effortCounts.LOW}`)} low effort (patch/config)  ${c(YELLOW + BOLD, `${effortCounts.MEDIUM}`)} medium (minor upgrade)  ${c(RED + BOLD, `${effortCounts.HIGH}`)} high (major/rewrite)`);
      if (effortCounts.LOW > 0) {
        lines.push(`  ${c(GREEN, `→ ${effortCounts.LOW} quick wins — start here for immediate risk reduction`)}`);
      }
      lines.push('');
      lines.push(`  ${c(DIM, 'AI remediation plans with code diffs →')} ${c(CYAN, 'https://cveriskpilot.com/ai/remediation')}`);
      lines.push('');
    }
  }

  // POAM Preview (first 2 items, gate rest behind platform)
  if (actionable.length > 0) {
    const poamItems = [...actionable].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
    const previewCount = Math.min(2, poamItems.length);
    lines.push(c(BOLD, '  POAM Preview'));
    lines.push(c(DIM, '  ' + '-'.repeat(Math.min(contentWidth, 80))));
    lines.push(c(DIM, '  #   Weakness                    Deadline        Remediation'));
    for (let i = 0; i < previewCount; i++) {
      const f = poamItems[i]!;
      const weakness = truncate(f.cweIds[0] ? `${f.cweIds[0]} ${f.title}` : f.title, 28).padEnd(28);
      const deadline = f.kevDueDate ?? (f.severity === 'CRITICAL' ? '30 days' : f.severity === 'HIGH' ? '90 days' : '180 days');
      const fix = f.fixedVersion ? `Upgrade to ${f.fixedVersion}` : f.scannerType === 'secrets' ? 'Rotate credential' : 'Remediate per CWE guidance';
      lines.push(`  ${`${i + 1}.`.padEnd(4)} ${weakness} ${deadline.padEnd(15)} ${truncate(fix, 30)}`);
    }
    if (poamItems.length > previewCount) {
      lines.push(c(DIM, `  ... ${poamItems.length - previewCount} more action items`));
    }
    lines.push('');
    lines.push(`  ${c(CYAN, 'Full POAM with evidence + auditor export →')} ${c(CYAN + BOLD, 'https://cveriskpilot.com/compliance/poam')}`);
    lines.push('');
  }

  // Scan Comparison Delta (if --compare data available)
  if (summary.previousScan) {
    const prev = summary.previousScan;
    const delta = summary.findings.length - prev.findings;
    const currentCounts = countBySeverity(summary.findings);
    lines.push(c(BOLD, '  Delta Since Last Scan'));
    lines.push(c(DIM, `  Last scan: ${prev.timestamp}`));
    const deltaStr = delta > 0 ? c(RED + BOLD, `+${delta} new`) : delta < 0 ? c(GREEN + BOLD, `${delta} resolved`) : c(DIM, 'no change');
    lines.push(`  Findings: ${prev.findings} → ${summary.findings.length} (${deltaStr})`);
    const critDelta = (currentCounts.CRITICAL ?? 0) - (prev.severityCounts?.CRITICAL ?? 0);
    const highDelta = (currentCounts.HIGH ?? 0) - (prev.severityCounts?.HIGH ?? 0);
    if (critDelta !== 0 || highDelta !== 0) {
      const critStr = critDelta > 0 ? c(RED, `+${critDelta} critical`) : critDelta < 0 ? c(GREEN, `${critDelta} critical`) : '';
      const highStr = highDelta > 0 ? c(RED, `+${highDelta} high`) : highDelta < 0 ? c(GREEN, `${highDelta} high`) : '';
      lines.push(`  ${[critStr, highStr].filter(Boolean).join('  ')}`);
    }
    lines.push('');
    lines.push(`  ${c(DIM, 'Full trend history + team dashboards →')} ${c(CYAN, 'https://cveriskpilot.com/dashboard')}`);
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

  // Platform upsell CTA — dynamic, references actual scan data
  const boxWidth = Math.min(contentWidth, 64);
  const border = '\u2500'.repeat(boxWidth - 2);
  const poamCount = actionable.length;
  const impactCta = impact;
  lines.push(c(CYAN, `  \u250C${border}\u2510`));
  lines.push(c(CYAN, `  \u2502${' '.repeat(boxWidth - 2)}\u2502`));
  lines.push(c(CYAN, `  \u2502${centerPad('Compliance Intelligence Platform', boxWidth - 2)}\u2502`));
  lines.push(c(CYAN, `  \u2502${' '.repeat(boxWidth - 2)}\u2502`));
  lines.push(c(CYAN, `  \u2502${centerPad('This scan would generate on the platform:', boxWidth - 2)}\u2502`));
  if (poamCount > 0) {
    lines.push(c(CYAN, `  \u2502${centerPad(`  \u2022 ${poamCount} POAM action items with deadlines`, boxWidth - 2)}\u2502`));
  }
  if (impactCta) {
    lines.push(c(CYAN, `  \u2502${centerPad(`  \u2022 ${impactCta.totalAffectedControls} compliance controls mapped + evidence`, boxWidth - 2)}\u2502`));
  }
  if (kevFindings.length > 0) {
    lines.push(c(CYAN, `  \u2502${centerPad(`  \u2022 ${kevFindings.length} KEV finding(s) with SLA auto-escalation`, boxWidth - 2)}\u2502`));
  }
  lines.push(c(CYAN, `  \u2502${centerPad('  \u2022 AI triage reasoning for every finding', boxWidth - 2)}\u2502`));
  lines.push(c(CYAN, `  \u2502${centerPad('  \u2022 Trend tracking + team collaboration', boxWidth - 2)}\u2502`));
  lines.push(c(CYAN, `  \u2502${' '.repeat(boxWidth - 2)}\u2502`));
  lines.push(c(CYAN, `  \u2502${centerPad('\u2192 https://cveriskpilot.com/signup?ref=cli', boxWidth - 2)}\u2502`));
  lines.push(c(CYAN, `  \u2502${centerPad('Free tier: 50 assets, 50 AI calls/month', boxWidth - 2)}\u2502`));
  lines.push(c(CYAN, `  \u2502${' '.repeat(boxWidth - 2)}\u2502`));
  lines.push(c(CYAN, `  \u2514${border}\u2518`));
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
        ...(f.epssScore !== undefined && { epssScore: f.epssScore, epssPercentile: f.epssPercentile }),
        ...(f.kevListed && { kevListed: true, kevDueDate: f.kevDueDate }),
        ...(f.riskScore !== undefined && { riskScore: f.riskScore }),
        ...(f.remediationEffort && { remediationEffort: f.remediationEffort }),
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

/** Left-pad text within a fixed-width field (left-aligned). */
function centerPad(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  return ' ' + text + ' '.repeat(width - text.length - 1);
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
