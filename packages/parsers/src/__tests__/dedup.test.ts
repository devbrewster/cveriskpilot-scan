import { describe, it, expect } from 'vitest';
import { generateDedupKey, deduplicateFindings } from '../dedup.js';
import type { CanonicalFinding } from '../types.js';

function makeFinding(overrides: Partial<CanonicalFinding> = {}): CanonicalFinding {
  return {
    title: 'Test Finding',
    description: 'A test finding',
    cveIds: [],
    cweIds: [],
    severity: 'MEDIUM',
    scannerType: 'VM',
    scannerName: 'test',
    assetName: 'host1',
    rawObservations: {},
    discoveredAt: new Date(),
    ...overrides,
  };
}

describe('generateDedupKey', () => {
  it('should generate a hex SHA-256 hash', async () => {
    const finding = makeFinding({ cveIds: ['CVE-2023-12345'] });
    const key = await generateDedupKey('org1', 'client1', finding);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should produce the same key for the same inputs', async () => {
    const finding = makeFinding({ cveIds: ['CVE-2023-12345'], assetName: 'server1', port: 443 });
    const key1 = await generateDedupKey('org1', 'client1', finding);
    const key2 = await generateDedupKey('org1', 'client1', finding);
    expect(key1).toBe(key2);
  });

  it('should produce different keys for different CVEs', async () => {
    const f1 = makeFinding({ cveIds: ['CVE-2023-11111'] });
    const f2 = makeFinding({ cveIds: ['CVE-2023-22222'] });
    const key1 = await generateDedupKey('org1', 'client1', f1);
    const key2 = await generateDedupKey('org1', 'client1', f2);
    expect(key1).not.toBe(key2);
  });

  it('should use title when no CVE is present', async () => {
    const f1 = makeFinding({ title: 'Finding A' });
    const f2 = makeFinding({ title: 'Finding B' });
    const key1 = await generateDedupKey('org1', 'client1', f1);
    const key2 = await generateDedupKey('org1', 'client1', f2);
    expect(key1).not.toBe(key2);
  });

  it('should include port in the key', async () => {
    const f1 = makeFinding({ cveIds: ['CVE-2023-12345'], port: 80 });
    const f2 = makeFinding({ cveIds: ['CVE-2023-12345'], port: 443 });
    const key1 = await generateDedupKey('org1', 'client1', f1);
    const key2 = await generateDedupKey('org1', 'client1', f2);
    expect(key1).not.toBe(key2);
  });
});

describe('deduplicateFindings', () => {
  it('should remove duplicate findings based on CVE+asset+port', () => {
    const findings = [
      makeFinding({ cveIds: ['CVE-2023-12345'], assetName: 'host1', port: 443 }),
      makeFinding({ cveIds: ['CVE-2023-12345'], assetName: 'host1', port: 443 }),
      makeFinding({ cveIds: ['CVE-2023-67890'], assetName: 'host1', port: 443 }),
    ];
    const deduped = deduplicateFindings(findings);
    expect(deduped).toHaveLength(2);
  });

  it('should keep findings with different assets', () => {
    const findings = [
      makeFinding({ cveIds: ['CVE-2023-12345'], assetName: 'host1' }),
      makeFinding({ cveIds: ['CVE-2023-12345'], assetName: 'host2' }),
    ];
    const deduped = deduplicateFindings(findings);
    expect(deduped).toHaveLength(2);
  });

  it('should use title for dedup when no CVE', () => {
    const findings = [
      makeFinding({ title: 'Same Finding', assetName: 'host1' }),
      makeFinding({ title: 'Same Finding', assetName: 'host1' }),
      makeFinding({ title: 'Different Finding', assetName: 'host1' }),
    ];
    const deduped = deduplicateFindings(findings);
    expect(deduped).toHaveLength(2);
  });

  it('should keep first occurrence', () => {
    const findings = [
      makeFinding({ cveIds: ['CVE-2023-12345'], assetName: 'host1', description: 'first' }),
      makeFinding({ cveIds: ['CVE-2023-12345'], assetName: 'host1', description: 'second' }),
    ];
    const deduped = deduplicateFindings(findings);
    expect(deduped[0]!.description).toBe('first');
  });
});
