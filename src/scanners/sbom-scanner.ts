/**
 * SBOM Generation + Supply Chain Compliance Scanner
 *
 * Detects package managers, parses lock files, generates CycloneDX SBOM,
 * and cross-references dependencies against known vulnerability advisory data.
 * Maps findings to SSDF practices: PO.1, PS.1, PW.4
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import type { CanonicalFinding, FindingVerdict } from '../vendor/parsers/types.js';

const __require = createRequire(import.meta.url);
const VERSION: string = (__require('../../package.json') as { version: string }).version;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Dependency {
  name: string;
  version: string;
  ecosystem: string;
  direct: boolean;
}

export interface CycloneDxBom {
  bomFormat: 'CycloneDX';
  specVersion: '1.5';
  version: 1;
  metadata: {
    timestamp: string;
    tools: { vendor: string; name: string; version: string }[];
    component?: { type: string; name: string; version: string };
  };
  components: CycloneDxComponent[];
}

export interface CycloneDxComponent {
  type: 'library';
  name: string;
  version: string;
  purl: string;
  scope?: 'required' | 'optional';
}

export interface Advisory {
  id: string;
  packageName: string;
  ecosystem: string;
  vulnerableRange: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  cveIds: string[];
  cweIds: string[];
  title: string;
  description: string;
  fixedVersion?: string;
}

export interface SbomScanResult {
  dependencies: Dependency[];
  sbom: CycloneDxBom;
  findings: CanonicalFinding[];
  ecosystems: string[];
}

// ---------------------------------------------------------------------------
// Package Manager Detection
// ---------------------------------------------------------------------------

interface PackageManagerDef {
  ecosystem: string;
  lockFile: string;
  manifestFile: string;
  parser: (projectDir: string, lockPath: string) => Promise<Dependency[]>;
}

const PACKAGE_MANAGERS: PackageManagerDef[] = [
  {
    ecosystem: 'npm',
    lockFile: 'package-lock.json',
    manifestFile: 'package.json',
    parser: parseNpmLock,
  },
  {
    ecosystem: 'yarn',
    lockFile: 'yarn.lock',
    manifestFile: 'package.json',
    parser: parseYarnLock,
  },
  {
    ecosystem: 'pnpm',
    lockFile: 'pnpm-lock.yaml',
    manifestFile: 'package.json',
    parser: parsePnpmLock,
  },
  {
    ecosystem: 'pip',
    lockFile: 'requirements.txt',
    manifestFile: 'requirements.txt',
    parser: parsePipRequirements,
  },
  {
    ecosystem: 'pip',
    lockFile: 'Pipfile.lock',
    manifestFile: 'Pipfile',
    parser: parsePipfileLock,
  },
  {
    ecosystem: 'go',
    lockFile: 'go.sum',
    manifestFile: 'go.mod',
    parser: parseGoSum,
  },
  {
    ecosystem: 'cargo',
    lockFile: 'Cargo.lock',
    manifestFile: 'Cargo.toml',
    parser: parseCargoLock,
  },
  {
    ecosystem: 'gem',
    lockFile: 'Gemfile.lock',
    manifestFile: 'Gemfile',
    parser: parseGemfileLock,
  },
  {
    ecosystem: 'maven',
    lockFile: 'pom.xml',
    manifestFile: 'pom.xml',
    parser: parsePomXml,
  },
  {
    ecosystem: 'gradle',
    lockFile: 'build.gradle',
    manifestFile: 'build.gradle',
    parser: parseGradleBuild,
  },
];

// ---------------------------------------------------------------------------
// Lock File Parsers
// ---------------------------------------------------------------------------

async function parseNpmLock(projectDir: string, lockPath: string): Promise<Dependency[]> {
  const deps: Dependency[] = [];
  const content = await fs.promises.readFile(lockPath, 'utf-8');
  const lock = JSON.parse(content);

  // Read manifest to determine direct deps
  const directDeps = new Set<string>();
  const manifestPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf-8'));
    for (const name of Object.keys(manifest.dependencies ?? {})) directDeps.add(name);
    for (const name of Object.keys(manifest.devDependencies ?? {})) directDeps.add(name);
  }

  // lockfileVersion 2/3 uses "packages" key
  const packages = lock.packages ?? {};
  for (const [pkgPath, info] of Object.entries(packages) as [string, Record<string, unknown>][]) {
    if (pkgPath === '') continue; // root
    const name = pkgPath.replace(/^node_modules\//, '');
    if (!name || typeof info.version !== 'string') continue;
    deps.push({
      name,
      version: info.version as string,
      ecosystem: 'npm',
      direct: directDeps.has(name),
    });
  }

  // Fallback: lockfileVersion 1 uses "dependencies" key
  if (deps.length === 0 && lock.dependencies) {
    for (const [name, info] of Object.entries(lock.dependencies) as [string, Record<string, unknown>][]) {
      if (typeof info.version !== 'string') continue;
      deps.push({
        name,
        version: info.version as string,
        ecosystem: 'npm',
        direct: directDeps.has(name),
      });
    }
  }

  return deps;
}

async function parseYarnLock(_projectDir: string, lockPath: string): Promise<Dependency[]> {
  const deps: Dependency[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(lockPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let currentPkg = '';
  for await (const line of rl) {
    // Package header: "name@version:"
    const headerMatch = line.match(/^"?([^@\s]+)@[^"]*"?:$/);
    if (headerMatch) {
      currentPkg = headerMatch[1];
      continue;
    }
    // Version line
    const versionMatch = line.match(/^\s+version\s+"([^"]+)"/);
    if (versionMatch && currentPkg) {
      deps.push({
        name: currentPkg,
        version: versionMatch[1],
        ecosystem: 'yarn',
        direct: false, // would need manifest cross-ref
      });
      currentPkg = '';
    }
  }
  return deduplicateDeps(deps);
}

async function parsePnpmLock(_projectDir: string, lockPath: string): Promise<Dependency[]> {
  const deps: Dependency[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(lockPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  // pnpm-lock.yaml: packages section has entries like /pkg@version:
  let inPackages = false;
  for await (const line of rl) {
    if (line.startsWith('packages:')) {
      inPackages = true;
      continue;
    }
    if (inPackages && line.match(/^\S/) && !line.startsWith(' ')) {
      inPackages = false;
      continue;
    }
    if (!inPackages) continue;

    // Match /name@version or /@scope/name@version
    const match = line.match(/^\s+'?\/?(@?[^@(]+)@([^:('"]+)/);
    if (match) {
      deps.push({
        name: match[1],
        version: match[2],
        ecosystem: 'pnpm',
        direct: false,
      });
    }
  }
  return deps;
}

async function parsePipRequirements(_projectDir: string, lockPath: string): Promise<Dependency[]> {
  const deps: Dependency[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(lockPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
    const match = trimmed.match(/^([a-zA-Z0-9_.-]+)\s*==\s*([^\s;#]+)/);
    if (match) {
      deps.push({ name: match[1], version: match[2], ecosystem: 'pip', direct: true });
    } else {
      // version range or unpinned
      const nameMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)/);
      if (nameMatch) {
        deps.push({ name: nameMatch[1], version: 'unknown', ecosystem: 'pip', direct: true });
      }
    }
  }
  return deps;
}

async function parsePipfileLock(_projectDir: string, lockPath: string): Promise<Dependency[]> {
  const deps: Dependency[] = [];
  const content = await fs.promises.readFile(lockPath, 'utf-8');
  const lock = JSON.parse(content);

  for (const section of ['default', 'develop'] as const) {
    const packages = lock[section] ?? {};
    for (const [name, info] of Object.entries(packages) as [string, Record<string, unknown>][]) {
      const version = typeof info.version === 'string' ? info.version.replace(/^==/, '') : 'unknown';
      deps.push({ name, version, ecosystem: 'pip', direct: section === 'default' });
    }
  }
  return deps;
}

async function parseGoSum(_projectDir: string, lockPath: string): Promise<Dependency[]> {
  const deps: Dependency[] = [];
  const seen = new Set<string>();
  const rl = readline.createInterface({
    input: fs.createReadStream(lockPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const match = line.match(/^(\S+)\s+(v[^\s/]+)/);
    if (match) {
      const key = `${match[1]}@${match[2]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deps.push({ name: match[1], version: match[2], ecosystem: 'go', direct: false });
    }
  }
  return deps;
}

async function parseCargoLock(_projectDir: string, lockPath: string): Promise<Dependency[]> {
  const deps: Dependency[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(lockPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let currentName = '';
  for await (const line of rl) {
    const nameMatch = line.match(/^name\s*=\s*"([^"]+)"/);
    if (nameMatch) {
      currentName = nameMatch[1];
      continue;
    }
    const versionMatch = line.match(/^version\s*=\s*"([^"]+)"/);
    if (versionMatch && currentName) {
      deps.push({ name: currentName, version: versionMatch[1], ecosystem: 'cargo', direct: false });
      currentName = '';
    }
  }
  return deps;
}

async function parseGemfileLock(_projectDir: string, lockPath: string): Promise<Dependency[]> {
  const deps: Dependency[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(lockPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let inSpecs = false;
  for await (const line of rl) {
    if (line.trim() === 'specs:') {
      inSpecs = true;
      continue;
    }
    if (inSpecs && !line.startsWith('  ')) {
      inSpecs = false;
      continue;
    }
    if (!inSpecs) continue;
    // Gems are indented with 4+ spaces: "    gem-name (version)"
    const match = line.match(/^\s{4}(\S+)\s+\(([^)]+)\)/);
    if (match) {
      deps.push({ name: match[1], version: match[2], ecosystem: 'gem', direct: false });
    }
  }
  return deps;
}

async function parsePomXml(_projectDir: string, lockPath: string): Promise<Dependency[]> {
  const deps: Dependency[] = [];
  const content = await fs.promises.readFile(lockPath, 'utf-8');

  // Simple regex-based extraction of <dependency> blocks
  const depRegex = /<dependency>\s*<groupId>([^<]+)<\/groupId>\s*<artifactId>([^<]+)<\/artifactId>\s*(?:<version>([^<]+)<\/version>)?/gs;
  let match;
  while ((match = depRegex.exec(content)) !== null) {
    deps.push({
      name: `${match[1]}:${match[2]}`,
      version: match[3] ?? 'managed',
      ecosystem: 'maven',
      direct: true,
    });
  }
  return deps;
}

async function parseGradleBuild(_projectDir: string, lockPath: string): Promise<Dependency[]> {
  const deps: Dependency[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(lockPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    // Match: implementation 'group:artifact:version' or "group:artifact:version"
    const match = line.match(/(?:implementation|api|compile|runtimeOnly|testImplementation)\s+['"]([^:]+):([^:]+):([^'"]+)['"]/);
    if (match) {
      deps.push({
        name: `${match[1]}:${match[2]}`,
        version: match[3],
        ecosystem: 'gradle',
        direct: true,
      });
    }
  }
  return deps;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deduplicateDeps(deps: Dependency[]): Dependency[] {
  const seen = new Map<string, Dependency>();
  for (const dep of deps) {
    const key = `${dep.name}@${dep.version}`;
    if (!seen.has(key)) seen.set(key, dep);
  }
  return Array.from(seen.values());
}

function buildPurl(ecosystem: string, name: string, version: string): string {
  const typeMap: Record<string, string> = {
    npm: 'npm',
    yarn: 'npm',
    pnpm: 'npm',
    pip: 'pypi',
    go: 'golang',
    cargo: 'cargo',
    gem: 'gem',
    maven: 'maven',
    gradle: 'maven',
  };
  const purlType = typeMap[ecosystem] ?? ecosystem;
  const encodedName = encodeURIComponent(name).replace(/%3A/g, ':').replace(/%2F/g, '/');
  return `pkg:${purlType}/${encodedName}@${version}`;
}

function generateSbom(deps: Dependency[], projectDir: string): CycloneDxBom {
  const projectName = path.basename(projectDir);
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ vendor: 'CVERiskPilot', name: 'cveriskpilot-scan', version: VERSION }],
      component: { type: 'application', name: projectName, version: '0.0.0' },
    },
    components: deps.map((dep) => ({
      type: 'library' as const,
      name: dep.name,
      version: dep.version,
      purl: buildPurl(dep.ecosystem, dep.name, dep.version),
      scope: dep.direct ? ('required' as const) : ('optional' as const),
    })),
  };
}

// ---------------------------------------------------------------------------
// SSDF Practice Mapping
// ---------------------------------------------------------------------------

/** SSDF practices relevant to supply chain compliance */
const SSDF_CONTROLS = ['PO.1', 'PS.1', 'PW.4'] as const;

