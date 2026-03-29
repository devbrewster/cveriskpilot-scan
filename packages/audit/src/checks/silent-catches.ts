import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditCheck, Finding } from '../types.js';

/**
 * Matches catch blocks that are empty or contain only a comment.
 * Covers: catch { }, catch (e) { }, catch (err) { // ignored }
 */
const EMPTY_CATCH_RE =
  /catch\s*(?:\([^)]*\))?\s*\{(\s*(?:\/\/[^\n]*)?\s*)\}/g;

export const silentCatchesCheck: AuditCheck = {
  name: 'silent-catches',
  description: 'Detect empty catch blocks that swallow errors',

  async run(rootDir: string): Promise<Finding[]> {
    const findings: Finding[] = [];

    const sourceFiles = await fg(
      ['apps/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
      {
        cwd: rootDir,
        absolute: false,
        ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
      },
    );

    for (const relPath of sourceFiles) {
      const absPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(absPath, 'utf-8');

      EMPTY_CATCH_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = EMPTY_CATCH_RE.exec(content)) !== null) {
        const body = m[1].trim();
        // Allow catches that explicitly document the skip with a meaningful comment
        // like "// Redis not available — skip rate limiting"
        // But flag completely empty catches and single-word comments like "// ignored"
        const isJustComment =
          body.startsWith('//') && body.replace(/^\/\/\s*/, '').length < 20;
        const isEmpty = body.length === 0;

        if (isEmpty || isJustComment) {
          const lineNum = content.slice(0, m.index).split('\n').length;
          findings.push({
            id: `silent-catch-${relPath}-L${lineNum}`,
            severity: 'MEDIUM',
            category: 'silent-catches',
            title: 'Empty catch block swallows errors',
            detail: isEmpty
              ? `Empty catch block at line ${lineNum} silently discards errors.`
              : `Catch block at line ${lineNum} has only a brief comment: \`${body}\`.`,
            file: relPath,
            line: lineNum,
            fix: 'Log the error or re-throw it. Use `console.error(err)` at minimum.',
          });
        }
      }
    }

    return findings;
  },
};
