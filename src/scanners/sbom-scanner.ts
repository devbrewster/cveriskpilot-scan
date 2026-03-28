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
import type { CanonicalFinding } from '../vendor/parsers/types.js';

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
      tools: [{ vendor: 'CVERiskPilot', name: 'cveriskpilot-scan', version: '0.1.0' }],
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
// Advisory Matching (stub — real impl would call OSV/GitHub Advisory API)
// ---------------------------------------------------------------------------

/**
 * Known vulnerable packages registry.
 * In production, this would be populated by querying OSV, GitHub Advisory DB,
 * or the NVD API. This static set covers common high-profile advisories for
 * demonstration and testing purposes.
 */
const KNOWN_ADVISORIES: Advisory[] = [
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

function matchAdvisories(deps: Dependency[]): { dep: Dependency; advisory: Advisory }[] {
  const matches: { dep: Dependency; advisory: Advisory }[] = [];
  for (const dep of deps) {
    for (const advisory of KNOWN_ADVISORIES) {
      // Match ecosystem (npm/yarn/pnpm all map to npm advisories)
      const depEco = dep.ecosystem === 'yarn' || dep.ecosystem === 'pnpm' ? 'npm' : dep.ecosystem;
      const advEco = advisory.ecosystem;
      if (depEco !== advEco) continue;

      // Match package name (for maven, compare artifact portion)
      const depName = dep.name.toLowerCase();
      const advName = advisory.packageName.toLowerCase();
      if (!depName.includes(advName) && !advName.includes(depName)) continue;

      if (dep.version !== 'unknown' && isVulnerable(dep.version, advisory.vulnerableRange)) {
        matches.push({ dep, advisory });
      }
    }
  }
  return matches;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function scanDependencies(projectDir: string): Promise<SbomScanResult> {
  const allDeps: Dependency[] = [];
  const ecosystems: string[] = [];

  // Detect and parse each package manager
  for (const pm of PACKAGE_MANAGERS) {
    const lockPath = path.join(projectDir, pm.lockFile);
    if (!fs.existsSync(lockPath)) continue;

    ecosystems.push(pm.ecosystem);
    try {
      const deps = await pm.parser(projectDir, lockPath);
      allDeps.push(...deps);
    } catch {
      // Skip unparseable lock files
    }
  }

  const dedupedDeps = deduplicateDeps(allDeps);
  const sbom = generateSbom(dedupedDeps, projectDir);

  // Check advisories
  const advisoryMatches = matchAdvisories(dedupedDeps);
  const now = new Date();

  const findings: CanonicalFinding[] = advisoryMatches.map(({ dep, advisory }) => ({
    title: advisory.title,
    description: `${advisory.description}\n\nSSDF Controls: ${SSDF_CONTROLS.join(', ')}`,
    cveIds: advisory.cveIds,
    cweIds: advisory.cweIds.length > 0 ? advisory.cweIds : SUPPLY_CHAIN_CWES,
    severity: advisory.severity,
    scannerType: 'sbom',
    scannerName: 'cveriskpilot-scan/sbom',
    assetName: projectDir,
    assetType: 'repository',
    packageName: dep.name,
    packageVersion: dep.version,
    packageEcosystem: dep.ecosystem,
    fixedVersion: advisory.fixedVersion,
    rawObservations: {
      advisoryId: advisory.id,
      vulnerableRange: advisory.vulnerableRange,
      purl: buildPurl(dep.ecosystem, dep.name, dep.version),
      sbomComponentCount: dedupedDeps.length,
      ssdfControls: [...SSDF_CONTROLS],
    },
    discoveredAt: now,
  }));

  return {
    dependencies: dedupedDeps,
    sbom,
    findings,
    ecosystems: [...new Set(ecosystems)],
  };
}