/** CWE IDs commonly associated with supply chain vulnerabilities */
const SUPPLY_CHAIN_CWES = ['CWE-829', 'CWE-1104', 'CWE-502'];

// ---------------------------------------------------------------------------
// Advisory Matching — OSV API with hardcoded fallback
// ---------------------------------------------------------------------------

/** OSV API endpoint (free, no auth required) */
const OSV_API_URL = 'https://api.osv.dev/v1/query';

/** Timeout for individual OSV queries (ms) */
const OSV_QUERY_TIMEOUT_MS = 5_000;

/** Max concurrent OSV queries to avoid overwhelming the API */
const OSV_CONCURRENCY = 10;

/**
 * Fallback advisory list used when the OSV API is unreachable.
 * Covers common high-profile advisories for offline/degraded operation.
 */
const FALLBACK_ADVISORIES: Advisory[] = [
  {
    id: 'GHSA-35jh-r3h4-6jhm',
    packageName: 'lodash',
    ecosystem: 'npm',
    vulnerableRange: '<4.17.21',
    severity: 'CRITICAL',
    cveIds: ['CVE-2021-23337'],
    cweIds: ['CWE-77'],
    title: 'Prototype Pollution in lodash',
    description: 'lodash before 4.17.21 is vulnerable to Command Injection via template function.',
    fixedVersion: '4.17.21',
  },
  {
    id: 'GHSA-jfh8-c2jp-5v3q',
    packageName: 'log4j-core',
    ecosystem: 'maven',
    vulnerableRange: '>=2.0 <2.17.1',
    severity: 'CRITICAL',
    cveIds: ['CVE-2021-44228'],
    cweIds: ['CWE-917', 'CWE-502'],
    title: 'Log4Shell — Remote Code Execution in Log4j',
    description: 'Apache Log4j2 JNDI features used in configuration, log messages, and parameters do not protect against attacker-controlled LDAP and other endpoints.',
    fixedVersion: '2.17.1',
  },
  {
    id: 'GHSA-p6mc-m468-83gw',
    packageName: 'jsonwebtoken',
    ecosystem: 'npm',
    vulnerableRange: '<9.0.0',
    severity: 'HIGH',
    cveIds: ['CVE-2022-23529'],
    cweIds: ['CWE-20'],
    title: 'Insecure default algorithm in jsonwebtoken',
    description: 'jsonwebtoken before 9.0.0 allows attackers to bypass intended access restrictions.',
    fixedVersion: '9.0.0',
  },
  {
    id: 'GHSA-68xg-gqqm-vgj8',
    packageName: 'axios',
    ecosystem: 'npm',
    vulnerableRange: '<1.6.0',
    severity: 'MEDIUM',
    cveIds: ['CVE-2023-45857'],
    cweIds: ['CWE-352'],
    title: 'CSRF vulnerability in axios',
    description: 'axios before 1.6.0 inadvertently leaks the confidential XSRF-TOKEN stored in cookies.',
    fixedVersion: '1.6.0',
  },
  {
    id: 'GHSA-cph5-m8f7-6c5x',
    packageName: 'requests',
    ecosystem: 'pip',
    vulnerableRange: '<2.31.0',
    severity: 'MEDIUM',
    cveIds: ['CVE-2023-32681'],
    cweIds: ['CWE-200'],
    title: 'Unintended leak of Proxy-Authorization header in requests',
    description: 'requests library leaks Proxy-Authorization header to destination servers.',
    fixedVersion: '2.31.0',
  },
];

