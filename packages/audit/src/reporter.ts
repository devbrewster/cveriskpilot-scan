import fs from 'node:fs';
import path from 'node:path';
import type { AuditReport, Severity } from './types.js';

const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: '\x1b[41m\x1b[97m',  // White on red bg
  HIGH: '\x1b[91m',               // Bright red
  MEDIUM: '\x1b[93m',             // Yellow
  LOW: '\x1b[96m',                // Cyan
  INFO: '\x1b[90m',               // Gray
};

const SEVERITY_ICONS: Record<Severity, string> = {
  CRITICAL: '[!!]',
  HIGH: '[!]',
  MEDIUM: '[~]',
  LOW: '[.]',
  INFO: '[i]',
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function colorize(severity: Severity, text: string): string {
  return `${SEVERITY_COLORS[severity]}${text}${RESET}`;
}

export function consoleReport(report: AuditReport): void {
  console.log();
  console.log(`${BOLD}CVERiskPilot Deep Audit Report${RESET}`);
  console.log(`${DIM}Timestamp: ${report.timestamp}${RESET}`);
  console.log(`${DIM}Duration:  ${report.duration_ms}ms${RESET}`);
  console.log();

  // Summary bar
  const summaryParts = (
    ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as Severity[]
  )
    .filter((s) => report.summary[s] > 0)
    .map((s) => colorize(s, `${s}: ${report.summary[s]}`));

  console.log(
    `${BOLD}Total findings: ${report.totalFindings}${RESET}  ${summaryParts.join('  ')}`,
  );
  console.log();

  // Group findings by check
  for (const check of report.checks) {
    if (check.findings.length === 0) {
      console.log(`${DIM}  [pass] ${check.name} (${check.duration_ms}ms)${RESET}`);
      continue;
    }

    console.log(
      `${BOLD}  ${check.name}${RESET} ${DIM}(${check.findings.length} findings, ${check.duration_ms}ms)${RESET}`,
    );

    for (const f of check.findings) {
      const icon = colorize(f.severity, SEVERITY_ICONS[f.severity]);
      const loc = f.line ? `${f.file}:${f.line}` : f.file;
      console.log(`    ${icon} ${colorize(f.severity, f.severity.padEnd(8))} ${f.title}`);
      console.log(`${DIM}         ${loc}${RESET}`);
      if (f.fix) {
        console.log(`${DIM}         Fix: ${f.fix}${RESET}`);
      }
    }
    console.log();
  }

  // Exit status hint
  if (report.summary.CRITICAL > 0) {
    console.log(
      colorize('CRITICAL', `\n  ${report.summary.CRITICAL} CRITICAL finding(s) — exit code 1\n`),
    );
  } else {
    console.log(`${DIM}\n  No CRITICAL findings — exit code 0\n${RESET}`);
  }
}

export function jsonReport(report: AuditReport, rootDir: string): void {
  const outPath = path.join(rootDir, 'audit-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Audit report written to ${outPath}`);
  console.log(`Total findings: ${report.totalFindings}`);
  for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as Severity[]) {
    if (report.summary[sev] > 0) {
      console.log(`  ${sev}: ${report.summary[sev]}`);
    }
  }
}
