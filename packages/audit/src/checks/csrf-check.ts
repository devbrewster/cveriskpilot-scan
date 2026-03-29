import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditCheck, Finding } from '../types.js';

/**
 * Routes that are expected to receive external webhooks (no CSRF needed).
 */
const WEBHOOK_PATTERNS = [
  '/api/webhooks',
  '/api/cron',
  '/api/ops/',
  '/api/health',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/google',
  '/api/auth/dev-session',
];

const MUTATING_HANDLER_RE =
  /export\s+(?:async\s+)?function\s+(POST|PUT|PATCH|DELETE)\s*\(/g;

const CSRF_PATTERNS = [
  /csrf/i,
  /verifyCsrf/i,
  /csrfToken/i,
  /x-csrf-token/i,
  /validateCsrf/i,
];

export const csrfCheck: AuditCheck = {
  name: 'csrf-check',
  description: 'Detect state-changing routes without CSRF protection',

  async run(rootDir: string): Promise<Finding[]> {
    const findings: Finding[] = [];

    const routeFiles = await fg('apps/web/app/api/**/route.ts', {
      cwd: rootDir,
      absolute: false,
    });

    for (const relPath of routeFiles) {
      const normalized = relPath.replace(/\\/g, '/');
      if (WEBHOOK_PATTERNS.some((p) => normalized.includes(p))) continue;

      const absPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(absPath, 'utf-8');

      // Check for mutating handlers
      MUTATING_HANDLER_RE.lastIndex = 0;
      const handlers: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = MUTATING_HANDLER_RE.exec(content)) !== null) {
        handlers.push(m[1]);
      }

      if (handlers.length === 0) continue;

      // Check for CSRF validation
      const hasCsrf = CSRF_PATTERNS.some((re) => re.test(content));
      if (hasCsrf) continue;

      for (const method of handlers) {
        findings.push({
          id: `csrf-missing-${relPath}-${method}`,
          severity: 'MEDIUM',
          category: 'csrf-check',
          title: `${method} handler without CSRF protection`,
          detail: `No CSRF token validation found in ${method} handler.`,
          file: relPath,
          fix: 'Add CSRF token validation or document why it is not needed (e.g., API-only route with bearer auth).',
        });
      }
    }

    return findings;
  },
};