/**
 * Map local ecosystem names to the OSV ecosystem identifier.
 * @see https://ossf.github.io/osv-schema/#affectedpackage-field
 */
const OSV_ECOSYSTEM_MAP: Record<string, string> = {
  npm: 'npm',
  yarn: 'npm',
  pnpm: 'npm',
  pip: 'PyPI',
  go: 'Go',
  cargo: 'crates.io',
  gem: 'RubyGems',
  maven: 'Maven',
  gradle: 'Maven',
};

/** Map OSV severity strings to our canonical severity levels */
function mapOsvSeverity(osvSeverity?: string, cvssScore?: number): Advisory['severity'] {
  if (cvssScore !== undefined) {
    if (cvssScore >= 9.0) return 'CRITICAL';
    if (cvssScore >= 7.0) return 'HIGH';
    if (cvssScore >= 4.0) return 'MEDIUM';
    if (cvssScore > 0) return 'LOW';
    return 'INFO';
  }
  switch (osvSeverity?.toUpperCase()) {
    case 'CRITICAL': return 'CRITICAL';
    case 'HIGH': return 'HIGH';
    case 'MODERATE':
    case 'MEDIUM': return 'MEDIUM';
    case 'LOW': return 'LOW';
    default: return 'MEDIUM'; // default when severity unknown
  }
}

