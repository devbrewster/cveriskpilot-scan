import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EnrichedFinding } from '@cveriskpilot/enrichment';
import { buildCases } from '../case-builder/case-builder';
import { resolveAssets } from '../case-builder/asset-resolver';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFinding(overrides: Partial<EnrichedFinding> = {}): EnrichedFinding {
  return {
    title: 'Test Vulnerability',
    description: 'A test vulnerability description',
    cveIds: ['CVE-2024-1234'],
    cweIds: ['CWE-79'],
    severity: 'HIGH',
    cvssScore: 7.5,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
    cvssVersion: '3.1',
    scannerType: 'VM',
    scannerName: 'Nessus',
    assetName: 'web-server',
    rawObservations: {},
    discoveredAt: new Date('2024-06-01T00:00:00Z'),
    riskScore: {
      score: 75,
      breakdown: { base: 75, epssMultiplier: 1, kevBoost: 0, envMultiplier: 1 },
      riskLevel: 'HIGH',
    },
    ...overrides,
  };
}

let idCounter = 0;

function createMockPrisma() {
  const createdAssets: any[] = [];
  const createdFindings: any[] = [];
  const createdCases: any[] = [];
  const updatedCases: any[] = [];

  const prisma = {
    asset: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) => {
        const asset = { id: `asset-${++idCounter}`, ...data };
        createdAssets.push(asset);
        return Promise.resolve(asset);
      }),
    },
    vulnerabilityCase: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) => {
        const vc = { id: `case-${++idCounter}`, ...data };
        createdCases.push(vc);
        return Promise.resolve(vc);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        updatedCases.push({ id: where.id, ...data });
        return Promise.resolve({ id: where.id, ...data });
      }),
    },
    finding: {
      create: vi.fn().mockImplementation(({ data }) => {
        const f = { id: `finding-${++idCounter}`, ...data };
        createdFindings.push(f);
        return Promise.resolve(f);
      }),
    },
  };

  return { prisma, createdAssets, createdFindings, createdCases, updatedCases };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildCases', () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it('should group findings by primary CVE ID', async () => {
    const { prisma, createdCases } = createMockPrisma();

    const findings = [
      makeFinding({ assetName: 'host-a' }),
      makeFinding({ assetName: 'host-b' }),
      makeFinding({
        cveIds: ['CVE-2024-5678'],
        assetName: 'host-c',
        title: 'Other Vuln',
      }),
    ];

    const result = await buildCases({
      organizationId: 'org-1',
      clientId: 'client-1',
      findings,
      prisma,
    });

    // 2 distinct CVEs => 2 cases
    expect(createdCases).toHaveLength(2);
    expect(result.casesCreated).toBe(2);
    expect(result.findingsLinked).toBe(3);
  });

  it('should create a single case for multiple findings with the same CVE', async () => {
    const { prisma, createdCases, createdFindings } = createMockPrisma();

    const findings = [
      makeFinding({ assetName: 'host-a' }),
      makeFinding({ assetName: 'host-b' }),
      makeFinding({ assetName: 'host-c' }),
    ];

    const result = await buildCases({
      organizationId: 'org-1',
      clientId: 'client-1',
      findings,
      prisma,
    });

    expect(createdCases).toHaveLength(1);
    expect(createdCases[0].findingCount).toBe(3);
    expect(createdFindings).toHaveLength(3);
    // All findings point to the same case
    const caseId = createdCases[0].id;
    for (const f of createdFindings) {
      expect(f.vulnerabilityCaseId).toBe(caseId);
    }
    expect(result.casesCreated).toBe(1);
    expect(result.casesUpdated).toBe(0);
  });

  it('should populate severity/CVSS/EPSS/KEV from enrichment data', async () => {
    const { prisma, createdCases } = createMockPrisma();

    const findings = [
      makeFinding({
        severity: 'CRITICAL',
        nvdData: {
          cveId: 'CVE-2024-1234',
          title: 'NVD Title',
          description: 'NVD Description',
          cweIds: ['CWE-79'],
          cvssV3: { score: 9.8, vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', version: '3.1' },
          publishedDate: '2024-01-01',
          lastModified: '2024-01-15',
        },
        epssData: {
          cveId: 'CVE-2024-1234',
          score: 0.85,
          percentile: 0.97,
          date: '2024-06-01',
        },
        kevData: {
          cveId: 'CVE-2024-1234',
          vendorProject: 'TestVendor',
          product: 'TestProduct',
          vulnerabilityName: 'Test Vuln',
          dateAdded: '2024-01-10',
          shortDescription: 'A dangerous vuln',
          requiredAction: 'Patch immediately',
          dueDate: '2024-02-10',
          knownRansomwareCampaignUse: true,
        },
      }),
    ];

    await buildCases({
      organizationId: 'org-1',
      clientId: 'client-1',
      findings,
      prisma,
    });

    expect(createdCases).toHaveLength(1);
    const c = createdCases[0];
    expect(c.severity).toBe('CRITICAL');
    expect(c.cvssScore).toBe(9.8);
    expect(c.cvssVector).toContain('CVSS:3.1');
    expect(c.epssScore).toBe(0.85);
    expect(c.epssPercentile).toBe(0.97);
    expect(c.kevListed).toBe(true);
    expect(c.kevDueDate).toBeInstanceOf(Date);
    expect(c.title).toContain('CVE-2024-1234');
    expect(c.title).toContain('NVD Title');
    expect(c.status).toBe('NEW');
  });

  it('should update an existing case when a matching CVE case is found', async () => {
    const { prisma, createdCases, updatedCases } = createMockPrisma();

    const existingCase = {
      id: 'existing-case-1',
      organizationId: 'org-1',
      clientId: 'client-1',
      cveIds: ['CVE-2024-1234'],
      cweIds: ['CWE-79'],
      kevListed: false,
      findingCount: 2,
    };

    prisma.vulnerabilityCase.findFirst.mockResolvedValue(existingCase);

    const findings = [
      makeFinding({ cweIds: ['CWE-79', 'CWE-89'] }),
      makeFinding({ assetName: 'host-b' }),
    ];

    const result = await buildCases({
      organizationId: 'org-1',
      clientId: 'client-1',
      findings,
      prisma,
    });

    expect(createdCases).toHaveLength(0);
    expect(updatedCases).toHaveLength(1);
    expect(result.casesCreated).toBe(0);
    expect(result.casesUpdated).toBe(1);
    expect(result.findingsLinked).toBe(2);

    // CWE-89 should be merged in
    const updatePayload = updatedCases[0];
    expect(updatePayload.cweIds).toContain('CWE-79');
    expect(updatePayload.cweIds).toContain('CWE-89');
  });

  it('should group findings without CVE by exact title match', async () => {
    const { prisma, createdCases } = createMockPrisma();

    const findings = [
      makeFinding({ cveIds: [], title: 'Missing Security Headers', assetName: 'host-a' }),
      makeFinding({ cveIds: [], title: 'Missing Security Headers', assetName: 'host-b' }),
      makeFinding({ cveIds: [], title: 'Different Issue', assetName: 'host-c' }),
    ];

    const result = await buildCases({
      organizationId: 'org-1',
      clientId: 'client-1',
      findings,
      prisma,
    });

    // 2 unique titles => 2 cases
    expect(createdCases).toHaveLength(2);
    expect(result.casesCreated).toBe(2);

    const headerCase = createdCases.find((c: any) => c.title === 'Missing Security Headers');
    expect(headerCase).toBeDefined();
    expect(headerCase!.findingCount).toBe(2);
    expect(headerCase!.cveIds).toEqual([]);
  });

  it('should use highest severity across findings in a group', async () => {
    const { prisma, createdCases } = createMockPrisma();

    const findings = [
      makeFinding({ severity: 'MEDIUM', assetName: 'host-a' }),
      makeFinding({ severity: 'CRITICAL', assetName: 'host-b' }),
      makeFinding({ severity: 'LOW', assetName: 'host-c' }),
    ];

    await buildCases({
      organizationId: 'org-1',
      clientId: 'client-1',
      findings,
      prisma,
    });

    expect(createdCases[0].severity).toBe('CRITICAL');
  });

  it('should compute timestamps from finding dates', async () => {
    const { prisma, createdCases } = createMockPrisma();

    const findings = [
      makeFinding({ discoveredAt: new Date('2024-01-01'), assetName: 'host-a' }),
      makeFinding({ discoveredAt: new Date('2024-06-15'), assetName: 'host-b' }),
      makeFinding({ discoveredAt: new Date('2024-03-10'), assetName: 'host-c' }),
    ];

    await buildCases({
      organizationId: 'org-1',
      clientId: 'client-1',
      findings,
      prisma,
    });

    expect(createdCases[0].firstSeenAt).toEqual(new Date('2024-01-01'));
    expect(createdCases[0].lastSeenAt).toEqual(new Date('2024-06-15'));
  });
});

