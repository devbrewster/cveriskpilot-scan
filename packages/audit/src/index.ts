#!/usr/bin/env node
import { runAudit } from './runner.js';
import { consoleReport, jsonReport } from './reporter.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const flags = process.argv.slice(2).filter((a) => a.startsWith('-'));
const rootDir = args[0] || process.cwd();
const format = flags.includes('--json') ? 'json' : 'console';

const report = await runAudit(rootDir);

if (format === 'json') {
  jsonReport(report, rootDir);
} else {
  consoleReport(report);
}

process.exit(report.summary.CRITICAL > 0 ? 1 : 0);
