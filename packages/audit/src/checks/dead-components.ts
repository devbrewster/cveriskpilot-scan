import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditCheck, Finding } from '../types.js';

/**
 * Extract the primary export name from a component file.
 * Handles: export function Foo, export default function Foo, export const Foo
 */
function getExportNames(content: string): string[] {
  const names: string[] = [];
  const patterns = [
    /export\s+(?:default\s+)?function\s+(\w+)/g,
    /export\s+(?:default\s+)?const\s+(\w+)/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      names.push(m[1]);
    }
  }
  return names;
}

export const deadComponentsCheck: AuditCheck = {
  name: 'dead-components',
  description: 'Detect components never imported by any page or other component',

  async run(rootDir: string): Promise<Finding[]> {
    const findings: Finding[] = [];

    const componentFiles = await fg(
      'apps/web/src/components/**/*.{ts,tsx}',
      {
        cwd: rootDir,
        absolute: false,
        ignore: ['**/index.ts'],
      },
    );

    // Read all potential consumer files (pages, layouts, other components)
    const consumerFiles = await fg(
      ['apps/web/app/**/*.{ts,tsx}', 'apps/web/src/**/*.{ts,tsx}'],
      {
        cwd: rootDir,
        absolute: false,
        ignore: ['**/node_modules/**', '**/.next/**'],
      },
    );

    // Build a map of file path to content for consumers
    const consumerContents: string[] = [];
    for (const f of consumerFiles) {
      consumerContents.push(
        fs.readFileSync(path.join(rootDir, f), 'utf-8'),
      );
    }
    const allConsumerText = consumerContents.join('\n');

    for (const compPath of componentFiles) {
      const absPath = path.join(rootDir, compPath);
      const content = fs.readFileSync(absPath, 'utf-8');
      const exportNames = getExportNames(content);

      if (exportNames.length === 0) continue;

      // Derive the import path fragment from the file path
      // e.g., components/dashboard/sla-widget -> '@/components/dashboard/sla-widget'
      const importFragment = compPath
        .replace('apps/web/src/', '')
        .replace(/\.tsx?$/, '');

      // Check if either the export name or the import path appears in any consumer
      const isImported =
        allConsumerText.includes(importFragment) ||
        exportNames.some((name) => {
          // Look for import { Name } or import Name patterns, or JSX <Name
          const importPattern = new RegExp(
            `(?:import[^}]*\\b${name}\\b|<${name}[\\s/>])`,
          );
          return importPattern.test(allConsumerText);
        });

      if (!isImported) {
        // Don't flag if the component is imported by itself (self-reference in same dir)
        const dirImportFragment = path.dirname(importFragment);
        const isSelfReference = allConsumerText.includes(dirImportFragment);

        // Only flag if truly unreferenced
        if (!isSelfReference) {
          findings.push({
            id: `dead-component-${compPath}`,
            severity: 'MEDIUM',
            category: 'dead-components',
            title: `Unused component: ${exportNames[0]}`,
            detail: `Component \`${exportNames[0]}\` in \`${compPath}\` is never imported by any page or component.`,
            file: compPath,
            fix: 'Remove the component or wire it into a page.',
          });
        }
      }
    }

    return findings;
  },
};
