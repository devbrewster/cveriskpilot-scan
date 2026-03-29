import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditCheck, Finding } from '../types.js';

/**
 * Extracts bare import specifiers (not relative, not @/ alias).
 */
const IMPORT_SPECIFIER_RE =
  /(?:import|from)\s+['"]([^./][^'"]*)['"]/g;

/**
 * Node built-in modules (prefix stripped if node:).
 */
const NODE_BUILTINS = new Set([
  'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants',
  'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https',
  'module', 'net', 'os', 'path', 'perf_hooks', 'process', 'punycode',
  'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'sys',
  'timers', 'tls', 'tty', 'url', 'util', 'v8', 'vm', 'worker_threads',
  'zlib',
]);

function getPackageName(specifier: string): string | null {
  // Skip node: protocol
  if (specifier.startsWith('node:')) return null;
  // Scoped: @scope/name
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }
  // Bare: name or name/sub
  return specifier.split('/')[0];
}

export const missingDepsCheck: AuditCheck = {
  name: 'missing-deps',
  description: 'Detect packages imported but not declared in package.json',

  async run(rootDir: string): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Read root package.json deps (available to all workspaces via hoisting)
    const rootPkgPath = path.join(rootDir, 'package.json');
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
    const rootDeps = new Set([
      ...Object.keys(rootPkg.dependencies ?? {}),
      ...Object.keys(rootPkg.devDependencies ?? {}),
    ]);

    // Find all workspace package.jsons
    const pkgJsons = await fg(
      ['apps/*/package.json', 'packages/*/package.json'],
      { cwd: rootDir, absolute: false },
    );

    for (const pkgJsonRel of pkgJsons) {
      const pkgJsonAbs = path.join(rootDir, pkgJsonRel);
      let pkg: Record<string, unknown>;
      try {
        pkg = JSON.parse(fs.readFileSync(pkgJsonAbs, 'utf-8'));
      } catch {
        continue;
      }

      const declaredDeps = new Set([
        ...Object.keys((pkg as { dependencies?: Record<string, string> }).dependencies ?? {}),
        ...Object.keys((pkg as { devDependencies?: Record<string, string> }).devDependencies ?? {}),
        ...Object.keys((pkg as { peerDependencies?: Record<string, string> }).peerDependencies ?? {}),
      ]);

      const pkgDir = path.dirname(pkgJsonRel);
      const sourceFiles = await fg(`${pkgDir}/**/*.{ts,tsx}`, {
        cwd: rootDir,
        absolute: false,
        ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
      });

      const importedPackages = new Set<string>();

      for (const srcFile of sourceFiles) {
        const content = fs.readFileSync(
          path.join(rootDir, srcFile),
          'utf-8',
        );
        IMPORT_SPECIFIER_RE.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = IMPORT_SPECIFIER_RE.exec(content)) !== null) {
          const pkgName = getPackageName(m[1]);
          if (pkgName && !NODE_BUILTINS.has(pkgName)) {
            importedPackages.add(pkgName);
          }
        }
      }

      for (const pkg of importedPackages) {
        if (!declaredDeps.has(pkg) && !rootDeps.has(pkg)) {
          // Skip workspace packages (they're resolved by npm workspaces)
          if (pkg.startsWith('@cveriskpilot/')) continue;

          findings.push({
            id: `missing-dep-${pkgJsonRel}-${pkg}`,
            severity: 'HIGH',
            category: 'missing-deps',
            title: `Undeclared dependency: ${pkg}`,
            detail: `Package \`${pkg}\` is imported but not listed in ${pkgJsonRel}.`,
            file: pkgJsonRel,
            fix: `Add \`${pkg}\` to dependencies in ${pkgJsonRel}.`,
          });
        }
      }
    }

    return findings;
  },
};
