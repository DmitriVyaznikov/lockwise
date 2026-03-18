import { describe, it, expect } from 'vitest';
import { fold } from '../../fp/monoid.js';
import { summaryMonoid, toSummary } from '../../domain/monoids.js';
import type { PackageResult } from '../../domain/report.js';

describe('Report Monoids', () => {
  describe('summaryMonoid', () => {
    it('should have empty identity', () => {
      expect(summaryMonoid.empty).toEqual({
        success: 0, due1month: 0, mixed: 0, maybeVulnerable: 0, unavailable: 0,
      });
    });

    it('should concat two summaries', () => {
      const a = { success: 1, due1month: 2, mixed: 0, maybeVulnerable: 0, unavailable: 0 };
      const b = { success: 3, due1month: 0, mixed: 1, maybeVulnerable: 0, unavailable: 2 };
      const result = summaryMonoid.concat(a, b);
      expect(result).toEqual({ success: 4, due1month: 2, mixed: 1, maybeVulnerable: 0, unavailable: 2 });
    });

    it('should fold array of summaries', () => {
      const items = [
        { success: 1, due1month: 0, mixed: 0, maybeVulnerable: 0, unavailable: 0 },
        { success: 0, due1month: 1, mixed: 0, maybeVulnerable: 0, unavailable: 0 },
        { success: 0, due1month: 0, mixed: 1, maybeVulnerable: 0, unavailable: 0 },
      ];
      expect(fold(summaryMonoid)(items).success).toBe(1);
      expect(fold(summaryMonoid)(items).mixed).toBe(1);
    });
  });

  describe('toSummary', () => {
    it('should convert PackageResult to unit summary', () => {
      const pkg = { category: 'success' } as PackageResult;
      const summary = toSummary(pkg);
      expect(summary.success).toBe(1);
      expect(summary.due1month).toBe(0);
    });

    it('should handle unavailable category', () => {
      const pkg = { category: 'unavailable' } as PackageResult;
      expect(toSummary(pkg).unavailable).toBe(1);
    });
  });
});
