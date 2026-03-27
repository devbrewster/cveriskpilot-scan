import { describe, it, expect } from 'vitest';
import { parseCycloneDx } from '../parsers/cyclonedx';

const MINIMAL_CDX = JSON.stringify({
  bomFormat: 'CycloneDX',
  specVersion: '1.4',
  metadata: {
    tools: [{ name: 'grype', vendor: 'anchore' }],
  },
  components: [
    {
      'bom-ref': 'pkg:npm/express@4.17.1',
      type: 'library',
      name: 'express',
      version: '4.17.1',
      purl: 'pkg:npm/express@4.17.1',
    },
    {
      'bom-ref': 'pkg:npm/lodash@4.17.19',
      type: 'library',
      group: 'org.example',
      name: 'lodash',
      version: '4.17.19',
      purl: 'pkg:npm/lodash@4.17.19',
    },
  ],
  vulnerabilities: [
    {
      id: 'CVE-2024-29041',
      description: 'Express.js open redirect vulnerability',
      source: { name: 'NVD' },
      ratings: [
        {
          severity: 'high',
          score: 7.5,
          vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
          method: 'CVSSv31',
        },
      ],
      cwes: [601],
      affects: [{ ref: 'pkg:npm/express@4.17.1' }],
    },
    {
      id: 'CVE-2021-23337',
      description: 'Prototype pollution in lodash',
      ratings: [
        {
          severity: 'critical',
          score: 9.8,
        },
      ],
      cwes: [1321, 400],
      affects: [{ ref: 'pkg:npm/lodash@4.17.19' }],
    },
  ],
});

describe('CycloneDX Parser', () => {
  it('should parse a valid CycloneDX BOM', async () => {
    const result = await parseCycloneDx(MINIMAL_CDX);
    expect(result.format).toBe('CYCLONEDX');
    expect(result.findings).toHaveLength(2);
    expect(result.metadata.totalFindings).toBe(2);
    expect(result.metadata.errors).toHaveLength(0);
  });

  it('should extract CVE IDs correctly', async () => {
    const result = await parseCycloneDx(MINIMAL_CDX);
    expect(result.findings[0]!.cveIds).toContain('CVE-2024-29041');
    expect(result.findings[1]!.cveIds).toContain('CVE-2021-23337');
  });

  it('should map severity correctly', async () => {
    const result = await parseCycloneDx(MINIMAL_CDX);
    expect(result.findings[0]!.severity).toBe('HIGH');
    expect(result.findings[1]!.severity).toBe('CRITICAL');
  });

  it('should extract component info', async () => {
    const result = await parseCycloneDx(MINIMAL_CDX);
    const f0 = result.findings[0]!;
    expect(f0.packageName).toBe('express');
    expect(f0.packageVersion).toBe('4.17.1');
    expect(f0.packageEcosystem).toBe('npm');
    expect(f0.assetName).toBe('express');
  });

  it('should handle grouped component names', async () => {
    const result = await parseCycloneDx(MINIMAL_CDX);
    const f1 = result.findings[1]!;
    expect(f1.packageName).toBe('org.example/lodash');
  });

  it('should extract CVSS info', async () => {
    const result = await parseCycloneDx(MINIMAL_CDX);
    const f = result.findings[0]!;
    expect(f.cvssScore).toBe(7.5);
    expect(f.cvssVector).toBe('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N');
    expect(f.cvssVersion).toBe('31');
  });

  it('should extract CWE IDs', async () => {
    const result = await parseCycloneDx(MINIMAL_CDX);
    expect(result.findings[0]!.cweIds).toContain('CWE-601');
    expect(result.findings[1]!.cweIds).toContain('CWE-1321');
    expect(result.findings[1]!.cweIds).toContain('CWE-400');
  });

  it('should set scannerType to SCA', async () => {
    const result = await parseCycloneDx(MINIMAL_CDX);
    expect(result.findings[0]!.scannerType).toBe('SCA');
  });

  it('should extract tool name from metadata', async () => {
    const result = await parseCycloneDx(MINIMAL_CDX);
    expect(result.scannerName).toBe('grype');
  });

  it('should handle invalid JSON gracefully', async () => {
    const result = await parseCycloneDx('not json');
    expect(result.findings).toHaveLength(0);
    expect(result.metadata.errors.length).toBeGreaterThan(0);
  });
});
