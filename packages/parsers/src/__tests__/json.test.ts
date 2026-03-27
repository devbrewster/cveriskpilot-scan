import { describe, it, expect } from 'vitest';
import { parseJson } from '../parsers/json.js';

const GENERIC_JSON = JSON.stringify([
  {
    title: 'SQL Injection in login form',
    description: 'The login form is vulnerable to SQL injection. Related to CVE-2023-99999.',
    severity: 'high',
    cve: 'CVE-2023-99999',
    host: 'app.example.com',
    ip: '10.0.0.1',
    port: 8080,
    cvss: 8.5,
  },
  {
    title: 'Outdated jQuery version',
    description: 'jQuery 2.1.0 has known vulnerabilities.',
    severity: 'medium',
    host: 'cdn.example.com',
    package: 'jquery',
    version: '2.1.0',
  },
]);

const TRIVY_JSON = JSON.stringify({
  Results: [
    {
      Target: 'package-lock.json',
      Type: 'npm',
      Vulnerabilities: [
        {
          VulnerabilityID: 'CVE-2024-00001',
          PkgName: 'lodash',
          InstalledVersion: '4.17.19',
          FixedVersion: '4.17.21',
          Title: 'Prototype Pollution in lodash',
          Description: 'lodash before 4.17.21 is vulnerable to prototype pollution.',
          Severity: 'CRITICAL',
          CweIDs: ['CWE-1321'],
          CVSS: {
            nvd: { V3Score: 9.8, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' },
          },
        },
      ],
    },
  ],
});

const SNYK_JSON = JSON.stringify({
  vulnerabilities: [
    {
      id: 'SNYK-JS-LODASH-1018905',
      title: 'Prototype Pollution',
      description: 'lodash prototype pollution vulnerability',
      severity: 'high',
      identifiers: { CVE: ['CVE-2021-23337'], CWE: ['CWE-400'] },
      packageName: 'lodash',
      version: '4.17.19',
      fixedIn: ['4.17.21'],
      cvssScore: 7.2,
    },
  ],
  projectName: 'my-app',
});

describe('JSON Parser', () => {
  it('should parse generic JSON array', async () => {
    const result = await parseJson(GENERIC_JSON);
    expect(result.format).toBe('JSON_FORMAT');
    expect(result.findings).toHaveLength(2);
    expect(result.metadata.totalFindings).toBe(2);
  });

  it('should extract CVE IDs from generic JSON', async () => {
    const result = await parseJson(GENERIC_JSON);
    expect(result.findings[0]!.cveIds).toContain('CVE-2023-99999');
  });

  it('should map severity correctly', async () => {
    const result = await parseJson(GENERIC_JSON);
    expect(result.findings[0]!.severity).toBe('HIGH');
    expect(result.findings[1]!.severity).toBe('MEDIUM');
  });

  it('should extract asset info from generic JSON', async () => {
    const result = await parseJson(GENERIC_JSON);
    const f = result.findings[0]!;
    expect(f.assetName).toBe('app.example.com');
    expect(f.ipAddress).toBe('10.0.0.1');
    expect(f.port).toBe(8080);
  });

  it('should detect and parse Trivy format', async () => {
    const result = await parseJson(TRIVY_JSON);
    expect(result.scannerName).toBe('trivy');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.cveIds).toContain('CVE-2024-00001');
    expect(result.findings[0]!.severity).toBe('CRITICAL');
    expect(result.findings[0]!.packageName).toBe('lodash');
    expect(result.findings[0]!.fixedVersion).toBe('4.17.21');
    expect(result.findings[0]!.cvssScore).toBe(9.8);
  });

  it('should detect and parse Snyk format', async () => {
    const result = await parseJson(SNYK_JSON);
    expect(result.scannerName).toBe('snyk');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.cveIds).toContain('CVE-2021-23337');
    expect(result.findings[0]!.cweIds).toContain('CWE-400');
    expect(result.findings[0]!.severity).toBe('HIGH');
    expect(result.findings[0]!.assetName).toBe('my-app');
  });

  it('should handle invalid JSON gracefully', async () => {
    const result = await parseJson('not json');
    expect(result.findings).toHaveLength(0);
    expect(result.metadata.errors.length).toBeGreaterThan(0);
  });
});
