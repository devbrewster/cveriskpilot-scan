import { describe, it, expect } from 'vitest';
import { parseSarif } from '../parsers/sarif.js';

const MINIMAL_SARIF = JSON.stringify({
  $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
  version: '2.1.0',
  runs: [
    {
      tool: {
        driver: {
          name: 'semgrep',
          rules: [
            {
              id: 'js/sql-injection',
              name: 'SQL Injection',
              shortDescription: { text: 'Possible SQL injection' },
              fullDescription: { text: 'User input is used directly in a SQL query, which may lead to SQL injection. CVE-2023-11111' },
              defaultConfiguration: { level: 'error' },
            },
            {
              id: 'js/xss',
              name: 'Cross-Site Scripting',
              shortDescription: { text: 'Possible XSS vulnerability' },
              fullDescription: { text: 'Unsanitized user input rendered in HTML output.' },
              defaultConfiguration: { level: 'warning' },
            },
          ],
        },
      },
      results: [
        {
          ruleId: 'js/sql-injection',
          ruleIndex: 0,
          level: 'error',
          message: { text: 'SQL injection vulnerability found' },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: 'src/api/users.ts' },
                region: { startLine: 42, snippet: { text: 'db.query(`SELECT * FROM users WHERE id = ${userId}`)' } },
              },
            },
          ],
        },
        {
          ruleId: 'js/xss',
          ruleIndex: 1,
          level: 'warning',
          message: { text: 'XSS vulnerability found' },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: 'src/views/profile.tsx' },
                region: { startLine: 15 },
              },
            },
          ],
        },
      ],
    },
  ],
});

describe('SARIF Parser', () => {
  it('should parse valid SARIF 2.1.0 JSON', async () => {
    const result = await parseSarif(MINIMAL_SARIF);
    expect(result.format).toBe('SARIF');
    expect(result.scannerName).toBe('semgrep');
    expect(result.findings).toHaveLength(2);
    expect(result.metadata.totalFindings).toBe(2);
    expect(result.metadata.errors).toHaveLength(0);
  });

  it('should extract CVE IDs from rule descriptions', async () => {
    const result = await parseSarif(MINIMAL_SARIF);
    expect(result.findings[0]!.cveIds).toContain('CVE-2023-11111');
  });

  it('should map severity levels correctly', async () => {
    const result = await parseSarif(MINIMAL_SARIF);
    expect(result.findings[0]!.severity).toBe('HIGH'); // error -> HIGH
    expect(result.findings[1]!.severity).toBe('MEDIUM'); // warning -> MEDIUM
  });

  it('should extract file location info', async () => {
    const result = await parseSarif(MINIMAL_SARIF);
    const f = result.findings[0]!;
    expect(f.assetName).toBe('src/api/users.ts');
    expect(f.filePath).toBe('src/api/users.ts');
    expect(f.lineNumber).toBe(42);
    expect(f.snippet).toBe('db.query(`SELECT * FROM users WHERE id = ${userId}`)');
  });

  it('should derive scanner type from tool name', async () => {
    const result = await parseSarif(MINIMAL_SARIF);
    expect(result.findings[0]!.scannerType).toBe('SAST');
    expect(result.findings[0]!.scannerName).toBe('semgrep');
  });

  it('should handle invalid JSON gracefully', async () => {
    const result = await parseSarif('not json');
    expect(result.findings).toHaveLength(0);
    expect(result.metadata.errors.length).toBeGreaterThan(0);
  });
});
