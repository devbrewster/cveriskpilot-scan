import { describe, it, expect } from 'vitest';
import { detectTrends, type CaseSummary } from '@cveriskpilot/enrichment';

// ---------------------------------------------------------------------------
// Trend Detection Tests
// ---------------------------------------------------------------------------

describe('Cortex Analytics — Trend Detection', () => {
  const basePrevious: CaseSummary[] = [
    { id: 'c1', cveIds: ['CVE-2024-0001'], severity: 'HIGH', epssScore: 0.3, kevListed: false, status: 'OPEN' },
    { id: 'c2', cveIds: ['CVE-2024-0002'], severity: 'MEDIUM', epssScore: 0.1, kevListed: false, status: 'OPEN' },
    { id: 'c3', cveIds: ['CVE-2024-0003'], severity: 'LOW', epssScore: 0.05, kevListed: false, status: 'IN_PROGRESS' },
    { id: 'c4', cveIds: ['CVE-2024-0004'], severity: 'CRITICAL', epssScore: 0.8, kevListed: true, status: 'OPEN' },
  ];

  describe('New CVE detection', () => {
    it('should detect new CVEs not in previous scan', () => {
      const current: CaseSummary[] = [
        ...basePrevious,
        { id: 'c5', cveIds: ['CVE-2024-0005'], severity: 'HIGH', epssScore: 0.5, kevListed: false, status: 'NEW' },
        { id: 'c6', cveIds: ['CVE-2024-0006'], severity: 'CRITICAL', epssScore: 0.9, kevListed: true, status: 'NEW' },
      ];

      const result = detectTrends(basePrevious, current);
      expect(result.newCveCount).toBe(2);

      const newEvents = result.events.filter((e) => e.metric === 'new_cve');
      expect(newEvents).toHaveLength(2);
      expect(newEvents.map((e) => e.cveId)).toContain('CVE-2024-0005');
      expect(newEvents.map((e) => e.cveId)).toContain('CVE-2024-0006');
    });

    it('should return zero new CVEs when scans are identical', () => {
      const result = detectTrends(basePrevious, basePrevious);
      expect(result.newCveCount).toBe(0);
    });
  });

  describe('Resolved CVE detection', () => {
    it('should detect CVEs removed from current scan', () => {
      const current = basePrevious.filter((c) => c.id !== 'c3');
      const result = detectTrends(basePrevious, current);
      expect(result.resolvedCveCount).toBe(1);

      const resolved = result.events.find((e) => e.metric === 'resolved_cve');
      expect(resolved?.cveId).toBe('CVE-2024-0003');
      expect(resolved?.currentValue).toBe('REMOVED');
    });

    it('should detect CVEs that changed to RESOLVED status', () => {
      const current = basePrevious.map((c) =>
        c.id === 'c2' ? { ...c, status: 'RESOLVED' } : c,
      );
      const result = detectTrends(basePrevious, current);
      expect(result.resolvedCveCount).toBe(1);

      const resolved = result.events.find((e) => e.metric === 'resolved_cve');
      expect(resolved?.cveId).toBe('CVE-2024-0002');
      expect(resolved?.currentValue).toBe('RESOLVED');
    });

    it('should detect CVEs that changed to CLOSED status', () => {
      const current = basePrevious.map((c) =>
        c.id === 'c1' ? { ...c, status: 'CLOSED' } : c,
      );
      const result = detectTrends(basePrevious, current);
      expect(result.resolvedCveCount).toBe(1);
    });

    it('should detect CVEs that changed to FALSE_POSITIVE status', () => {
      const current = basePrevious.map((c) =>
        c.id === 'c2' ? { ...c, status: 'FALSE_POSITIVE' } : c,
      );
      const result = detectTrends(basePrevious, current);
      expect(result.resolvedCveCount).toBe(1);
    });
  });

  describe('EPSS jump detection', () => {
    it('should detect EPSS score increases >= 0.1', () => {
      const current = basePrevious.map((c) =>
        c.id === 'c2' ? { ...c, epssScore: 0.25 } : c, // 0.1 → 0.25 = +0.15
      );
      const result = detectTrends(basePrevious, current);
      expect(result.epssJumps).toBe(1);

      const jump = result.events.find((e) => e.metric === 'epss_jump');
      expect(jump?.cveId).toBe('CVE-2024-0002');
      expect(jump?.delta).toBeCloseTo(0.15, 2);
    });

    it('should ignore EPSS increases below threshold', () => {
      const current = basePrevious.map((c) =>
        c.id === 'c2' ? { ...c, epssScore: 0.15 } : c, // 0.1 → 0.15 = +0.05 (below 0.1 threshold)
      );
      const result = detectTrends(basePrevious, current);
      expect(result.epssJumps).toBe(0);
    });

    it('should ignore EPSS decreases', () => {
      const current = basePrevious.map((c) =>
        c.id === 'c1' ? { ...c, epssScore: 0.1 } : c, // 0.3 → 0.1 = -0.2
      );
      const result = detectTrends(basePrevious, current);
      expect(result.epssJumps).toBe(0);
    });

    it('should handle null EPSS scores gracefully', () => {
      const previous = [{ ...basePrevious[0]!, epssScore: null }];
      const current = [{ ...basePrevious[0]!, epssScore: 0.5 }];
      const result = detectTrends(previous, current);
      expect(result.epssJumps).toBe(0); // Can't compute delta with null
    });
  });

  describe('Severity change detection', () => {
    it('should detect severity upgrades', () => {
      const current = basePrevious.map((c) =>
        c.id === 'c2' ? { ...c, severity: 'HIGH' } : c, // MEDIUM → HIGH
      );
      const result = detectTrends(basePrevious, current);
      expect(result.severityChanges).toBe(1);

      const change = result.events.find((e) => e.metric === 'severity_change');
      expect(change?.previousValue).toBe('MEDIUM');
      expect(change?.currentValue).toBe('HIGH');
      expect(change?.delta).toBe(1); // HIGH(3) - MEDIUM(2) = 1
    });

    it('should detect severity downgrades', () => {
      const current = basePrevious.map((c) =>
        c.id === 'c1' ? { ...c, severity: 'LOW' } : c, // HIGH → LOW
      );
      const result = detectTrends(basePrevious, current);
      expect(result.severityChanges).toBe(1);

      const change = result.events.find((e) => e.metric === 'severity_change');
      expect(change?.delta).toBe(-2); // LOW(1) - HIGH(3) = -2
    });

    it('should not flag unchanged severities', () => {
      const result = detectTrends(basePrevious, basePrevious);
      expect(result.severityChanges).toBe(0);
    });
  });

  describe('KEV addition detection', () => {
    it('should detect CVEs newly added to KEV', () => {
      const current = basePrevious.map((c) =>
        c.id === 'c1' ? { ...c, kevListed: true } : c, // was false, now true
      );
      const result = detectTrends(basePrevious, current);
      expect(result.kevAdditions).toBe(1);

      const kev = result.events.find((e) => e.metric === 'kev_added');
      expect(kev?.cveId).toBe('CVE-2024-0001');
    });

    it('should not flag CVEs already in KEV', () => {
      // c4 was already kevListed: true
      const result = detectTrends(basePrevious, basePrevious);
      expect(result.kevAdditions).toBe(0);
    });
  });

  describe('Combined trends', () => {
    it('should detect multiple trend types in a single comparison', () => {
      const current: CaseSummary[] = [
        { id: 'c1', cveIds: ['CVE-2024-0001'], severity: 'CRITICAL', epssScore: 0.5, kevListed: true, status: 'OPEN' },
        // c2 removed (resolved)
        { id: 'c3', cveIds: ['CVE-2024-0003'], severity: 'LOW', epssScore: 0.05, kevListed: false, status: 'RESOLVED' },
        { id: 'c4', cveIds: ['CVE-2024-0004'], severity: 'CRITICAL', epssScore: 0.8, kevListed: true, status: 'OPEN' },
        { id: 'c5', cveIds: ['CVE-2024-0005'], severity: 'HIGH', epssScore: 0.6, kevListed: false, status: 'NEW' },
      ];

      const result = detectTrends(basePrevious, current);

      expect(result.newCveCount).toBe(1); // CVE-2024-0005
      expect(result.resolvedCveCount).toBeGreaterThanOrEqual(1); // CVE-2024-0002 removed, CVE-2024-0003 resolved
      expect(result.severityChanges).toBe(1); // CVE-2024-0001 HIGH → CRITICAL
      expect(result.kevAdditions).toBe(1); // CVE-2024-0001 newly in KEV
      expect(result.epssJumps).toBe(1); // CVE-2024-0001 0.3 → 0.5 = +0.2
    });

    it('should handle empty previous scan (first scan)', () => {
      const result = detectTrends([], basePrevious);
      expect(result.newCveCount).toBe(4); // All are new
      expect(result.resolvedCveCount).toBe(0);
      expect(result.epssJumps).toBe(0);
      expect(result.severityChanges).toBe(0);
      expect(result.kevAdditions).toBe(0);
    });

    it('should handle empty current scan (everything resolved)', () => {
      const result = detectTrends(basePrevious, []);
      expect(result.newCveCount).toBe(0);
      expect(result.resolvedCveCount).toBe(4); // All removed
    });

    it('should handle cases with multiple CVE IDs', () => {
      const previous: CaseSummary[] = [
        { id: 'c1', cveIds: ['CVE-2024-0001', 'CVE-2024-0002'], severity: 'HIGH', epssScore: 0.3, kevListed: false, status: 'OPEN' },
      ];
      const current: CaseSummary[] = [
        { id: 'c1', cveIds: ['CVE-2024-0001', 'CVE-2024-0002'], severity: 'CRITICAL', epssScore: 0.3, kevListed: false, status: 'OPEN' },
      ];

      const result = detectTrends(previous, current);
      // Both CVEs in the case should show severity change
      expect(result.severityChanges).toBe(2);
    });
  });
});
