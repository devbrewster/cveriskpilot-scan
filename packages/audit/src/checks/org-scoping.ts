import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditCheck, Finding } from '../types.js';

/**
 * Prisma query methods that typically need org-scoping.
 */
const PRISMA_QUERY_RE =
  /prisma\.\w+\.(findMany|findFirst|findUnique|count|aggregate|groupBy|updateMany|deleteMany)\s*\(/g;

/**
 * Routes where org-scoping is not expected (platform-wide queries).
 */
const SKIP_PATTERNS = [
  '/api/auth/',
  '/api/health',
  '/api/docs',
  '/api/webhooks',
  '/api/cron',
  '/api/ops/',
  '/api/admin',
];

function shouldSkip(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return SKIP_PATTERNS.some((p) => normalized.includes(p));
}

export const orgScopingCheck: AuditCheck = {
  name: 'org-scoping',
  description: 'Detect Prisma queries missing organizationId scoping',

  async run(rootDir: string): Promise<Finding[]> {
    const findings: Finding[] = [];
    const routeFiles = await fg('apps/web/app/api/**/route.ts', {
      cwd: rootDir,
      absolute: false,
    });

    for (const relPath of routeFiles) {
      if (shouldSkip(relPath)) continue;

      const absPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(absPath, 'utf-8');

      let m: RegExpExecArray | null;
      PRISMA_QUERY_RE.lastIndex = 0;
      while ((m = PRISMA_QUERY_RE.exec(content)) !== null) {
        const matchIndex = m.index;
        // Get surrounding context (next ~200 chars after the match)
        const context = content.slice(matchIndex, matchIndex + 300);

        // Check if organizationId appears in the where clause nearby
        if (
          !context.includes('organizationId') &&
          !context.includes('orgId')
        ) {
          // Determine line number
          const upToMatch = content.slice(0, matchIndex);
          const lineNum = upToMatch.split('\n').length;

          findings.push({
            id: `org-scope-${relPath}-L${lineNum}`,
            severity: 'HIGH',
            category: 'org-scoping',
            title: `Prisma query without organizationId scoping`,
            detail: `\`${m[0].trim()}\` at line ${lineNum} does not include organizationId in the where clause, risking cross-tenant data leakage.`,
            file: relPath,
            line: lineNum,
            fix: `Add \`organizationId: session.organizationId\` to the where clause.`,
          });
        }
      }
    }

    return findings;
  },
};