/** Extract the first fixed version from OSV affected ranges */
function extractFixedVersion(affected: OsvAffected[]): string | undefined {
  for (const entry of affected) {
    for (const range of entry.ranges ?? []) {
      for (const event of range.events ?? []) {
        if (event.fixed) return event.fixed;
      }
    }
  }
  return undefined;
}

// OSV response types (partial — only fields we use)
interface OsvVulnerability {
  id: string;
  summary?: string;
  details?: string;
  aliases?: string[];
  severity?: { type: string; score: string }[];
  affected?: OsvAffected[];
  database_specific?: { severity?: string; cwe_ids?: string[] };
}

interface OsvAffected {
  package?: { name: string; ecosystem: string };
  ranges?: { type: string; events: { introduced?: string; fixed?: string }[] }[];
  database_specific?: { severity?: string; cwes?: { cweId: string }[] };
}

interface OsvQueryResponse {
  vulns?: OsvVulnerability[];
}

/**
 * Query the OSV API for a single dependency.
 * Returns an array of Advisory objects, or null if the query fails.
 */
async function queryOsv(dep: Dependency): Promise<Advisory[] | null> {
  const ecosystem = OSV_ECOSYSTEM_MAP[dep.ecosystem];
  if (!ecosystem || dep.version === 'unknown') return null;

  // For Maven/Gradle, OSV expects the groupId:artifactId format
  const packageName = dep.name;

  const body = JSON.stringify({
    package: { name: packageName, ecosystem },
    version: dep.version,
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OSV_QUERY_TIMEOUT_MS);

    const response = await fetch(OSV_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = (await response.json()) as OsvQueryResponse;
    if (!data.vulns || data.vulns.length === 0) return [];

    return data.vulns.map((vuln): Advisory => {
      // Extract CVE IDs from aliases
      const cveIds = (vuln.aliases ?? []).filter((a) => a.startsWith('CVE-'));
      if (vuln.id.startsWith('CVE-') && !cveIds.includes(vuln.id)) {
        cveIds.unshift(vuln.id);
      }

      // Extract CWE IDs
      const cweIds: string[] = vuln.database_specific?.cwe_ids ?? [];
      if (cweIds.length === 0 && vuln.affected) {
        for (const aff of vuln.affected) {
          for (const cwe of aff.database_specific?.cwes ?? []) {
            if (cwe.cweId && !cweIds.includes(cwe.cweId)) cweIds.push(cwe.cweId);
          }
        }
      }

      // Determine severity from CVSS score or database_specific
      let cvssScore: number | undefined;
      if (vuln.severity && vuln.severity.length > 0) {
        // Parse CVSS vector score — try to extract base score
        for (const s of vuln.severity) {
          const scoreMatch = s.score?.match(/(\d+\.?\d*)/);
          if (scoreMatch) {
            cvssScore = parseFloat(scoreMatch[1]);
            break;
          }
        }
      }

      const severity = mapOsvSeverity(vuln.database_specific?.severity, cvssScore);
      const fixedVersion = extractFixedVersion(vuln.affected ?? []);

      // Build a human-readable vulnerable range from affected data
      let vulnerableRange = '';
      if (vuln.affected) {
        for (const aff of vuln.affected) {
          for (const range of aff.ranges ?? []) {
            const parts: string[] = [];
            for (const event of range.events ?? []) {
              if (event.introduced) parts.push(`>=${event.introduced}`);
              if (event.fixed) parts.push(`<${event.fixed}`);
            }
            if (parts.length > 0) {
              vulnerableRange = parts.join(' ');
              break;
            }
          }
          if (vulnerableRange) break;
        }
      }

      return {
        id: vuln.id,
        packageName,
        ecosystem: dep.ecosystem,
        vulnerableRange,
        severity,
        cveIds,
        cweIds,
        title: vuln.summary ?? vuln.id,
        description: vuln.details ?? vuln.summary ?? `Vulnerability ${vuln.id}`,
        fixedVersion,
      };
    });
  } catch {
    // Network error, timeout, parse error — caller handles null
    return null;
  }
}

/**
 * Run OSV queries in batches to respect concurrency limits.
 */
async function batchQueryOsv(deps: Dependency[]): Promise<{ dep: Dependency; advisories: Advisory[] }[] | null> {
  const results: { dep: Dependency; advisories: Advisory[] }[] = [];
  let anyFailed = false;

  for (let i = 0; i < deps.length; i += OSV_CONCURRENCY) {
    const batch = deps.slice(i, i + OSV_CONCURRENCY);
    const promises = batch.map(async (dep) => {
      const advisories = await queryOsv(dep);
      if (advisories === null) {
        anyFailed = true;
        return { dep, advisories: [] as Advisory[] };
      }
      return { dep, advisories };
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    // If the first batch all failed, assume OSV is unreachable and bail early
    if (i === 0 && batch.length > 0 && anyFailed) {
      const allFailed = batchResults.every((r) => r.advisories.length === 0);
      if (allFailed && anyFailed) return null;
    }
  }

  return results;
}

/**
 * Naive version comparison for semver-like versions.
 * Returns true if `version` is within the vulnerable range.
 */
function isVulnerable(version: string, vulnerableRange: string): boolean {
  // Simple approach: parse range operators
  const parts = vulnerableRange.split(/\s+/).filter(Boolean);
  const normalizeVersion = (v: string): number[] =>
    v.replace(/^[v=<>!~^]+/, '').split(/[.-]/).map((p) => parseInt(p, 10) || 0);

  const ver = normalizeVersion(version);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith('<')) {
      const bound = normalizeVersion(part);
      if (!versionLessThan(ver, bound)) return false;
    } else if (part.startsWith('>=')) {
      const bound = normalizeVersion(part);
      if (versionLessThan(ver, bound)) return false;
    }
  }
  return true;
}

function versionLessThan(a: number[], b: number[]): boolean {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av < bv) return true;
    if (av > bv) return false;
  }
  return false;
}

