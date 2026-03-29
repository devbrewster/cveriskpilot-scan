import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditCheck, Finding } from '../types.js';

/**
 * Detects fetch() calls where the URL is derived from user input
 * (request body, query params, path params).
 */
const FETCH_CALL_RE = /fetch\s*\(([^)]{1,200})\)/g;
const USER_INPUT_PATTERNS = [
  /body\.\w*url/i,
  /body\.\w*endpoint/i,
  /body\.\w*host/i,
  /body\.\w*target/i,
  /params\.\w*url/i,
  /searchParams\.get\(\s*['"]url['"]\s*\)/i,
  /searchParams\.get\(\s*['"]callback['"]\s*\)/i,
  /searchParams\.get\(\s*['"]redirect['"]\s*\)/i,
  /request\.url/,
];

const URL_VALIDATION_PATTERNS = [
  /new URL\(/,
  /URL\.canParse/,
  /validateUrl/,
  /isValidUrl/,
  /allowedHosts/,
  /allowedDomains/,
  /url\.startsWith\(['"]https:\/\//,
];

export const ssrfVectorsCheck: AuditCheck = {
  name: 'ssrf-vectors',
  description: 'Detect SSRF vectors from unvalidated URL inputs',

  async run(rootDir: string): Promise<Finding[]> {
    const findings: Finding[] = [];

    const routeFiles = await fg('apps/web/app/api/**/route.ts', {
      cwd: rootDir,
      absolute: false,
    });

    for (const relPath of routeFiles) {
      const absPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(absPath, 'utf-8');

      // Skip if the file has URL validation
      const hasValidation = URL_VALIDATION_PATTERNS.some((re) =>
        re.test(content),
      );
      if (hasValidation) continue;

      FETCH_CALL_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = FETCH_CALL_RE.exec(content)) !== null) {
        const fetchArg = m[1];
        const isUserDerived = USER_INPUT_PATTERNS.some((re) =>
          re.test(fetchArg),
        );

        if (isUserDerived) {
          const lineNum = content.slice(0, m.index).split('\n').length;
          findings.push({
            id: `ssrf-${relPath}-L${lineNum}`,
            severity: 'CRITICAL',
            category: 'ssrf-vectors',
            title: 'Potential SSRF — fetch with user-supplied URL',
            detail: `\`fetch(${fetchArg.trim()})\` uses user input as URL without validation.`,
            file: relPath,
            line: lineNum,
            fix: 'Validate and allowlist the URL domain before fetching. Block internal/private IPs.',
          });
        }
      }

      // Also check for dynamic URL construction from body
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          /fetch\s*\(\s*`/.test(line) &&
          /\$\{.*body/.test(line)
        ) {
          findings.push({
            id: `ssrf-template-${relPath}-L${i + 1}`,
            severity: 'HIGH',
            category: 'ssrf-vectors',
            title: 'Potential SSRF — fetch with template literal from body',
            detail: `Template literal fetch URL at line ${i + 1} may include user input.`,
            file: relPath,
            line: i + 1,
            fix: 'Validate and allowlist the URL domain before fetching.',
          });
        }
      }
    }

    return findings;
  },
};
