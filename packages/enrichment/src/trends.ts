// Cortex Analytics: Scan-over-scan trend detection
// Compares current scan findings against previous scan for the same org
// to detect new CVEs, resolved CVEs, EPSS jumps, severity upgrades, and KEV additions.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CaseSummary {
  id: string;
  cveIds: string[];
  severity: string;
  epssScore: number | null;
  kevListed: boolean;
  status: string;
}

export interface TrendEvent {
  metric: 'new_cve' | 'resolved_cve' | 'epss_jump' | 'severity_change' | 'kev_added';
  cveId?: string;
  caseId?: string;
  previousValue?: string;
  currentValue: string;
  delta?: number;
  severity?: string;
}

export interface TrendSummary {
  events: TrendEvent[];
  newCveCount: number;
  resolvedCveCount: number;
  epssJumps: number;
  severityChanges: number;
  kevAdditions: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** EPSS score increase threshold to flag as a "jump" */
const EPSS_JUMP_THRESHOLD = 0.1;

// ---------------------------------------------------------------------------
// Trend Detection
// ---------------------------------------------------------------------------

/**
 * Compare two sets of cases (previous vs current) and detect trends.
 * This is a pure function — no DB access — for testability.
 */
export function detectTrends(
  previousCases: CaseSummary[],
  currentCases: CaseSummary[],
): TrendSummary {
  const events: TrendEvent[] = [];

  // Build lookup maps by CVE ID
  const prevByCve = new Map<string, CaseSummary>();
  for (const c of previousCases) {
    for (const cveId of c.cveIds) {
      prevByCve.set(cveId, c);
    }
  }

  const currByCve = new Map<string, CaseSummary>();
  for (const c of currentCases) {
    for (const cveId of c.cveIds) {
      currByCve.set(cveId, c);
    }
  }

  // Detect new CVEs (in current but not in previous)
  for (const [cveId, curr] of currByCve) {
    if (!prevByCve.has(cveId)) {
      events.push({
        metric: 'new_cve',
        cveId,
        caseId: curr.id,
        currentValue: curr.severity,
        severity: curr.severity,
      });
    }
  }

  // Detect resolved CVEs (in previous but not in current, or status changed to resolved)
  const resolvedStatuses = new Set(['RESOLVED', 'CLOSED', 'FALSE_POSITIVE']);
  for (const [cveId, prev] of prevByCve) {
    const curr = currByCve.get(cveId);
    if (!curr) {
      events.push({
        metric: 'resolved_cve',
        cveId,
        caseId: prev.id,
        previousValue: prev.status,
        currentValue: 'REMOVED',
        severity: prev.severity,
      });
    } else if (resolvedStatuses.has(curr.status) && !resolvedStatuses.has(prev.status)) {
      events.push({
        metric: 'resolved_cve',
        cveId,
        caseId: curr.id,
        previousValue: prev.status,
        currentValue: curr.status,
        severity: curr.severity,
      });
    }
  }

  // Detect EPSS score jumps
  for (const [cveId, curr] of currByCve) {
    const prev = prevByCve.get(cveId);
    if (prev && prev.epssScore !== null && curr.epssScore !== null) {
      const delta = curr.epssScore - prev.epssScore;
      if (delta >= EPSS_JUMP_THRESHOLD) {
        events.push({
          metric: 'epss_jump',
          cveId,
          caseId: curr.id,
          previousValue: prev.epssScore.toFixed(4),
          currentValue: curr.epssScore.toFixed(4),
          delta,
          severity: curr.severity,
        });
      }
    }
  }

  // Detect severity changes
  const severityRank: Record<string, number> = {
    INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4,
  };

  for (const [cveId, curr] of currByCve) {
    const prev = prevByCve.get(cveId);
    if (prev && prev.severity !== curr.severity) {
      const prevRank = severityRank[prev.severity] ?? 0;
      const currRank = severityRank[curr.severity] ?? 0;
      events.push({
        metric: 'severity_change',
        cveId,
        caseId: curr.id,
        previousValue: prev.severity,
        currentValue: curr.severity,
        delta: currRank - prevRank,
        severity: curr.severity,
      });
    }
  }

  // Detect new KEV additions
  for (const [cveId, curr] of currByCve) {
    const prev = prevByCve.get(cveId);
    if (curr.kevListed && prev && !prev.kevListed) {
      events.push({
        metric: 'kev_added',
        cveId,
        caseId: curr.id,
        previousValue: 'false',
        currentValue: 'true',
        severity: curr.severity,
      });
    }
  }

  return {
    events,
    newCveCount: events.filter((e) => e.metric === 'new_cve').length,
    resolvedCveCount: events.filter((e) => e.metric === 'resolved_cve').length,
    epssJumps: events.filter((e) => e.metric === 'epss_jump').length,
    severityChanges: events.filter((e) => e.metric === 'severity_change').length,
    kevAdditions: events.filter((e) => e.metric === 'kev_added').length,
  };
}