/**
 * Match dependencies against the hardcoded fallback advisory list.
 * Used when OSV API is unreachable.
 */
interface AdvisoryMatch {
  dep: Dependency;
  advisory: Advisory;
  nameMatchExact: boolean;
}

function matchFallbackAdvisories(deps: Dependency[]): AdvisoryMatch[] {
  const matches: AdvisoryMatch[] = [];
  for (const dep of deps) {
    for (const advisory of FALLBACK_ADVISORIES) {
      // Match ecosystem (npm/yarn/pnpm all map to npm advisories)
      const depEco = dep.ecosystem === 'yarn' || dep.ecosystem === 'pnpm' ? 'npm' : dep.ecosystem;
      const advEco = advisory.ecosystem;
      if (depEco !== advEco) continue;

      // Match package name — exact or substring (sub-packages)
      const depName = dep.name.toLowerCase();
      const advName = advisory.packageName.toLowerCase();
      const nameMatchExact = depName === advName;
      const nameMatchFuzzy = !nameMatchExact && (depName.includes(advName) || advName.includes(depName));
      if (!nameMatchExact && !nameMatchFuzzy) continue;

      if (dep.version !== 'unknown' && isVulnerable(dep.version, advisory.vulnerableRange)) {
        matches.push({ dep, advisory, nameMatchExact });
      }
    }
  }
  return matches;
}

