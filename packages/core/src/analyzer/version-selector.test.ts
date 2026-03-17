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
  it('должен выбрать последнюю старую версию без уязвимостей -> success', () => {
    const registry = makeRegistryData({ '1.0.0': OLD_DATE, '1.1.0': OLD_DATE, '1.2.0': OLD_DATE });
    const result = selectBestVersion('test-pkg', '^1.0.0', registry, makeVulnMap({}), 30);
    expect(result).not.toBeNull();
    expect(result!.version).toBe('1.2.0');
    expect(result!.category).toBe('success');
  });

  it('должен вернуть due1month если все версии свежие', () => {
    const registry = makeRegistryData({ '1.0.0': FRESH_DATE, '1.1.0': FRESH_DATE });
    const result = selectBestVersion('test-pkg', '^1.0.0', registry, makeVulnMap({}), 30);
    expect(result!.category).toBe('due1month');
  });

  it('должен вернуть mixed если старые уязвимы, но есть свежие', () => {
    const registry = makeRegistryData({ '1.0.0': OLD_DATE, '1.1.0': FRESH_DATE });
    const vulnMap = makeVulnMap({
      'pkg:npm/test-pkg@1.0.0': { vulnerabilities: [{ id: 'CVE-1', summary: 'bad', cvssScore: 7.5 }] },
    });
    const result = selectBestVersion('test-pkg', '^1.0.0', registry, vulnMap, 30);
    expect(result!.category).toBe('mixed');
  });

  it('должен вернуть maybeVulnerable если все старые уязвимы и нет свежих', () => {
    const registry = makeRegistryData({ '1.0.0': OLD_DATE });
    const vulnMap = makeVulnMap({
      'pkg:npm/test-pkg@1.0.0': { vulnerabilities: [{ id: 'CVE-1', summary: 'bad', cvssScore: 9.0 }] },
    });
    const result = selectBestVersion('test-pkg', '^1.0.0', registry, vulnMap, 30);
    expect(result!.category).toBe('maybeVulnerable');
  });

  it('должен вернуть null если нет версий в range', () => {
    const registry = makeRegistryData({ '2.0.0': OLD_DATE });
    expect(selectBestVersion('test-pkg', '^1.0.0', registry, makeVulnMap({}), 30)).toBeNull();
  });

  it('должен вернуть null при отсутствии данных registry', () => {
    expect(selectBestVersion('test-pkg', '^1.0.0', null, makeVulnMap({}), 30)).toBeNull();
  });
});
