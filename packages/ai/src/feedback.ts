// ---------------------------------------------------------------------------
// AI Package — Feedback Loop (learning from human corrections)
// ---------------------------------------------------------------------------

/**
 * Aggregated feedback stats for an organization.
 * Used to enrich triage prompts with historical correction patterns.
 */
export interface FeedbackStats {
  totalReviews: number;
  approvedCount: number;
  rejectedCount: number;
  modifiedCount: number;
  /** Accuracy = approved / total (how often AI was right) */
  accuracy: number;
  /** Most common severity corrections, e.g. "HIGH→MEDIUM" */
  topSeverityCorrections: Array<{ from: string; to: string; count: number }>;
  /** Most common verdict corrections, e.g. "PATCH_IMMEDIATELY→SCHEDULE_PATCH" */
  topVerdictCorrections: Array<{ from: string; to: string; count: number }>;
}

/**
 * Aggregate feedback stats from raw TriageFeedback records.
 * Accepts the raw DB rows so the caller handles the Prisma query.
 */
export function aggregateFeedback(
  feedbackRows: Array<{
    outcome: string;
    originalSeverity: string;
    correctedSeverity: string | null;
    originalVerdict: string;
    correctedVerdict: string | null;
  }>,
): FeedbackStats {
  const totalReviews = feedbackRows.length;
  let approvedCount = 0;
  let rejectedCount = 0;
  let modifiedCount = 0;

  const severityCorrectionMap = new Map<string, number>();
  const verdictCorrectionMap = new Map<string, number>();

  for (const row of feedbackRows) {
    switch (row.outcome) {
      case 'APPROVED':
        approvedCount++;
        break;
      case 'REJECTED':
        rejectedCount++;
        break;
      case 'MODIFIED':
        modifiedCount++;
        // Track severity corrections
        if (row.correctedSeverity && row.correctedSeverity !== row.originalSeverity) {
          const key = `${row.originalSeverity}→${row.correctedSeverity}`;
          severityCorrectionMap.set(key, (severityCorrectionMap.get(key) ?? 0) + 1);
        }
        // Track verdict corrections
        if (row.correctedVerdict && row.correctedVerdict !== row.originalVerdict) {
          const key = `${row.originalVerdict}→${row.correctedVerdict}`;
          verdictCorrectionMap.set(key, (verdictCorrectionMap.get(key) ?? 0) + 1);
        }
        break;
    }
  }

  const accuracy = totalReviews > 0 ? approvedCount / totalReviews : 1;

  // Sort corrections by frequency, take top 5
  const topSeverityCorrections = [...severityCorrectionMap.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split('→');
      return { from: from!, to: to!, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topVerdictCorrections = [...verdictCorrectionMap.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split('→');
      return { from: from!, to: to!, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalReviews,
    approvedCount,
    rejectedCount,
    modifiedCount,
    accuracy,
    topSeverityCorrections,
    topVerdictCorrections,
  };
}

/**
 * Build a prompt fragment from feedback stats.
 * Returns empty string if insufficient data (< 10 reviews).
 */
export function buildFeedbackContext(stats: FeedbackStats): string {
  if (stats.totalReviews < 10) return '';

  const lines: string[] = [];
  lines.push('<historical-feedback>');
  lines.push(`Based on ${stats.totalReviews} human-reviewed triage decisions for this organization:`);
  lines.push(`- AI accuracy: ${(stats.accuracy * 100).toFixed(0)}% (${stats.approvedCount} approved, ${stats.rejectedCount} rejected, ${stats.modifiedCount} modified)`);

  if (stats.topSeverityCorrections.length > 0) {
    lines.push('');
    lines.push('Common severity corrections by reviewers:');
    for (const c of stats.topSeverityCorrections) {
      lines.push(`- ${c.from} was corrected to ${c.to} (${c.count} times)`);
    }
  }

  if (stats.topVerdictCorrections.length > 0) {
    lines.push('');
    lines.push('Common action corrections by reviewers:');
    for (const c of stats.topVerdictCorrections) {
      lines.push(`- ${c.from} was corrected to ${c.to} (${c.count} times)`);
    }
  }

  lines.push('');
  lines.push('Adjust your confidence and recommendations based on these patterns. If reviewers frequently correct a particular pattern, weight your decision accordingly.');
  lines.push('</historical-feedback>');

  return lines.join('\n');
}
