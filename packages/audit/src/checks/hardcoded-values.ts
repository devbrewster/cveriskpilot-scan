import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditCheck, Finding, Severity } from '../types.js';

interface HardcodedPattern {
  re: RegExp;
  severity: Severity;
  title: string;
  fix: string;
}

const PATTERNS: HardcodedPattern[] = [
  {
    re: /['"]org-default['"]/g,
    severity: 'HIGH',
    title: 'Hardcoded org-default value',
    fix: 'Use session.organizationId instead of hardcoded org-default.',
  },
  {
    re: /['"]demo-org['"]/g,
    severity: 'HIGH',
    title: 'Hardcoded demo-org value',
    fix: 'Use session.organizationId or a proper demo flag.',
  },
  {
    re: /organizationId\s*\?\?\s*['"]/g,
    severity: 'HIGH',
    title: 'organizationId with hardcoded fallback',
    fix: 'Require organizationId from session; do not fall back to a string literal.',
  },
  {
    re: /tier\s*\?\?\s*['"](?:PRO|FREE|ENTERPRISE)['"]/g,
    severity: 'MEDIUM',
    title: 'Billing tier with hardcoded fallback',
    fix: 'Read the tier from the organization record, not a string fallback.',
  },
  {
    re: /['"]user-default['"]/g,
    severity: 'MEDIUM',
    title: 'Hardcoded user-default value',
    fix: 'Use the actual user ID from session.',
  },
];

export const hardcodedValuesCheck: AuditCheck = {
  name: 'hardcoded-values',
  description: 'Detect hardcoded org IDs, tiers, and placeholder values',

  async run(rootDir: string): Promise<Finding[]> {
    const findings: Finding[] = [];

    const sourceFiles = await fg(
      ['apps/web/app/api/**/*.ts', 'apps/web/src/**/*.{ts,tsx}'],
      {
        cwd: rootDir,
        absolute: false,
        ignore: ['**/node_modules/**', '**/.next/**'],
      },
    );

    for (const relPath of sourceFiles) {
      const absPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(absPath, 'utf-8');

      for (const pattern of PATTERNS) {
        pattern.re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = pattern.re.exec(content)) !== null) {
          const lineNum = content.slice(0, m.index).split('\n').length;
          findings.push({
            id: `hardcoded-${relPath}-L${lineNum}`,
            severity: pattern.severity,
            category: 'hardcoded-values',
            title: pattern.title,
            detail: `Found \`${m[0]}\` at line ${lineNum}.`,
            file: relPath,
            line: lineNum,
            fix: pattern.fix,
          });
        }
      }
    }

    return findings;
  },
};
