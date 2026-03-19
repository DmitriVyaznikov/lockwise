import { describe, it, expect } from 'vitest';
import { selectBestVersion } from '../../analyzer/version-selector-fp.js';
import type { VulnMapEntry } from '../../checkers/osv.js';
import { isSome, isNone } from '../../fp/maybe.js';

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const NOW = Date.now();
const OLD_DATE = new Date(NOW - ONE_MONTH_MS - 1000).toISOString();
const FRESH_DATE = new Date(NOW - 1000).toISOString();

function makeRegistryData(versions: Record<string, string>) {
  return {
    name: 'test-pkg',
    versions: Object.fromEntries(Object.keys(versions).map((v) => [v, {}])),
    time: versions,
  };
}

function makeVulnMap(entries: Record<string, VulnMapEntry>): Map<string, VulnMapEntry> {
  return new Map(Object.entries(entries));
}

describe('selectBestVersion (FSM)', () => {
  it('should select latest old version without vulnerabilities -> success', () => {
    const registry = makeRegistryData({ '1.0.0': OLD_DATE, '1.1.0': OLD_DATE, '1.2.0': OLD_DATE });
    const result = selectBestVersion('test-pkg', '^1.0.0', registry, makeVulnMap({}), 30);
    expect(isSome(result)).toBe(true);
    if (isSome(result)) {
      expect(result.value.version).toBe('1.2.0');
      expect(result.value.category).toBe('success');
    }
  });

  it('should return due1month when all versions are fresh', () => {
    const registry = makeRegistryData({ '1.0.0': FRESH_DATE, '1.1.0': FRESH_DATE });
    const result = selectBestVersion('test-pkg', '^1.0.0', registry, makeVulnMap({}), 30);
    expect(isSome(result)).toBe(true);
    if (isSome(result)) expect(result.value.category).toBe('due1month');
  });

  it('should return mixed when old versions are vulnerable but fresh ones exist', () => {
    const registry = makeRegistryData({ '1.0.0': OLD_DATE, '1.1.0': FRESH_DATE });
    const vulnMap = makeVulnMap({
      'pkg:npm/test-pkg@1.0.0': { vulnerabilities: [{ id: 'CVE-1', summary: 'bad', cvssScore: 7.5 }] },
    });
    const result = selectBestVersion('test-pkg', '^1.0.0', registry, vulnMap, 30);
    expect(isSome(result)).toBe(true);
    if (isSome(result)) expect(result.value.category).toBe('mixed');
  });

  it('should return maybeVulnerable when all old are vulnerable and no fresh exist', () => {
    const registry = makeRegistryData({ '1.0.0': OLD_DATE });
    const vulnMap = makeVulnMap({
      'pkg:npm/test-pkg@1.0.0': { vulnerabilities: [{ id: 'CVE-1', summary: 'bad', cvssScore: 9.0 }] },
    });
    const result = selectBestVersion('test-pkg', '^1.0.0', registry, vulnMap, 30);
    expect(isSome(result)).toBe(true);
    if (isSome(result)) expect(result.value.category).toBe('maybeVulnerable');
  });

  it('should return None when no versions match the range', () => {
    const registry = makeRegistryData({ '2.0.0': OLD_DATE });
    expect(isNone(selectBestVersion('test-pkg', '^1.0.0', registry, makeVulnMap({}), 30))).toBe(true);
  });

  it('should return None when registry data is null', () => {
    expect(isNone(selectBestVersion('test-pkg', '^1.0.0', null, makeVulnMap({}), 30))).toBe(true);
  });

  it('should encode scoped package names in PURL for vulnerability lookup', () => {
    const registry = makeRegistryData({ '1.0.0': OLD_DATE });
    const vulnMap = makeVulnMap({
      'pkg:npm/%40scope/pkg@1.0.0': { vulnerabilities: [{ id: 'CVE-1', summary: 'bad', cvssScore: 9.0 }] },
    });
    const result = selectBestVersion('@scope/pkg', '^1.0.0', registry, vulnMap, 30);
    expect(isSome(result)).toBe(true);
    if (isSome(result)) expect(result.value.category).toBe('maybeVulnerable');
  });
});