/**
 * Query OSV for vulnerability advisories. Falls back to the hardcoded
 * advisory list if the API is unreachable, logging a warning to stderr.
 */
async function matchAdvisories(deps: Dependency[]): Promise<AdvisoryMatch[]> {
  // Filter to deps that have a known version and a supported ecosystem
  const queryable = deps.filter(
    (d) => d.version !== 'unknown' && OSV_ECOSYSTEM_MAP[d.ecosystem] !== undefined,
  );

  if (queryable.length === 0) {
    return matchFallbackAdvisories(deps);
  }

  const osvResults = await batchQueryOsv(queryable);

  if (osvResults === null) {
    // OSV unreachable — fall back to hardcoded list
    console.warn(
      '[cveriskpilot-scan] Warning: OSV API unreachable, using fallback advisory database (limited coverage).',
    );
    return matchFallbackAdvisories(deps);
  }

  const matches: AdvisoryMatch[] = [];
  for (const { dep, advisories } of osvResults) {
    for (const advisory of advisories) {
      matches.push({ dep, advisory, nameMatchExact: true });
    }
  }

  return matches;
}

// ---------------------------------------------------------------------------
// npm audit Integration
// ---------------------------------------------------------------------------

interface NpmAuditVuln {
  name: string;
  severity: string;
  isDirect: boolean;
  advisoryUrl?: string;
  cweIds: string[];
  cvssScore?: number;
  cvssVector?: string;
  title?: string;
  fixName?: string;
  fixVersion?: string;
  isSemVerMajor?: boolean;
}

/**
 * Run `npm audit --json` and parse the output.
 * Returns null if npm is unavailable or the command fails.
 */
