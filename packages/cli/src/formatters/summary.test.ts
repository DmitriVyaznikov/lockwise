import { describe, it, expect } from 'vitest';
import { formatSummary } from './summary.js';
import type { LockwiseReport } from '@lockwise/core';

const mockReport: LockwiseReport = {
  meta: { lockfileType: 'npm', analyzedAt: '2026-03-17T10:00:00.000Z', totalPackages: 25 },
  packages: [],
  summary: { success: 15, due1month: 5, mixed: 3, maybeVulnerable: 2, unavailable: 0 },
  nexusUpload: ['http://nexus/a.tgz', 'http://nexus/b.tgz'],
};

describe('formatSummary', () => {
  it('should include total packages count', () => {
    const result = formatSummary(mockReport);
    expect(result).toContain('25');
  });

  it('should include all category counts', () => {
    const result = formatSummary(mockReport);
    expect(result).toContain('15');
    expect(result).toContain('5');
    expect(result).toContain('3');
    expect(result).toContain('2');
  });

  it('should include lockfile type', () => {
    const result = formatSummary(mockReport);
    expect(result).toContain('npm');
  });

  it('should include nexus upload count', () => {
    const result = formatSummary(mockReport);
    expect(result).toContain('2');
  });

  it('should return a multi-line string', () => {
    const result = formatSummary(mockReport);
    const lines = result.split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(3);
  });
});
