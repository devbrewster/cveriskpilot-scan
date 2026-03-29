import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditCheck, Finding } from '../types.js';

const MOCK_IMPORT_RE =
  /import\s+.*from\s+['"].*(?:mock-data|mock-findings|demo-data|fake-data)['"]/gi;

const MOCK_VARIABLE_RE =
  /(?:const|let|var)\s+\w*(?:mock|MOCK|fake|dummy|FAKE|DUMMY)\w*\s*[=:]/g;

export const mockDataCheck: AuditCheck = {
  name: 'mock-data',
  description: 'Detect mock/demo data remnants in API routes',

  async run(rootDir: string): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Check API routes
    const apiRoutes = await fg('apps/web/app/api/**/route.ts', {
      cwd: rootDir,
      absolute: false,
    });

    for (const relPath of apiRoutes) {
      const absPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(absPath, 'utf-8');
      const lines = content.split('\n');

      // Check for mock imports
      for (let i = 0; i < lines.length; i++) {
        if (MOCK_IMPORT_RE.test(lines[i])) {
          findings.push({
            id: `mock-import-${relPath}-L${i + 1}`,
            severity: 'HIGH',
            category: 'mock-data',
            title: 'Mock data import in API route',
            detail: `API route imports mock/demo data: \`${lines[i].trim()}\``,
            file: relPath,
            line: i + 1,
            fix: 'Replace mock data import with real Prisma queries.',
          });
        }
        MOCK_IMPORT_RE.lastIndex = 0;
      }

      // Check for mock variables
      for (let i = 0; i < lines.length; i++) {
        if (MOCK_VARIABLE_RE.test(lines[i])) {
          findings.push({
            id: `mock-var-${relPath}-L${i + 1}`,
            severity: 'MEDIUM',
            category: 'mock-data',
            title: 'Mock/fake data variable in API route',
            detail: `Variable with mock/fake/dummy in name: \`${lines[i].trim()}\``,
            file: relPath,
            line: i + 1,
            fix: 'Replace with real data from database.',
          });
        }
        MOCK_VARIABLE_RE.lastIndex = 0;
      }

      // Check for API routes that never call prisma (likely returning hardcoded data)
      // Skip auth routes and known non-DB routes
      const normalized = relPath.replace(/\\/g, '/');
      if (
        !normalized.includes('/api/auth/') &&
        !normalized.includes('/api/health') &&
        !normalized.includes('/api/docs') &&
        !normalized.includes('/api/stream') &&
        !normalized.includes('/api/ops/')
      ) {
        if (
          !content.includes('prisma.') &&
          !content.includes('prisma[') &&
          content.length > 100
        ) {
          findings.push({
            id: `no-prisma-${relPath}`,
            severity: 'MEDIUM',
            category: 'mock-data',
            title: 'API route with no Prisma queries',
            detail:
              'Route handler never calls Prisma — may be returning hardcoded/mock data.',
            file: relPath,
            fix: 'Verify the route reads from the database instead of returning static data.',
          });
        }
      }
    }

    // Check components for mock imports
    const components = await fg(
      'apps/web/src/components/**/*.{ts,tsx}',
      { cwd: rootDir, absolute: false },
    );

    for (const relPath of components) {
      const absPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(absPath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (MOCK_IMPORT_RE.test(lines[i])) {
          findings.push({
            id: `mock-import-${relPath}-L${i + 1}`,
            severity: 'MEDIUM',
            category: 'mock-data',
            title: 'Mock data import in component',
            detail: `Component imports mock/demo data: \`${lines[i].trim()}\``,
            file: relPath,
            line: i + 1,
            fix: 'Replace mock data with real API calls or props.',
          });
        }
        MOCK_IMPORT_RE.lastIndex = 0;
      }
    }

    return findings;
  },
};