function runNpmAudit(projectDir: string): Map<string, NpmAuditVuln[]> | null {
  // Only run if package-lock.json exists (npm audit requires it)
  if (!fs.existsSync(path.join(projectDir, 'package-lock.json'))) return null;

  try {
    let output: string;
    try {
      output = execFileSync('npm', ['audit', '--json'], {
        cwd: projectDir,
        encoding: 'utf-8',
        timeout: 30_000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err: unknown) {
      // npm audit exits non-zero when vulnerabilities are found — that's expected
      const execErr = err as { stdout?: string; status?: number };
      if (execErr.stdout) {
        output = execErr.stdout;
      } else {
        return null;
      }
    }

    const audit = JSON.parse(output);

    // npm v7+ uses "vulnerabilities" key; v6 uses "advisories"
    const vulns = audit.vulnerabilities;
    if (!vulns || typeof vulns !== 'object') return null;

    const result = new Map<string, NpmAuditVuln[]>();

    for (const [pkgName, entry] of Object.entries(vulns) as [string, Record<string, unknown>][]) {
      const viaArr = entry.via;
      if (!Array.isArray(viaArr)) continue;

      const pkgVulns: NpmAuditVuln[] = [];

      for (const via of viaArr) {
        // via can be a string (transitive reference) or an object (actual advisory)
        if (typeof via !== 'object' || via === null) continue;

        const viaObj = via as Record<string, unknown>;
        const cvss = viaObj.cvss as Record<string, unknown> | undefined;
        const cweRaw = viaObj.cwe;
        const fixAvail = entry.fixAvailable;

        pkgVulns.push({
          name: pkgName,
          severity: (viaObj.severity as string) ?? (entry.severity as string) ?? 'moderate',
          isDirect: (entry.isDirect as boolean) ?? false,
          advisoryUrl: (viaObj.url as string) ?? undefined,
          cweIds: Array.isArray(cweRaw) ? cweRaw.filter((c): c is string => typeof c === 'string') : [],
          cvssScore: typeof cvss?.score === 'number' ? cvss.score : undefined,
          cvssVector: typeof cvss?.vectorString === 'string' ? cvss.vectorString : undefined,
          title: (viaObj.title as string) ?? undefined,
          fixName: typeof fixAvail === 'object' && fixAvail !== null ? (fixAvail as Record<string, unknown>).name as string : undefined,
          fixVersion: typeof fixAvail === 'object' && fixAvail !== null ? (fixAvail as Record<string, unknown>).version as string : undefined,
          isSemVerMajor: typeof fixAvail === 'object' && fixAvail !== null ? (fixAvail as Record<string, unknown>).isSemVerMajor as boolean : undefined,
        });
      }

      if (pkgVulns.length > 0) {
        result.set(pkgName, pkgVulns);
      }
    }

    return result;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Triage Recommendation Generator
// ---------------------------------------------------------------------------

function generateRecommendation(
  packageName: string,
  fixedVersion: string | undefined,
  cveIds: string[],
  severity: string,
  isSemVerMajor?: boolean,
): string {
  const cveLabel = cveIds.length > 0 ? cveIds[0] : 'this vulnerability';

  if (fixedVersion) {
    const majorWarning = isSemVerMajor
      ? ' (major version change — review for breaking changes)'
      : '';
    return `Upgrade ${packageName} to >=${fixedVersion} to fix ${cveLabel}${majorWarning}`;
  }

  if (severity === 'CRITICAL' || severity === 'HIGH') {
    return `No fix available for ${cveLabel} in ${packageName}. Consider replacing with an alternative package or applying a workaround.`;
  }

  return `No fix available for ${cveLabel} in ${packageName}. Monitor for upstream patches.`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function scanDependencies(projectDir: string, _opts?: { onProgress?: (msg: string) => void }): Promise<SbomScanResult> {
  const allDeps: Dependency[] = [];
  const ecosystems: string[] = [];

  // Detect which package managers have lock files, then parse in parallel
  const detected = PACKAGE_MANAGERS
    .map(pm => ({ pm, lockPath: path.join(projectDir, pm.lockFile) }))
    .filter(({ lockPath }) => fs.existsSync(lockPath));

  const parseResults = await Promise.all(
    detected.map(async ({ pm, lockPath }) => {
      try {
        const deps = await pm.parser(projectDir, lockPath);
        return { ecosystem: pm.ecosystem, deps };
      } catch {
        return null;
      }
    })
  );

  for (const result of parseResults) {
    if (result) {
      ecosystems.push(result.ecosystem);
      allDeps.push(...result.deps);
    }
  }

  const dedupedDeps = deduplicateDeps(allDeps);
  const sbom = generateSbom(dedupedDeps, projectDir);

  // Check advisories (queries OSV API, falls back to hardcoded list)
  const advisoryMatches = await matchAdvisories(dedupedDeps);

  // Run npm audit for enrichment (npm projects only)
  const npmAuditData = runNpmAudit(projectDir);

  const now = new Date();

  const findings: CanonicalFinding[] = advisoryMatches.map(({ dep, advisory, nameMatchExact }) => {
    // Classify verdict
    let verdict: FindingVerdict = 'TRUE_POSITIVE';
    let verdictReason = '';

    if (!nameMatchExact) {
      verdict = 'FALSE_POSITIVE';
      verdictReason = `Package "${dep.name}" matched advisory for "${advisory.packageName}" by substring only — CVE likely applies to the main package, not this sub-package`;
    } else if (dep.version === 'unknown') {
      verdict = 'NEEDS_REVIEW';
      verdictReason = 'Package version could not be determined — verify manually';
    }

    // Enrich with npm audit data if available
    let advisoryUrl: string | undefined;
    let cvssScore: number | undefined;
    let cvssVector: string | undefined;
    let fixedVersion = advisory.fixedVersion;
    let isSemVerMajor: boolean | undefined;

    const auditVulns = npmAuditData?.get(dep.name);
    if (auditVulns && auditVulns.length > 0) {
      // Find the best matching npm audit entry (by title or first available)
      const match = auditVulns.find((v) =>
        advisory.cveIds.length > 0 && v.advisoryUrl?.includes('GHSA'),
      ) ?? auditVulns[0];

      if (match) {
        advisoryUrl = match.advisoryUrl;
        if (match.cvssScore !== undefined) cvssScore = match.cvssScore;
        if (match.cvssVector) cvssVector = match.cvssVector;
        if (match.fixVersion && !fixedVersion) fixedVersion = match.fixVersion;
        isSemVerMajor = match.isSemVerMajor;
      }
    }

    // Fallback advisory URL from OSV
    if (!advisoryUrl && advisory.id) {
      advisoryUrl = advisory.id.startsWith('GHSA-')
        ? `https://github.com/advisories/${advisory.id}`
        : `https://osv.dev/vulnerability/${advisory.id}`;
    }

    const recommendation = generateRecommendation(
      dep.name,
      fixedVersion,
      advisory.cveIds,
      advisory.severity,
      isSemVerMajor,
    );

    return {
      title: advisory.title,
      description: `${advisory.description}\n\nSSDF Controls: ${SSDF_CONTROLS.join(', ')}`,
      cveIds: advisory.cveIds,
      cweIds: advisory.cweIds.length > 0 ? advisory.cweIds : SUPPLY_CHAIN_CWES,
      severity: advisory.severity,
      cvssScore,
      cvssVector,
      cvssVersion: cvssVector?.startsWith('CVSS:3') ? '3.1' : undefined,
      verdict,
      verdictReason,
      scannerType: 'sbom',
      scannerName: 'cveriskpilot-scan/sbom',
      assetName: projectDir,
      assetType: 'repository',
      packageName: dep.name,
      packageVersion: dep.version,
      packageEcosystem: dep.ecosystem,
      fixedVersion,
      isSemVerMajor,
      advisoryUrl,
      recommendation,
      rawObservations: {
        advisoryId: advisory.id,
        vulnerableRange: advisory.vulnerableRange,
        purl: buildPurl(dep.ecosystem, dep.name, dep.version),
        sbomComponentCount: dedupedDeps.length,
        ssdfControls: [...SSDF_CONTROLS],
      },
      discoveredAt: now,
    };
  });

  // Add npm audit vulns that OSV missed (npm-only packages)
  if (npmAuditData) {
    const existingPkgs = new Set(findings.map((f) => f.packageName));
    for (const [pkgName, vulns] of npmAuditData) {
      if (existingPkgs.has(pkgName)) continue;

      const dep = dedupedDeps.find((d) => d.name === pkgName);
      if (!dep) continue;

      for (const vuln of vulns) {
        if (!vuln.title) continue; // skip transitive-only entries with no advisory

        const severity = mapOsvSeverity(vuln.severity, vuln.cvssScore);
        const recommendation = generateRecommendation(
          pkgName,
          vuln.fixVersion,
          [],
          severity,
          vuln.isSemVerMajor,
        );

        findings.push({
          title: vuln.title,
          description: `Detected by npm audit.\n\nSSDF Controls: ${SSDF_CONTROLS.join(', ')}`,
          cveIds: [],
          cweIds: vuln.cweIds.length > 0 ? vuln.cweIds : SUPPLY_CHAIN_CWES,
          severity,
          cvssScore: vuln.cvssScore,
          cvssVector: vuln.cvssVector,
          cvssVersion: vuln.cvssVector?.startsWith('CVSS:3') ? '3.1' : undefined,
          verdict: 'TRUE_POSITIVE',
          verdictReason: '',
          scannerType: 'sbom',
          scannerName: 'cveriskpilot-scan/npm-audit',
          assetName: projectDir,
          assetType: 'repository',
          packageName: dep.name,
          packageVersion: dep.version,
          packageEcosystem: dep.ecosystem,
          fixedVersion: vuln.fixVersion,
          isSemVerMajor: vuln.isSemVerMajor,
          advisoryUrl: vuln.advisoryUrl,
          recommendation,
          rawObservations: {
            source: 'npm-audit',
            purl: buildPurl(dep.ecosystem, dep.name, dep.version),
            sbomComponentCount: dedupedDeps.length,
            ssdfControls: [...SSDF_CONTROLS],
          },
          discoveredAt: now,
        });
      }
    }
  }

  return {
    dependencies: dedupedDeps,
    sbom,
    findings,
    ecosystems: [...new Set(ecosystems)],
  };
}
