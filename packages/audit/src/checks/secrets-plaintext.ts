import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditCheck, Finding } from '../types.js';

/**
 * Field names that should be encrypted before storing in the DB.
 */
const SENSITIVE_FIELD_RE =
  /(?:secret|password|clientSecret|apiToken|apiKey|accessToken|refreshToken|privateKey)\s*[:=]/gi;

/**
 * Prisma write operations.
 */
const PRISMA_WRITE_RE =
  /prisma\.\w+\.(?:create|update|upsert)\s*\(\s*\{/g;

const ENCRYPTION_PATTERNS = [
  /encrypt\(/,
  /encryptField\(/,
  /encryptValue\(/,
  /aesEncrypt\(/,
  /hashPassword\(/,
  /bcrypt\.hash\(/,
  /argon2\.hash\(/,
  /createCipheriv\(/,
];

export const secretsPlaintextCheck: AuditCheck = {
  name: 'secrets-plaintext',
  description: 'Detect unencrypted secrets in DB storage code',

  async run(rootDir: string): Promise<Finding[]> {
    const findings: Finding[] = [];

    const sourceFiles = await fg(
      ['apps/web/app/api/**/*.ts', 'packages/*/src/**/*.ts'],
      {
        cwd: rootDir,
        absolute: false,
        ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
      },
    );

    for (const relPath of sourceFiles) {
      const absPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(absPath, 'utf-8');

      // Only check files that do Prisma writes
      if (!PRISMA_WRITE_RE.test(content)) continue;
      PRISMA_WRITE_RE.lastIndex = 0;

      // Check if the file has encryption calls
      const hasEncryption = ENCRYPTION_PATTERNS.some((re) =>
        re.test(content),
      );
      if (hasEncryption) continue;

      // Now look for sensitive fields being written
      SENSITIVE_FIELD_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = SENSITIVE_FIELD_RE.exec(content)) !== null) {
        const lineNum = content.slice(0, m.index).split('\n').length;
        const line = content.split('\n')[lineNum - 1]?.trim() ?? '';

        // Skip if the line references an encrypted variable
        if (
          /encrypted/i.test(line) ||
          /hashed/i.test(line) ||
          /hash\(/i.test(line)
        ) {
          continue;
        }

        findings.push({
          id: `secrets-plaintext-${relPath}-L${lineNum}`,
          severity: 'CRITICAL',
          category: 'secrets-plaintext',
          title: 'Sensitive field stored without encryption',
          detail: `\`${m[0].trim()}\` at line ${lineNum} appears to store a secret in plaintext.`,
          file: relPath,
          line: lineNum,
          fix: 'Encrypt the value using `encrypt()` from @cveriskpilot/auth before storing.',
        });
      }
    }

    return findings;
  },
};
