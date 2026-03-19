import { describe, it, expect } from 'vitest';
import { buildRangeMap, resolveRange } from '../../analyzer/range-resolver-fp.js';
import type { RawPackageData } from '../../domain/report.js';

describe('buildRangeMap (FP)', () => {
  it('should collect ranges from dependencies', () => {
    const rawPackages: Record<string, RawPackageData> = {
      '': { version: '1.0.0', dependencies: { axios: '^1.7.0' } },
      'node_modules/axios': { version: '1.7.2', dependencies: { 'follow-redirects': '^1.15.6' } },
    };
    const map = buildRangeMap(rawPackages);
    expect(map.get('axios')).toEqual([{ range: '^1.7.0', from: '' }]);
    expect(map.get('follow-redirects')).toEqual([{ range: '^1.15.6', from: 'node_modules/axios' }]);
  });

  it('should collect ranges from devDependencies and peerDependencies', () => {
    const rawPackages: Record<string, RawPackageData> = {
      '': { version: '1.0.0', devDependencies: { vitest: '^3.0.0' }, peerDependencies: { vue: '^3.4.0' } },
    };
    const map = buildRangeMap(rawPackages);
    expect(map.get('vitest')).toEqual([{ range: '^3.0.0', from: '' }]);
    expect(map.get('vue')).toEqual([{ range: '^3.4.0', from: '' }]);
  });
});

describe('resolveRange (FP)', () => {
  it('should prefer range from project root', () => {
    const rangeMap = new Map([
      ['axios', [
        { range: '^1.6.0', from: 'node_modules/some-lib' },
        { range: '^1.7.0', from: '' },
      ]],
    ]);
    expect(resolveRange('axios', '1.7.2', rangeMap)).toBe('^1.7.0');
  });

  it('should return fallback ^major.0.0 when no entries', () => {
    const rangeMap = new Map<string, Array<{ range: string; from: string }>>();
    expect(resolveRange('unknown', '3.5.1', rangeMap)).toBe('^3.0.0');
  });

  it('should return fallback when no range matches', () => {
    const rangeMap = new Map([['axios', [{ range: '^2.0.0', from: '' }]]]);
    expect(resolveRange('axios', '1.7.2', rangeMap)).toBe('^1.0.0');
  });
});
