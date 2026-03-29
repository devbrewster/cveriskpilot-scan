import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditCheck, Finding, Severity } from '../types.js';

/**
 * Public routes that legitimately skip auth.
 * Paths are relative to apps/web/app/api/.
 */
const PUBLIC_ROUTE_PATTERNS = [
  'auth/login',
  'auth/signup',
  'auth/google',
  'auth/google/callback',
  'auth/dev-session',
  'auth/mfa',
  'health',
  'docs',
  'webhooks',
  'cron',
  'ops',
];

function isPublicRoute(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return PUBLIC_ROUTE_PATTERNS.some((p) => normalized.includes(`/api/${p}`));
}

const AUTH_PATTERNS = [
  /getServerSession/,
  /getSession/,
  /verifySession/,
  /requireAuth/,
  /authenticate/i,
  /session\s*=\s*await/,
];

const HANDLER_RE =
  /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;

function detectHandlers(content: string): string[] {
  const handlers: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = HANDLER_RE.exec(content)) !== null) {
    handlers.push(m[1]);
  }
  return handlers;
}

function hasAuthCall(content: string): boolean {
  return AUTH_PATTERNS.some((re) => re.test(content));
}

export const authChecks: AuditCheck = {
  name: 'auth-checks',
  description: 'Detect API routes missing authentication',

  async run(rootDir: string): Promise<Finding[]> {
    const findings: Finding[] = [];
    const routeFiles = await fg('apps/web/app/api/**/route.ts', {
      cwd: rootDir,
      absolute: false,
    });

    for (const relPath of routeFiles) {
      if (isPublicRoute(relPath)) continue;

      const absPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(absPath, 'utf-8');
      const handlers = detectHandlers(content);

      if (handlers.length === 0) continue;
      if (hasAuthCall(content)) continue;

      const mutatingMethods = handlers.filter((h) =>
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(h),
      );
      const readMethods = handlers.filter((h) => h === 'GET');

      for (const method of mutatingMethods) {
        findings.push({
          id: `auth-missing-${relPath}-${method}`,
          severity: 'CRITICAL' as Severity,
          category: 'auth',
          title: `${method} handler missing authentication`,
          detail: `No auth check found in ${method} handler. State-changing endpoints must verify session.`,
          file: relPath,
          fix: `Add \`const session = await getServerSession(request);\` and return 401 if null.`,
        });
      }

      for (const method of readMethods) {
        findings.push({
          id: `auth-missing-${relPath}-${method}`,
          severity: 'HIGH' as Severity,
          category: 'auth',
          title: `${method} handler missing authentication`,
          detail: `No auth check found in GET handler. Data endpoints should verify session.`,
          file: relPath,
          fix: `Add \`const session = await getServerSession(request);\` and return 401 if null.`,
        });
      }
    }

    return findings;
  },
};
