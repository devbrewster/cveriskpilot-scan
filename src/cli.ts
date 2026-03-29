#!/usr/bin/env node

/**
 * CVERiskPilot CLI Scanner
 *
 * Usage:
 *   npx @cveriskpilot/scan [command] [flags]
 *
 * Commands:
 *   scan (default)       Run all enabled scanners on current directory
 *
 * Flags:
 *   --deps-only          SBOM/dependency scan only
 *   --secrets-only       Secrets scan only
 *   --iac-only           IaC scan only
 *   --frameworks <list>  Comma-separated framework IDs (aliases OK)
 *   --preset <name>      Framework preset: federal, defense, startup, devsecops, all
 *   --severity <level>   Min severity to display: CRITICAL, HIGH, MEDIUM, LOW, INFO
 *   --exclude <glob>     Exclude paths (repeatable)
 *   --exclude-cwe <id>   Exclude CWE IDs (repeatable)
 *   --format <fmt>       Output: table, json, markdown, sarif (default: table)
 *   --fail-on <sev>      Exit non-zero if findings >= severity (default: critical)
 *   --api-key <key>      Upload results to CVERiskPilot (or CRP_API_KEY env)
 *   --api-url <url>      API endpoint (or CRP_API_URL env)
 *   --no-upload          Scan locally only, don't upload
 *   --ci                 Shorthand: --format json --no-color --fail-on critical
 *   --list-frameworks    List all supported frameworks and presets
 *   --verbose            Detailed output
 *   --help               Show help
 *   --version            Show version
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { scanDependencies } from './scanners/sbom-scanner.js';
import { scanSecrets } from './scanners/secrets-scanner.js';
import { scanIaC } from './scanners/iac-scanner.js';
import { formatOutput, severityRank } from './output.js';
import type { OutputFormat, ScanSummary } from './output.js';
import type { CanonicalFinding } from './vendor/parsers/types.js';
import {
  IMPLEMENTED_FRAMEWORKS,
  FRAMEWORK_PRESETS,
  PLANNED_FRAMEWORKS,
  SEVERITY_ORDER,
  EXIT_PASS,
  EXIT_VIOLATION,
  EXIT_ERROR,
  resolveFrameworks,
  resolvePreset,
} from './constants.js';

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

const VERSION = '0.1.0';

// ---------------------------------------------------------------------------
// Argument Parsing
// ---------------------------------------------------------------------------

interface CliOptions {
  command: 'scan' | 'help' | 'version' | 'list-frameworks';
  depsOnly: boolean;
  secretsOnly: boolean;
  iacOnly: boolean;
  apiKey: string | undefined;
  apiUrl: string;
  frameworks: string[];
  preset: string | undefined;
  format: OutputFormat;
  failOn: string;
  severity: string;
  noUpload: boolean;
  verbose: boolean;
  ci: boolean;
  exclude: string[];
  excludeCwe: string[];
  targetDir: string;
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2); // skip node + script

  const opts: CliOptions = {
    command: 'scan',
    depsOnly: false,
    secretsOnly: false,
    iacOnly: false,
    apiKey: process.env['CRP_API_KEY'],
    apiUrl: process.env['CRP_API_URL'] ?? 'https://app.cveriskpilot.com',
    frameworks: [],
    preset: undefined,
    format: 'table',
    failOn: 'CRITICAL',
    severity: 'INFO',
    noUpload: false,
    verbose: false,
    ci: false,
    exclude: [],
    excludeCwe: [],
    targetDir: process.cwd(),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    switch (arg) {
      case '--help':
      case '-h':
        opts.command = 'help';
        break;
      case '--version':
      case '-v':
        opts.command = 'version';
        break;
      case '--list-frameworks':
        opts.command = 'list-frameworks';
        break;
      case '--deps-only':
        opts.depsOnly = true;
        break;
      case '--secrets-only':
        opts.secretsOnly = true;
        break;
      case '--iac-only':
        opts.iacOnly = true;
        break;
      case '--no-upload':
        opts.noUpload = true;
        break;
      case '--verbose':
        opts.verbose = true;
        break;
      case '--ci':
        opts.ci = true;
        break;
      case '--api-key':
        opts.apiKey = args[++i];
        break;
      case '--api-url':
        opts.apiUrl = args[++i] ?? opts.apiUrl;
        break;
      case '--frameworks':
        opts.frameworks = (args[++i] ?? '').split(',').filter(Boolean);
        break;
      case '--preset':
        opts.preset = args[++i];
        break;
      case '--format':
        opts.format = (args[++i] ?? 'table') as OutputFormat;
        break;
      case '--fail-on':
        opts.failOn = (args[++i] ?? 'CRITICAL').toUpperCase();
        break;
      case '--severity':
        opts.severity = (args[++i] ?? 'INFO').toUpperCase();
        break;
      case '--exclude':
        opts.exclude.push(args[++i] ?? '');
        break;
      case '--exclude-cwe': {
        const cweArg = args[++i] ?? '';
        opts.excludeCwe.push(...cweArg.split(',').filter(Boolean));
        break;
      }
      default:
        // Positional argument: target directory
        if (!arg.startsWith('-')) {
          opts.targetDir = path.resolve(arg);
        }
        break;
    }
  }

  // Apply --ci shorthand
  if (opts.ci) {
    opts.format = 'json';
    opts.failOn = 'CRITICAL';
  }

  // Normalize
  opts.failOn = opts.failOn.toUpperCase();
  opts.severity = opts.severity.toUpperCase();

  return opts;
}

// ---------------------------------------------------------------------------
// Help Text
// ---------------------------------------------------------------------------

function printHelp(): void {
  console.log(`
${bold('CVERiskPilot Scanner')} v${VERSION}
Detect vulnerabilities in dependencies, secrets, and infrastructure-as-code.
Map findings to compliance frameworks automatically.

${bold('USAGE')}
  cveriskpilot-scan [flags] [directory]

${bold('COMMANDS')}
  scan (default)       Run all enabled scanners

${bold('SCANNER FLAGS')}
  --deps-only          Run SBOM/dependency scanner only
  --secrets-only       Run secrets scanner only
  --iac-only           Run IaC scanner only

${bold('FRAMEWORK FLAGS')}
  --frameworks <list>  Comma-separated frameworks: SOC2,CMMC,FEDRAMP,NIST,ASVS,SSDF
  --preset <name>      Preset: federal, defense, startup, devsecops, all
  --list-frameworks    List all supported frameworks, aliases, and presets

${bold('FILTERING')}
  --severity <level>   Min severity to display: CRITICAL, HIGH, MEDIUM, LOW, INFO
  --exclude <glob>     Exclude paths (repeatable)
  --exclude-cwe <ids>  Exclude CWE IDs, comma-separated (repeatable)

${bold('OUTPUT FLAGS')}
  --format <fmt>       Output: table, json, markdown, sarif (default: table)
  --fail-on <sev>      Fail threshold: critical, high, medium, low (default: critical)
  --verbose            Show detailed scanner output
  --ci                 Shorthand: --format json --fail-on critical

${bold('UPLOAD FLAGS')}
  --api-key <key>      CVERiskPilot API key (or set CRP_API_KEY env)
  --api-url <url>      API endpoint (or set CRP_API_URL env)
  --no-upload          Scan locally only, don't upload results

${bold('FRAMEWORKS (6 implemented)')}
  nist-800-53          NIST 800-53 Rev 5 (39 controls)     aliases: nist, nist800
  soc2-type2           SOC 2 Type II (6 controls)           aliases: soc2, soc
  cmmc-level2          CMMC Level 2 (33 controls)           aliases: cmmc, cmmc2
  fedramp-moderate     FedRAMP Moderate (47 controls)       aliases: fedramp
  owasp-asvs           OWASP ASVS 4.0 (6 controls)         aliases: asvs, owasp
  nist-ssdf            NIST SSDF 1.1 (7 controls)           aliases: ssdf

${bold('PRESETS')}
  federal              NIST 800-53 + FedRAMP + SSDF
  defense              NIST 800-53 + CMMC + SSDF
  startup              SOC 2 + ASVS
  devsecops            ASVS + SSDF
  all                  All 6 frameworks

${bold('EXAMPLES')}
  cveriskpilot-scan                                    # Scan current dir, all frameworks
  cveriskpilot-scan --preset startup                   # SOC 2 + ASVS only
  cveriskpilot-scan --frameworks CMMC,FEDRAMP          # CMMC + FedRAMP only
  cveriskpilot-scan --deps-only --format json
  cveriskpilot-scan --severity HIGH --fail-on high ./my-project
  cveriskpilot-scan --exclude test/** --exclude docs/**
  cveriskpilot-scan --exclude-cwe CWE-79,CWE-89       # Skip XSS and SQLi findings
  cveriskpilot-scan --ci --api-key crp_xxx             # CI/CD mode + upload
`);
}

function printListFrameworks(): void {
  console.log(`
${bold('Implemented Frameworks (6)')}
`);
  for (const [id, fw] of Object.entries(IMPLEMENTED_FRAMEWORKS)) {
    console.log(`  ${id.padEnd(20)} ${fw.name.padEnd(25)} ${fw.controls} controls`);
  }

  console.log(`
${bold('Framework Presets')}
`);
  for (const [name, fws] of Object.entries(FRAMEWORK_PRESETS)) {
    console.log(`  ${name.padEnd(15)} ${fws.join(', ')}`);
  }

  console.log(`
${bold('Planned Frameworks (not yet implemented)')}
`);
  for (const [id, name] of Object.entries(PLANNED_FRAMEWORKS)) {
    console.log(`  ${id.padEnd(15)} ${name}`);
  }
  console.log('');
}

function bold(text: string): string {
  const NO_COLOR = process.env['NO_COLOR'] !== undefined;
  return NO_COLOR ? text : `\x1b[1m${text}\x1b[0m`;
}

// ---------------------------------------------------------------------------
// Project Type Detection
// ---------------------------------------------------------------------------

interface ProjectInfo {
  types: string[];
  hasPackageJson: boolean;
  hasRequirementsTxt: boolean;
  hasGoMod: boolean;
  hasCargoToml: boolean;
  hasGemfile: boolean;
  hasPomXml: boolean;
  hasBuildGradle: boolean;
  hasTerraform: boolean;
  hasDockerfile: boolean;
  hasKubernetes: boolean;
}

function detectProjectType(dir: string): ProjectInfo {
  const info: ProjectInfo = {
    types: [],
    hasPackageJson: false,
    hasRequirementsTxt: false,
    hasGoMod: false,
    hasCargoToml: false,
    hasGemfile: false,
    hasPomXml: false,
    hasBuildGradle: false,
    hasTerraform: false,
    hasDockerfile: false,
    hasKubernetes: false,
  };

  const exists = (f: string) => fs.existsSync(path.join(dir, f));

  if (exists('package.json') || exists('package-lock.json') || exists('yarn.lock') || exists('pnpm-lock.yaml')) {
    info.hasPackageJson = true;
    info.types.push('Node.js');
  }
  if (exists('requirements.txt') || exists('Pipfile') || exists('Pipfile.lock') || exists('setup.py') || exists('pyproject.toml')) {
    info.hasRequirementsTxt = true;
    info.types.push('Python');
  }
  if (exists('go.mod') || exists('go.sum')) {
    info.hasGoMod = true;
    info.types.push('Go');
  }
  if (exists('Cargo.toml') || exists('Cargo.lock')) {
    info.hasCargoToml = true;
    info.types.push('Rust');
  }
  if (exists('Gemfile') || exists('Gemfile.lock')) {
    info.hasGemfile = true;
    info.types.push('Ruby');
  }
  if (exists('pom.xml')) {
    info.hasPomXml = true;
    info.types.push('Java/Maven');
  }
  if (exists('build.gradle') || exists('build.gradle.kts')) {
    info.hasBuildGradle = true;
    info.types.push('Java/Gradle');
  }

  // Check for IaC files (shallow check)
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (entry.endsWith('.tf')) info.hasTerraform = true;
      if (entry.toLowerCase() === 'dockerfile' || entry.toLowerCase().startsWith('dockerfile.')) info.hasDockerfile = true;
    }
  } catch {
    // ignore
  }

  // Also check deploy/ and similar dirs
  const subDirs = ['deploy', 'terraform', 'infra', 'k8s', 'kubernetes', '.github'];
  for (const sub of subDirs) {
    if (exists(sub)) {
      try {
        const subEntries = fs.readdirSync(path.join(dir, sub));
        for (const entry of subEntries) {
          if (entry.endsWith('.tf')) info.hasTerraform = true;
          if (entry.toLowerCase().startsWith('dockerfile')) info.hasDockerfile = true;
          if (entry.endsWith('.yaml') || entry.endsWith('.yml')) info.hasKubernetes = true;
        }
      } catch {
        // ignore
      }
    }
  }

  if (info.hasTerraform) info.types.push('Terraform');
  if (info.hasDockerfile) info.types.push('Docker');

  return info;
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

async function uploadResults(
  findings: CanonicalFinding[],
  apiKey: string,
  apiUrl: string,
  frameworks: string[],
  verbose: boolean,
): Promise<boolean> {
  const endpoint = `${apiUrl.replace(/\/$/, '')}/api/pipeline/scan`;

  if (verbose) {
    console.log(`  Uploading ${findings.length} findings to ${endpoint}...`);
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        findings,
        frameworks,
        source: 'cli',
        version: VERSION,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`  Upload failed: ${response.status} ${response.statusText}`);
      if (verbose && body) console.error(`  Response: ${body.slice(0, 500)}`);
      return false;
    }

    if (verbose) {
      console.log(`  Upload successful (${response.status}).`);
    }
    return true;
  } catch (err) {
    console.error(`  Upload error: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

function filterFindings(
  findings: CanonicalFinding[],
  opts: { severity: string; excludeCwe: string[] },
): CanonicalFinding[] {
  const minRank = severityRank(opts.severity);

  const normalizedExcludeCwes = new Set(
    opts.excludeCwe.map((c) => c.replace(/^cwe-/i, '').trim()),
  );

  return findings.filter((f) => {
    // Severity filter: only show findings at or above the threshold
    if (severityRank(f.severity) > minRank) return false;

    // CWE exclusion
    if (normalizedExcludeCwes.size > 0 && f.cweIds.length > 0) {
      const allExcluded = f.cweIds.every((cwe) =>
        normalizedExcludeCwes.has(cwe.replace(/^cwe-/i, '')),
      );
      if (allExcluded) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);

  if (opts.command === 'help') {
    printHelp();
    process.exit(EXIT_PASS);
  }

  if (opts.command === 'version') {
    console.log(`cveriskpilot-scan v${VERSION}`);
    process.exit(EXIT_PASS);
  }

  if (opts.command === 'list-frameworks') {
    printListFrameworks();
    process.exit(EXIT_PASS);
  }

  // Validate target directory
  if (!fs.existsSync(opts.targetDir)) {
    console.error(`Error: Directory not found: ${opts.targetDir}`);
    process.exit(EXIT_ERROR);
  }

  // ---- Resolve frameworks ----
  let activeFrameworks: string[] | undefined;

  if (opts.preset) {
    const presetFrameworks = resolvePreset(opts.preset);
    if (!presetFrameworks) {
      console.error(`Error: Unknown preset "${opts.preset}". Available: ${Object.keys(FRAMEWORK_PRESETS).join(', ')}`);
      process.exit(EXIT_ERROR);
    }
    activeFrameworks = presetFrameworks;
    if (opts.verbose) {
      console.log(`  Preset "${opts.preset}": ${activeFrameworks.join(', ')}`);
    }
  }

  if (opts.frameworks.length > 0) {
    const resolution = resolveFrameworks(opts.frameworks);

    // Show warnings for planned frameworks
    for (const warn of resolution.warnings) {
      console.error(`\x1b[33m⚠ Warning: ${warn}\x1b[0m`);
    }

    // Hard error for unknown frameworks
    if (resolution.errors.length > 0) {
      for (const err of resolution.errors) {
        console.error(`\x1b[31mError: ${err}\x1b[0m`);
      }
      process.exit(EXIT_ERROR);
    }

    // Merge with preset if both specified
    if (activeFrameworks) {
      const merged = new Set([...activeFrameworks, ...resolution.resolved]);
      activeFrameworks = Array.from(merged);
    } else {
      activeFrameworks = resolution.resolved;
    }
  }

  const startTime = Date.now();
  const allFindings: CanonicalFinding[] = [];
  const scannersRun: string[] = [];

  // Detect project type
  const project = detectProjectType(opts.targetDir);

  if (opts.verbose) {
    console.log(`\n  Scanning: ${opts.targetDir}`);
    console.log(`  Detected: ${project.types.length > 0 ? project.types.join(', ') : 'unknown project type'}`);
    if (activeFrameworks) {
      const names = activeFrameworks.map((id) => IMPLEMENTED_FRAMEWORKS[id]?.name ?? id);
      console.log(`  Frameworks: ${names.join(', ')}`);
    } else {
      console.log(`  Frameworks: all (6)`);
    }
    console.log('');
  }

  // Determine which scanners to run
  const runAll = !opts.depsOnly && !opts.secretsOnly && !opts.iacOnly;
  const runDeps = runAll || opts.depsOnly;
  const runSecrets = runAll || opts.secretsOnly;
  const runIaC = runAll || opts.iacOnly;

  // ---- Run scanners in parallel ----
  const scanPromises: Promise<void>[] = [];

  // SBOM / Dependency Scan
  let depsCount: number | undefined;
  let ecosystems: string[] | undefined;

  if (runDeps) {
    scanPromises.push(
      (async () => {
        if (opts.verbose) console.log('  Running dependency scanner...');
        try {
          const result = await scanDependencies(opts.targetDir);
          allFindings.push(...result.findings);
          scannersRun.push('sbom');
          depsCount = result.dependencies.length;
          ecosystems = result.ecosystems;
          if (opts.verbose) {
            console.log(`    Found ${result.dependencies.length} dependencies across ${result.ecosystems.join(', ') || 'no'} ecosystems`);
            console.log(`    ${result.findings.length} vulnerable dependencies detected`);
          }
        } catch (err) {
          if (opts.verbose) console.error(`    Dependency scan error: ${err instanceof Error ? err.message : String(err)}`);
        }
      })(),
    );
  }

  // Secrets Scan
  let secretsFilesScanned: number | undefined;

  if (runSecrets) {
    scanPromises.push(
      (async () => {
        if (opts.verbose) console.log('  Running secrets scanner...');
        try {
          const result = await scanSecrets(opts.targetDir, { exclude: opts.exclude });
          allFindings.push(...result.findings);
          scannersRun.push('secrets');
          secretsFilesScanned = result.filesScanned;
          if (opts.verbose) {
            console.log(`    Scanned ${result.filesScanned} files (${result.filesSkipped} skipped)`);
            console.log(`    ${result.findings.length} secrets detected`);
          }
        } catch (err) {
          if (opts.verbose) console.error(`    Secrets scan error: ${err instanceof Error ? err.message : String(err)}`);
        }
      })(),
    );
  }

  // IaC Scan
  let iacFilesScanned: number | undefined;
  let iacRulesPassed: number | undefined;
  let iacRulesFailed: number | undefined;

  if (runIaC) {
    scanPromises.push(
      (async () => {
        if (opts.verbose) console.log('  Running IaC scanner...');
        try {
          const result = await scanIaC(opts.targetDir, { exclude: opts.exclude });
          allFindings.push(...result.findings);
          scannersRun.push('iac');
          iacFilesScanned = result.filesScanned;
          iacRulesPassed = result.rulesPassed;
          iacRulesFailed = result.rulesFailed;
          if (opts.verbose) {
            console.log(`    Scanned ${result.filesScanned} IaC files`);
            console.log(`    ${result.rulesFailed} rules failed, ${result.rulesPassed} rules passed`);
            console.log(`    ${result.findings.length} violations found`);
          }
        } catch (err) {
          if (opts.verbose) console.error(`    IaC scan error: ${err instanceof Error ? err.message : String(err)}`);
        }
      })(),
    );
  }

  // Wait for all scanners
  await Promise.all(scanPromises);

  const durationMs = Date.now() - startTime;

  // ---- Apply filters ----
  const filteredFindings = filterFindings(allFindings, {
    severity: opts.severity,
    excludeCwe: opts.excludeCwe,
  });

  if (opts.verbose && filteredFindings.length !== allFindings.length) {
    console.log(`  Filtered: ${allFindings.length} → ${filteredFindings.length} findings`);
    console.log('');
  }

  // ---- Determine exit code ----
  const failThreshold = opts.failOn;
  const hasFailure = filteredFindings.some(
    (f) => severityRank(f.severity) <= severityRank(failThreshold),
  );
  const exitCode = hasFailure ? EXIT_VIOLATION : EXIT_PASS;

  // ---- Format and display results ----
  const summary: ScanSummary = {
    findings: filteredFindings,
    scannersRun,
    depsCount,
    ecosystems,
    secretsFilesScanned,
    iacFilesScanned,
    iacRulesPassed,
    iacRulesFailed,
    failOnSeverity: failThreshold,
    exitCode,
    durationMs,
    activeFrameworks,
  };

  const output = formatOutput(summary, opts.format);
  console.log(output);

  // ---- Upload if API key provided ----
  if (opts.apiKey && !opts.noUpload && filteredFindings.length > 0) {
    await uploadResults(filteredFindings, opts.apiKey, opts.apiUrl, activeFrameworks ?? [], opts.verbose);
  }

  process.exit(exitCode);
}

// Run
main().catch((err) => {
  console.error(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(EXIT_ERROR);
});
