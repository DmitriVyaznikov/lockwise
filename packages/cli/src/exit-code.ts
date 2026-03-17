import type { LockwiseReport } from '@lockwise/core';

export function resolveExitCode(report: LockwiseReport): number {
  const { summary } = report;

  if (summary.maybeVulnerable > 0 || summary.mixed > 0) {
    return 2;
  }

  if (report.nexusUpload.length > 0 || summary.unavailable > 0 || summary.due1month > 0) {
    return 1;
  }

  return 0;
}
