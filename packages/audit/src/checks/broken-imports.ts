import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditCheck, Finding } from '../types.js';

const IMPORT_RE =
  /import\s+(?:(?:type\s+)?{[^}]*}|[\w*]+(?:\s*,\s*{[^}]*})?)\s+from\s+['"](@cveriskpilot\/[^'"]+|@\/[^'"]+)['"]/g;

export const brokenImportsCheck: AuditCheck = {
  name: 'broken-imports',
  description: 'Detect imports referencing non-existent paths',

  async run(rootDir: string): Promise<Finding[]> {
    const findings: Finding[] = [];

    const sourceFiles = await fg(
      ['apps/web/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
      {
        cwd: rootDir,
        absolute: false,
        ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
      },
    );

    // Build a set of package names that exist
    const pkgDirs = await fg('packages/*/package.json', {
      cwd: rootDir,
      absolute: false,
    });
    const existingPackages = new Set<string>();
    for (const pkgJson of pkgDirs) {
      try {
        const raw = fs.readFileSync(path.join(rootDir, pkgJson), 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.name) existingPackages.add(parsed.name);
      } catch {
        // skip
      }
    }

    for (const relPath of sourceFiles) {
      const absPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(absPath, 'utf-8');

      let m: RegExpExecArray | null;
      IMPORT_RE.lastIndex = 0;
      while ((m = IMPORT_RE.exec(content)) !== null) {
        const importPath = m[1];

        if (importPath.startsWith('@cveriskpilot/')) {
          // Check if the package exists
          const pkgName = `@cveriskpilot/${importPath.split('/')[1]}`;
          if (!existingPackages.has(pkgName)) {
            const lineNum =
              content.slice(0, m.index).split('\n').length;
            findings.push({
              id: `broken-import-${relPath}-L${lineNum}`,
              severity: 'HIGH',
              category: 'broken-imports',
              title: `Import references non-existent package`,
              detail: `Package \`${pkgName}\` is not found in the workspace.`,
              file: relPath,
              line: lineNum,
              fix: `Create the package or update the import to use an existing package.`,
            });
          }
        } else if (importPath.startsWith('@/')) {
          // Resolve @/ alias (typically apps/web/src/)
          const aliasPath = importPath.replace('@/', '');
          // Try common base dirs
          const baseDirs = ['apps/web/src/', 'apps/web/'];
          let found = false;
          for (const base of baseDirs) {
            const candidates = [
              path.join(rootDir, base, aliasPath),
              path.join(rootDir, base, aliasPath + '.ts'),
              path.join(rootDir, base, aliasPath + '.tsx'),
              path.join(rootDir, base, aliasPath, 'index.ts'),
              path.join(rootDir, base, aliasPath, 'index.tsx'),
            ];
            if (candidates.some((c) => fs.existsSync(c))) {
              found = true;
              break;
            }
          }
          if (!found) {
            const lineNum =
              content.slice(0, m.index).split('\n').length;
            findings.push({
              id: `broken-import-${relPath}-L${lineNum}`,
              severity: 'HIGH',
              category: 'broken-imports',
              title: `Import references non-existent module`,
              detail: `Module \`${importPath}\` could not be resolved.`,
              file: relPath,
              line: lineNum,
              fix: `Create the missing module or fix the import path.`,
            });
          }
        }
      }
    }

    return findings;
  },
};
