import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchEpssScores } from '../clients/epss.js';

describe('fetchEpssScores', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('parses EPSS API response correctly', async () => {
    const mockResponse = {
      status: 'OK',
      'status-code': 200,
      data: [
        { cve: 'CVE-2021-44228', epss: '0.97565', percentile: '0.99998', date: '2024-01-15' },
        { cve: 'CVE-2023-1234', epss: '0.00123', percentile: '0.45000', date: '2024-01-15' },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchEpssScores(['CVE-2021-44228', 'CVE-2023-1234']);

    expect(result.size).toBe(2);

    const log4j = result.get('CVE-2021-44228');
    expect(log4j).toBeDefined();
    expect(log4j!.score).toBeCloseTo(0.97565, 4);
    expect(log4j!.percentile).toBeCloseTo(0.99998, 4);
    expect(log4j!.date).toBe('2024-01-15');

    const other = result.get('CVE-2023-1234');
    expect(other).toBeDefined();
    expect(other!.score).toBeCloseTo(0.00123, 4);
  });

  it('returns empty map for empty input', async () => {
    globalThis.fetch = vi.fn();
    const result = await fetchEpssScores([]);
    expect(result.size).toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('handles empty data response', async () => {
    const mockResponse = {
      status: 'OK',
      'status-code': 200,
      data: [],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchEpssScores(['CVE-9999-99999']);
    expect(result.size).toBe(0);
  });

  it('handles non-ok response gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await fetchEpssScores(['CVE-2021-44228']);
    expect(result.size).toBe(0);
  });

  it('handles network error gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await fetchEpssScores(['CVE-2021-44228']);
    expect(result.size).toBe(0);
  });

  it('deduplicates CVE IDs', async () => {
    const mockResponse = {
      status: 'OK',
      'status-code': 200,
      data: [
        { cve: 'CVE-2021-44228', epss: '0.97565', percentile: '0.99998', date: '2024-01-15' },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchEpssScores([
      'CVE-2021-44228',
      'CVE-2021-44228',
      'CVE-2021-44228',
    ]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(result.size).toBe(1);
  });

  it('skips entries with invalid numeric values', async () => {
    const mockResponse = {
      status: 'OK',
      'status-code': 200,
      data: [
        { cve: 'CVE-2021-44228', epss: '0.97', percentile: '0.99', date: '2024-01-15' },
        { cve: 'CVE-2023-BAD', epss: 'not-a-number', percentile: '0.50', date: '2024-01-15' },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchEpssScores(['CVE-2021-44228', 'CVE-2023-BAD']);
    expect(result.size).toBe(1);
    expect(result.has('CVE-2021-44228')).toBe(true);
    expect(result.has('CVE-2023-BAD')).toBe(false);
  });
});
