import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditCheck, Finding } from '../types.js';

export const barrelExportsCheck: AuditCheck = {
  name: 'barrel-exports',
  description: 'Detect broken or empty barrel exports in packages',

  async run(rootDir: string): Promise<Finding[]> {
    const findings: Finding[] = [];

    const indexFiles = await fg('packages/*/src/index.ts', {
      cwd: rootDir,
      absolute: false,
    });

    for (const relPath of indexFiles) {
      const absPath = path.join(rootDir, relPath);

      if (!fs.existsSync(absPath)) {
        findings.push({
          id: `barrel-missing-${relPath}`,
          severity: 'HIGH',
          category: 'barrel-exports',
          title: 'Missing barrel export index.ts',
          detail: `Expected barrel export file does not exist.`,
          file: relPath,
          fix: 'Create index.ts with proper exports.',
        });
        continue;
      }

      const content = fs.readFileSync(absPath, 'utf-8').trim();

      // Check if empty
      if (content.length === 0) {
        findings.push({
          id: `barrel-empty-${relPath}`,
          severity: 'CRITICAL',
          category: 'barrel-exports',
          title: 'Empty barrel export',
          detail: 'Barrel index.ts is completely empty. Nothing is exported from this package.',
          file: relPath,
          fix: 'Add export statements for the package public API.',
        });
        continue;
      }

      // Check if only empty export
      if (content === 'export {};' || content === 'export { };') {
        findings.push({
          id: `barrel-empty-export-${relPath}`,
          severity: 'CRITICAL',
          category: 'barrel-exports',
          title: 'Barrel export has no real exports',
          detail: 'Barrel index.ts only contains `export {}` — nothing is actually exported.',
          file: relPath,
          fix: 'Add export statements for the package public API.',
        });
        continue;
      }

      // Check re-exports point to existing files
      const reExportRe = /export\s+(?:\*|{[^}]*})\s+from\s+['"]\.\/([^'"]+)['"]/g;
      let m: RegExpExecArray | null;
      while ((m = reExportRe.exec(content)) !== null) {
        const target = m[1];
        const pkgDir = path.dirname(absPath);
        // Try common extensions
        const candidates = [
          path.join(pkgDir, target),
          path.join(pkgDir, target + '.ts'),
          path.join(pkgDir, target + '.tsx'),
          path.join(pkgDir, target, 'index.ts'),
        ];
        const exists = candidates.some((c) => fs.existsSync(c));
        if (!exists) {
          findings.push({
            id: `barrel-broken-reexport-${relPath}-${target}`,
            severity: 'HIGH',
            category: 'barrel-exports',
            title: 'Broken re-export in barrel',
            detail: `Re-export target \`${target}\` does not exist in the package.`,
            file: relPath,
            fix: `Create the missing module or remove the re-export.`,
          });
        }
      }
    }

    return findings;
  },
};
