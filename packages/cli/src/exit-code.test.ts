import { describe, it, expect } from 'vitest';
import { resolveExitCode } from './exit-code.js';
import type { LockwiseReport } from '@lockwise/core';

function makeReport(overrides: Partial<LockwiseReport['summary']> = {}, nexusUpload: string[] = []): LockwiseReport {
  return {
    meta: { lockfileType: 'npm', analyzedAt: '', totalPackages: 0 },
    packages: [],
    summary: { success: 0, due1month: 0, mixed: 0, maybeVulnerable: 0, unavailable: 0, ...overrides },
    nexusUpload,
  };
}

describe('resolveExitCode', () => {
  it('should return 0 when all packages are available and no vulnerabilities', () => {
    const report = makeReport({ success: 10 });
    expect(resolveExitCode(report)).toBe(0);
  });

  it('should return 1 when there are packages to upload but no vulnerabilities', () => {
    const report = makeReport({ success: 8, due1month: 2 }, ['http://nexus/pkg.tgz']);
    expect(resolveExitCode(report)).toBe(1);
  });

  it('should return 2 when there are vulnerable packages', () => {
    const report = makeReport({ success: 5, maybeVulnerable: 3 });
    expect(resolveExitCode(report)).toBe(2);
  });

  it('should return 2 when there are mixed packages', () => {
    const report = makeReport({ success: 5, mixed: 2 });
    expect(resolveExitCode(report)).toBe(2);
  });

  it('should prioritize exit code 2 over 1', () => {
    const report = makeReport(
      { success: 3, maybeVulnerable: 1, due1month: 1 },
      ['http://nexus/pkg.tgz'],
    );
    expect(resolveExitCode(report)).toBe(2);
  });
});
