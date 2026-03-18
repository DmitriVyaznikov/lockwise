import { describe, it, expect } from 'vitest';
import type {
  PackageCategory, VersionSelection, VulnInfo,
  PackageResult, LockwiseReport, LockwiseConfig,
  ParsedLockfile, RangeEntry, VersionInfo, ConsumerInfo,
  DiffResult, ReportListItem,
} from '../../domain/report.js';
import { DEFAULT_CONFIG } from '../../domain/report.js';

describe('Report Types', () => {
  it('should export DEFAULT_CONFIG with required fields', () => {
    expect(DEFAULT_CONFIG.nexusUrl).toBeDefined();
    expect(DEFAULT_CONFIG.publicRegistry).toBeDefined();
    expect(DEFAULT_CONFIG.minAgeDays).toBeTypeOf('number');
  });

  it('should allow constructing a minimal LockwiseReport', () => {
    const report: LockwiseReport = {
      meta: { lockfileType: 'npm', analyzedAt: '2024-01-01', totalPackages: 0, configUsed: DEFAULT_CONFIG },
      packages: [],
      summary: { success: 0, due1month: 0, mixed: 0, maybeVulnerable: 0, unavailable: 0 },
      nexusUpload: '',
    };
    expect(report.summary.success).toBe(0);
  });

  it('should type-check VersionSelection variants', () => {
    const clean: VersionSelection = { status: 'clean', version: '1.0.0', fullName: 'pkg@1.0.0', category: 'success' };
    const fresh: VersionSelection = { status: 'fresh', version: '1.0.0', fullName: 'pkg@1.0.0', category: 'due1month' };
    const mixed: VersionSelection = { status: 'mixed', version: '1.0.0', fullName: 'pkg@1.0.0', category: 'mixed' };
    const vulnerable: VersionSelection = { status: 'vulnerable', version: '1.0.0', fullName: 'pkg@1.0.0', category: 'maybeVulnerable' };
    expect([clean, fresh, mixed, vulnerable]).toHaveLength(4);
  });
});
