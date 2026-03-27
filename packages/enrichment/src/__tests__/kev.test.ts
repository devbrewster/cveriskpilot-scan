import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadKevCatalog, checkKev, _resetKevCache } from '../clients/kev';
import type { KevData } from '../types';

const FIXTURE_CATALOG = {
  catalogVersion: '2024.01.15',
  dateReleased: '2024-01-15',
  count: 3,
  vulnerabilities: [
    {
      cveID: 'CVE-2021-44228',
      vendorProject: 'Apache',
      product: 'Log4j',
      vulnerabilityName: 'Apache Log4j2 Remote Code Execution',
      dateAdded: '2021-12-10',
      shortDescription: 'Apache Log4j2 JNDI features do not protect against attacker controlled LDAP.',
      requiredAction: 'Apply updates per vendor instructions.',
      dueDate: '2021-12-24',
      knownRansomwareCampaignUse: 'Known',
    },
    {
      cveID: 'CVE-2023-27997',
      vendorProject: 'Fortinet',
      product: 'FortiOS',
      vulnerabilityName: 'Fortinet FortiOS Heap Buffer Overflow',
      dateAdded: '2023-06-13',
      shortDescription: 'Fortinet FortiOS heap-based buffer overflow vulnerability.',
      requiredAction: 'Apply updates per vendor instructions.',
      dueDate: '2023-07-04',
      knownRansomwareCampaignUse: 'Unknown',
    },
    {
      cveID: 'CVE-2024-1234',
      vendorProject: 'TestVendor',
      product: 'TestProduct',
      vulnerabilityName: 'Test Vulnerability',
      dateAdded: '2024-01-01',
      shortDescription: 'A test vulnerability.',
      requiredAction: 'Apply updates.',
      dueDate: '2024-02-01',
      knownRansomwareCampaignUse: 'Known',
    },
  ],
};

describe('KEV catalog', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    _resetKevCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('loadKevCatalog', () => {
    it('parses catalog and builds Map', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(FIXTURE_CATALOG),
      });

      const catalog = await loadKevCatalog();

      expect(catalog.size).toBe(3);
      expect(catalog.has('CVE-2021-44228')).toBe(true);
      expect(catalog.has('CVE-2023-27997')).toBe(true);
    });

    it('parses knownRansomwareCampaignUse correctly', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(FIXTURE_CATALOG),
      });

      const catalog = await loadKevCatalog();

      const log4j = catalog.get('CVE-2021-44228')!;
      expect(log4j.knownRansomwareCampaignUse).toBe(true);

      const fortinet = catalog.get('CVE-2023-27997')!;
      expect(fortinet.knownRansomwareCampaignUse).toBe(false);
    });

    it('returns cached catalog on subsequent calls', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(FIXTURE_CATALOG),
      });

      await loadKevCatalog();
      await loadKevCatalog();

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('returns empty map on fetch failure with no cache', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const catalog = await loadKevCatalog();
      expect(catalog.size).toBe(0);
    });

    it('returns empty map on network error with no cache', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const catalog = await loadKevCatalog();
      expect(catalog.size).toBe(0);
    });
  });

  describe('checkKev', () => {
    function buildCatalog(): Map<string, KevData> {
      const map = new Map<string, KevData>();
      for (const entry of FIXTURE_CATALOG.vulnerabilities) {
        map.set(entry.cveID, {
          cveId: entry.cveID,
          vendorProject: entry.vendorProject,
          product: entry.product,
          vulnerabilityName: entry.vulnerabilityName,
          dateAdded: entry.dateAdded,
          shortDescription: entry.shortDescription,
          requiredAction: entry.requiredAction,
          dueDate: entry.dueDate,
          knownRansomwareCampaignUse: entry.knownRansomwareCampaignUse === 'Known',
        });
      }
      return map;
    }

    it('returns matching CVEs', () => {
      const catalog = buildCatalog();
      const matches = checkKev(catalog, ['CVE-2021-44228', 'CVE-2099-0001']);

      expect(matches.length).toBe(1);
      expect(matches[0]!.cveId).toBe('CVE-2021-44228');
      expect(matches[0]!.kevData.vendorProject).toBe('Apache');
    });

    it('returns multiple matches', () => {
      const catalog = buildCatalog();
      const matches = checkKev(catalog, [
        'CVE-2021-44228',
        'CVE-2023-27997',
        'CVE-2024-1234',
      ]);

      expect(matches.length).toBe(3);
    });

    it('returns empty array when no matches', () => {
      const catalog = buildCatalog();
      const matches = checkKev(catalog, ['CVE-2099-0001', 'CVE-2099-0002']);
      expect(matches.length).toBe(0);
    });

    it('handles empty CVE list', () => {
      const catalog = buildCatalog();
      const matches = checkKev(catalog, []);
      expect(matches.length).toBe(0);
    });

    it('handles empty catalog', () => {
      const catalog = new Map<string, KevData>();
      const matches = checkKev(catalog, ['CVE-2021-44228']);
      expect(matches.length).toBe(0);
    });
  });
});
