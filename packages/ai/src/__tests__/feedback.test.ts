import { describe, it, expect } from 'vitest';
import { aggregateFeedback, buildFeedbackContext } from '../feedback';
import type { FeedbackStats } from '../feedback';

describe('feedback', () => {
  describe('aggregateFeedback', () => {
    it('returns default stats for empty input', () => {
      const stats = aggregateFeedback([]);
      expect(stats.totalReviews).toBe(0);
      expect(stats.accuracy).toBe(1); // no reviews = assume good
      expect(stats.topSeverityCorrections).toEqual([]);
      expect(stats.topVerdictCorrections).toEqual([]);
    });

    it('counts outcomes correctly', () => {
      const rows = [
        { outcome: 'APPROVED', originalSeverity: 'HIGH', correctedSeverity: null, originalVerdict: 'PATCH_IMMEDIATELY', correctedVerdict: null },
        { outcome: 'APPROVED', originalSeverity: 'MEDIUM', correctedSeverity: null, originalVerdict: 'SCHEDULE_PATCH', correctedVerdict: null },
        { outcome: 'REJECTED', originalSeverity: 'CRITICAL', correctedSeverity: null, originalVerdict: 'PATCH_IMMEDIATELY', correctedVerdict: null },
        { outcome: 'MODIFIED', originalSeverity: 'HIGH', correctedSeverity: 'MEDIUM', originalVerdict: 'PATCH_IMMEDIATELY', correctedVerdict: 'SCHEDULE_PATCH' },
      ];

      const stats = aggregateFeedback(rows);
      expect(stats.totalReviews).toBe(4);
      expect(stats.approvedCount).toBe(2);
      expect(stats.rejectedCount).toBe(1);
      expect(stats.modifiedCount).toBe(1);
      expect(stats.accuracy).toBe(0.5); // 2/4
    });

    it('tracks severity corrections from MODIFIED outcomes', () => {
      const rows = [
        { outcome: 'MODIFIED', originalSeverity: 'HIGH', correctedSeverity: 'MEDIUM', originalVerdict: 'PATCH_IMMEDIATELY', correctedVerdict: null },
        { outcome: 'MODIFIED', originalSeverity: 'HIGH', correctedSeverity: 'MEDIUM', originalVerdict: 'PATCH_IMMEDIATELY', correctedVerdict: null },
        { outcome: 'MODIFIED', originalSeverity: 'CRITICAL', correctedSeverity: 'HIGH', originalVerdict: 'PATCH_IMMEDIATELY', correctedVerdict: null },
      ];

      const stats = aggregateFeedback(rows);
      expect(stats.topSeverityCorrections).toHaveLength(2);
      expect(stats.topSeverityCorrections[0]).toEqual({ from: 'HIGH', to: 'MEDIUM', count: 2 });
      expect(stats.topSeverityCorrections[1]).toEqual({ from: 'CRITICAL', to: 'HIGH', count: 1 });
    });

    it('tracks verdict corrections from MODIFIED outcomes', () => {
      const rows = [
        { outcome: 'MODIFIED', originalSeverity: 'HIGH', correctedSeverity: null, originalVerdict: 'PATCH_IMMEDIATELY', correctedVerdict: 'SCHEDULE_PATCH' },
        { outcome: 'MODIFIED', originalSeverity: 'HIGH', correctedSeverity: null, originalVerdict: 'PATCH_IMMEDIATELY', correctedVerdict: 'SCHEDULE_PATCH' },
        { outcome: 'MODIFIED', originalSeverity: 'HIGH', correctedSeverity: null, originalVerdict: 'INVESTIGATE', correctedVerdict: 'DEFER' },
      ];

      const stats = aggregateFeedback(rows);
      expect(stats.topVerdictCorrections).toHaveLength(2);
      expect(stats.topVerdictCorrections[0]).toEqual({ from: 'PATCH_IMMEDIATELY', to: 'SCHEDULE_PATCH', count: 2 });
    });

    it('ignores same-value corrections', () => {
      const rows = [
        { outcome: 'MODIFIED', originalSeverity: 'HIGH', correctedSeverity: 'HIGH', originalVerdict: 'PATCH_IMMEDIATELY', correctedVerdict: 'PATCH_IMMEDIATELY' },
      ];

      const stats = aggregateFeedback(rows);
      expect(stats.topSeverityCorrections).toHaveLength(0);
      expect(stats.topVerdictCorrections).toHaveLength(0);
    });

    it('limits corrections to top 5', () => {
      const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
      const rows = [];
      // Create 7 unique severity corrections
      for (let i = 0; i < 7; i++) {
        rows.push({
          outcome: 'MODIFIED',
          originalSeverity: severities[i % 5]!,
          correctedSeverity: severities[(i + 1) % 5]!,
          originalVerdict: 'INVESTIGATE',
          correctedVerdict: null,
        });
      }

      const stats = aggregateFeedback(rows);
      expect(stats.topSeverityCorrections.length).toBeLessThanOrEqual(5);
    });
  });

  describe('buildFeedbackContext', () => {
    it('returns empty string for fewer than 10 reviews', () => {
      const stats: FeedbackStats = {
        totalReviews: 9,
        approvedCount: 8,
        rejectedCount: 1,
        modifiedCount: 0,
        accuracy: 0.89,
        topSeverityCorrections: [],
        topVerdictCorrections: [],
      };

      expect(buildFeedbackContext(stats)).toBe('');
    });

    it('returns context string for 10+ reviews', () => {
      const stats: FeedbackStats = {
        totalReviews: 100,
        approvedCount: 80,
        rejectedCount: 10,
        modifiedCount: 10,
        accuracy: 0.8,
        topSeverityCorrections: [{ from: 'HIGH', to: 'MEDIUM', count: 5 }],
        topVerdictCorrections: [{ from: 'PATCH_IMMEDIATELY', to: 'SCHEDULE_PATCH', count: 3 }],
      };

      const context = buildFeedbackContext(stats);
      expect(context).toContain('<historical-feedback>');
      expect(context).toContain('</historical-feedback>');
      expect(context).toContain('100 human-reviewed');
      expect(context).toContain('80%');
      expect(context).toContain('HIGH was corrected to MEDIUM (5 times)');
      expect(context).toContain('PATCH_IMMEDIATELY was corrected to SCHEDULE_PATCH (3 times)');
    });

    it('omits correction sections when empty', () => {
      const stats: FeedbackStats = {
        totalReviews: 50,
        approvedCount: 45,
        rejectedCount: 5,
        modifiedCount: 0,
        accuracy: 0.9,
        topSeverityCorrections: [],
        topVerdictCorrections: [],
      };

      const context = buildFeedbackContext(stats);
      expect(context).toContain('<historical-feedback>');
      expect(context).not.toContain('Common severity corrections');
      expect(context).not.toContain('Common action corrections');
    });
  });
});