// ---------------------------------------------------------------------------
// Asset Resolver Tests
// ---------------------------------------------------------------------------

describe('resolveAssets', () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it('should create new assets for unknown asset names', async () => {
    const { prisma, createdAssets } = createMockPrisma();

    const findings = [
      makeFinding({ assetName: 'host-a' }),
      makeFinding({ assetName: 'host-b' }),
    ];

    const map = await resolveAssets({
      organizationId: 'org-1',
      clientId: 'client-1',
      findings,
      prisma,
    });

    expect(createdAssets).toHaveLength(2);
    expect(map.size).toBe(2);
    expect(map.has('host-a')).toBe(true);
    expect(map.has('host-b')).toBe(true);
  });

  it('should return existing asset IDs when assets already exist', async () => {
    const { prisma } = createMockPrisma();

    prisma.asset.findFirst.mockResolvedValue({
      id: 'existing-asset-1',
      name: 'host-a',
    });

    const findings = [makeFinding({ assetName: 'host-a' })];

    const map = await resolveAssets({
      organizationId: 'org-1',
      clientId: 'client-1',
      findings,
      prisma,
    });

    expect(map.get('host-a')).toBe('existing-asset-1');
    expect(prisma.asset.create).not.toHaveBeenCalled();
  });

  it('should deduplicate asset names across multiple findings', async () => {
    const { prisma, createdAssets } = createMockPrisma();

    const findings = [
      makeFinding({ assetName: 'host-a', cveIds: ['CVE-2024-1111'] }),
      makeFinding({ assetName: 'host-a', cveIds: ['CVE-2024-2222'] }),
      makeFinding({ assetName: 'host-a', cveIds: ['CVE-2024-3333'] }),
    ];

    const map = await resolveAssets({
      organizationId: 'org-1',
      clientId: 'client-1',
      findings,
      prisma,
    });

    // Only 1 unique asset name
    expect(createdAssets).toHaveLength(1);
    expect(map.size).toBe(1);
  });

  it('should derive asset type from scanner type', async () => {
    const { prisma, createdAssets } = createMockPrisma();

    const findings = [
      makeFinding({ assetName: 'repo-x', scannerType: 'SCA' }),
      makeFinding({ assetName: 'image-y', scannerType: 'CONTAINER' }),
      makeFinding({ assetName: 'app-z', scannerType: 'DAST' }),
    ];

    await resolveAssets({
      organizationId: 'org-1',
      clientId: 'client-1',
      findings,
      prisma,
    });

    expect(createdAssets).toHaveLength(3);
    const types = createdAssets.map((a: any) => a.type);
    expect(types).toContain('REPOSITORY');
    expect(types).toContain('CONTAINER_IMAGE');
    expect(types).toContain('APPLICATION');
  });
});
