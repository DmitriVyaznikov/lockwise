import type { Monoid } from '../fp/monoid.js';
import type { ReportSummary, PackageResult } from './report.js';

export const summaryMonoid: Monoid<ReportSummary> = {
  empty: { success: 0, due1month: 0, mixed: 0, maybeVulnerable: 0, unavailable: 0 },
  concat: (a, b) => ({
    success: a.success + b.success,
    due1month: a.due1month + b.due1month,
    mixed: a.mixed + b.mixed,
    maybeVulnerable: a.maybeVulnerable + b.maybeVulnerable,
    unavailable: a.unavailable + b.unavailable,
  }),
};

export function toSummary(pkg: PackageResult): ReportSummary {
  return {
    ...summaryMonoid.empty,
    [pkg.category]: 1,
  };
}
