import { describe, it, expect } from 'vitest';
import { selectBestVersion } from './version-selector.js';
import type { VulnMapEntry } from '../checkers/osv-checker.js';

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

describe('selectBestVersion', () => {
  it('should select latest old version without vulnerabilities -> success', () => {
    const registry = makeRegistryData({ '1.0.0': OLD_DATE, '1.1.0': OLD_DATE, '1.2.0': OLD_DATE });
    const result = selectBestVersion('test-pkg', '^1.0.0', registry, makeVulnMap({}), 30);
    expect(result).not.toBeNull();
    expect(result!.version).toBe('1.2.0');
    expect(result!.category).toBe('success');
  });

  it('should return due1month when all versions are fresh', () => {
    const registry = makeRegistryData({ '1.0.0': FRESH_DATE, '1.1.0': FRESH_DATE });
    const result = selectBestVersion('test-pkg', '^1.0.0', registry, makeVulnMap({}), 30);
    expect(result!.category).toBe('due1month');
  });

  it('should return mixed when old versions are vulnerable but fresh ones exist', () => {
    const registry = makeRegistryData({ '1.0.0': OLD_DATE, '1.1.0': FRESH_DATE });
    const vulnMap = makeVulnMap({
      'pkg:npm/test-pkg@1.0.0': { vulnerabilities: [{ id: 'CVE-1', summary: 'bad', cvssScore: 7.5 }] },
    });
    const result = selectBestVersion('test-pkg', '^1.0.0', registry, vulnMap, 30);
    expect(result!.category).toBe('mixed');
  });

  it('should return maybeVulnerable when all old versions are vulnerable and no fresh ones exist', () => {
    const registry = makeRegistryData({ '1.0.0': OLD_DATE });
    const vulnMap = makeVulnMap({
      'pkg:npm/test-pkg@1.0.0': { vulnerabilities: [{ id: 'CVE-1', summary: 'bad', cvssScore: 9.0 }] },
    });
    const result = selectBestVersion('test-pkg', '^1.0.0', registry, vulnMap, 30);
    expect(result!.category).toBe('maybeVulnerable');
  });

  it('should return null when no versions match the range', () => {
    const registry = makeRegistryData({ '2.0.0': OLD_DATE });
    expect(selectBestVersion('test-pkg', '^1.0.0', registry, makeVulnMap({}), 30)).toBeNull();
  });

  it('should return null when registry data is missing', () => {
    expect(selectBestVersion('test-pkg', '^1.0.0', null, makeVulnMap({}), 30)).toBeNull();
  });
});
