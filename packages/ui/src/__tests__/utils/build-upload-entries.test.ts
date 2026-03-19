import { describe, it, expect } from 'vitest';
import type { PackageResult } from '@lockwise/core';
import { buildUploadEntries } from '../../utils/build-upload-entries';

function makePackage(overrides: Partial<PackageResult> = {}): PackageResult {
  return {
    name: 'pkg',
    currentVersion: '1.0.0',
    recommendedVersion: null,
    category: 'success',
    isInNexus: true,
    vulnerabilities: [],
    maxCvss: 0,
    availableVersions: [],
    consumers: [],
    range: '^1.0.0',
    ...overrides,
  };
}

describe('buildUploadEntries', () => {
  it('should return empty array for empty input', () => {
    expect(buildUploadEntries([])).toEqual([]);
  });

  it('should include name@currentVersion when package is not in nexus', () => {
    const packages = [makePackage({ name: 'foo', currentVersion: '2.0.0', isInNexus: false })];
    expect(buildUploadEntries(packages)).toContain('foo@2.0.0');
  });

  it('should include name@recommendedVersion when recommended differs from current', () => {
    const packages = [
      makePackage({ name: 'bar', currentVersion: '1.0.0', recommendedVersion: '1.2.0' }),
    ];
    expect(buildUploadEntries(packages)).toContain('bar@1.2.0');
  });

  it('should not include recommended when it equals current', () => {
    const packages = [
      makePackage({ name: 'baz', currentVersion: '1.0.0', recommendedVersion: '1.0.0' }),
    ];
    expect(buildUploadEntries(packages)).toEqual([]);
  });

  it('should not include recommended when it is null', () => {
    const packages = [
      makePackage({ name: 'qux', currentVersion: '1.0.0', recommendedVersion: null, isInNexus: true }),
    ];
    expect(buildUploadEntries(packages)).toEqual([]);
  });

  it('should deduplicate entries', () => {
    const packages = [
      makePackage({ name: 'dup', currentVersion: '1.0.0', isInNexus: false, recommendedVersion: '1.0.0' }),
    ];
    const result = buildUploadEntries(packages);
    expect(result.filter((e) => e === 'dup@1.0.0')).toHaveLength(1);
  });

  it('should include both current (not in nexus) and recommended entries for same package', () => {
    const packages = [
      makePackage({ name: 'multi', currentVersion: '1.0.0', isInNexus: false, recommendedVersion: '2.0.0' }),
    ];
    const result = buildUploadEntries(packages);
    expect(result).toContain('multi@1.0.0');
    expect(result).toContain('multi@2.0.0');
  });

  it('should skip packages that are in nexus with no recommendation', () => {
    const packages = [
      makePackage({ name: 'ok', isInNexus: true, recommendedVersion: null }),
    ];
    expect(buildUploadEntries(packages)).toEqual([]);
  });
});
