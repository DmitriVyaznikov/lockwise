import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isOk, ok, err } from '../../fp/result.js';
import type { ParsedLockfile, LockwiseConfig } from '../../domain/report.js';
import { registryError } from '../../domain/errors.js';

vi.mock('../../checkers/nexus.js', () => ({
  buildNexusTarballUrl: vi.fn((name: string, version: string, url: string) =>
    `${url}/${name}/-/${name.split('/').pop()}-${version}.tgz`,
  ),
  checkNexusAvailability: vi.fn(),
}));

vi.mock('../../checkers/osv.js', () => ({
  checkVulnerabilities: vi.fn(),
}));

vi.mock('../../checkers/registry.js', () => ({
  createRegistryFetcher: vi.fn(),
}));

import { checkNexusAvailability } from '../../checkers/nexus.js';
import { checkVulnerabilities } from '../../checkers/osv.js';
import { createRegistryFetcher } from '../../checkers/registry.js';
import { analyze } from '../../analyzer/pipeline.js';

const mockedCheckNexus = vi.mocked(checkNexusAvailability);
const mockedCheckVulns = vi.mocked(checkVulnerabilities);
const mockedCreateFetcher = vi.mocked(createRegistryFetcher);

const ONE_MONTH_MS = 31 * 24 * 60 * 60 * 1000;
const OLD_DATE = new Date(Date.now() - ONE_MONTH_MS).toISOString();

const config: LockwiseConfig = {
  nexusUrl: 'http://nexus.test/npm',
  publicRegistry: 'https://registry.npmjs.org',
  minAgeDays: 30,
};

describe('analyze pipeline', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return Ok with LockwiseReport containing all fields', async () => {
    const parsedLockfile: ParsedLockfile = {
      type: 'npm',
      packages: [{ name: 'axios', version: '1.7.2', resolved: 'https://registry.npmjs.org/axios/-/axios-1.7.2.tgz' }],
      rawPackages: {
        '': { version: '1.0.0', dependencies: { axios: '^1.7.0' } },
        'node_modules/axios': { version: '1.7.2' },
      },
    };
    mockedCheckNexus.mockResolvedValue(ok(200));
    mockedCheckVulns.mockResolvedValue(ok(new Map()));
    mockedCreateFetcher.mockReturnValue({
      fetch: vi.fn().mockResolvedValue(ok({ name: 'axios', versions: { '1.7.2': {} }, time: { '1.7.2': OLD_DATE } })),
    });

    const result = await analyze(parsedLockfile, config);
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    const report = result.value;
    expect(report.meta.lockfileType).toBe('npm');
    expect(report.meta.totalPackages).toBe(1);
    expect(report.packages).toHaveLength(1);
    expect(report.summary).toBeDefined();
    expect(report.nexusUpload).toBeDefined();
  });

  it('should include 404 Nexus packages in nexusUpload', async () => {
    const parsedLockfile: ParsedLockfile = {
      type: 'npm',
      packages: [{ name: 'foo', version: '1.0.0' }],
      rawPackages: {
        '': { version: '1.0.0', dependencies: { foo: '^1.0.0' } },
        'node_modules/foo': { version: '1.0.0' },
      },
    };
    mockedCheckNexus.mockResolvedValue(ok(404));
    mockedCheckVulns.mockResolvedValue(ok(new Map()));
    mockedCreateFetcher.mockReturnValue({
      fetch: vi.fn().mockResolvedValue(ok({ name: 'foo', versions: { '1.0.0': {} }, time: { '1.0.0': OLD_DATE } })),
    });

    const result = await analyze(parsedLockfile, config);
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.nexusUpload.length).toBeGreaterThan(0);
  });

  it('should include recommended version in nexusUpload as name@version', async () => {
    const parsedLockfile: ParsedLockfile = {
      type: 'npm',
      packages: [{ name: 'foo', version: '1.0.0' }],
      rawPackages: {
        '': { version: '1.0.0', dependencies: { foo: '^1.0.0' } },
        'node_modules/foo': { version: '1.0.0' },
      },
    };
    mockedCheckNexus.mockResolvedValue(ok(404));
    mockedCheckVulns.mockResolvedValue(ok(new Map()));
    mockedCreateFetcher.mockReturnValue({
      fetch: vi.fn().mockResolvedValue(ok({
        name: 'foo',
        versions: { '1.0.0': {}, '1.2.0': {} },
        time: { '1.0.0': OLD_DATE, '1.2.0': OLD_DATE },
      })),
    });

    const result = await analyze(parsedLockfile, config);
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.nexusUpload).toContain('foo@1.0.0');
    expect(result.value.nexusUpload).toContain('foo@1.2.0');
  });

  it('should not duplicate entries when recommended equals current', async () => {
    const parsedLockfile: ParsedLockfile = {
      type: 'npm',
      packages: [{ name: 'bar', version: '2.0.0' }],
      rawPackages: {
        '': { version: '1.0.0', dependencies: { bar: '^2.0.0' } },
        'node_modules/bar': { version: '2.0.0' },
      },
    };
    mockedCheckNexus.mockResolvedValue(ok(404));
    mockedCheckVulns.mockResolvedValue(ok(new Map()));
    mockedCreateFetcher.mockReturnValue({
      fetch: vi.fn().mockResolvedValue(ok({
        name: 'bar',
        versions: { '2.0.0': {} },
        time: { '2.0.0': OLD_DATE },
      })),
    });

    const result = await analyze(parsedLockfile, config);
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.nexusUpload.split(' ').filter((u) => u === 'bar@2.0.0')).toHaveLength(1);
  });

  it('should categorize as unavailable when registry fetch fails', async () => {
    const parsedLockfile: ParsedLockfile = {
      type: 'npm',
      packages: [{ name: 'unknown-pkg', version: '1.0.0' }],
      rawPackages: {
        '': { version: '1.0.0', dependencies: { 'unknown-pkg': '^1.0.0' } },
        'node_modules/unknown-pkg': { version: '1.0.0' },
      },
    };
    mockedCheckNexus.mockResolvedValue(ok(404));
    mockedCheckVulns.mockResolvedValue(ok(new Map()));
    mockedCreateFetcher.mockReturnValue({
      fetch: vi.fn().mockResolvedValue(err(registryError('unknown-pkg', new Error('not found')))),
    });

    const result = await analyze(parsedLockfile, config);
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.packages[0].category).toBe('unavailable');
    expect(result.value.summary.unavailable).toBe(1);
  });

  it('should build summary using monoid fold', async () => {
    const parsedLockfile: ParsedLockfile = {
      type: 'npm',
      packages: [
        { name: 'a', version: '1.0.0' },
        { name: 'b', version: '2.0.0' },
      ],
      rawPackages: {
        '': { version: '1.0.0', dependencies: { a: '^1.0.0', b: '^2.0.0' } },
        'node_modules/a': { version: '1.0.0' },
        'node_modules/b': { version: '2.0.0' },
      },
    };
    mockedCheckNexus.mockResolvedValue(ok(200));
    mockedCheckVulns.mockResolvedValue(ok(new Map()));
    mockedCreateFetcher.mockReturnValue({
      fetch: vi.fn().mockResolvedValue(ok({
        name: 'a',
        versions: { '1.0.0': {}, '2.0.0': {} },
        time: { '1.0.0': OLD_DATE, '2.0.0': OLD_DATE },
      })),
    });

    const result = await analyze(parsedLockfile, config);
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    const { summary } = result.value;
    expect(summary.success + summary.due1month + summary.mixed + summary.maybeVulnerable + summary.unavailable)
      .toBe(2);
  });

  it('should include availableVersions filtered by semver range', async () => {
    mockedCheckNexus.mockResolvedValue(ok(200));
    mockedCheckVulns.mockResolvedValue(ok(new Map()));
    mockedCreateFetcher.mockReturnValue({
      fetch: vi.fn().mockResolvedValue(ok({
        name: 'lodash',
        versions: { '4.17.20': {}, '4.17.21': {}, '4.18.0': {}, '5.0.0': {} },
        time: {
          '4.17.20': '2020-01-01T00:00:00.000Z',
          '4.17.21': '2020-06-01T00:00:00.000Z',
          '4.18.0': '2020-09-01T00:00:00.000Z',
          '5.0.0': '2025-01-01T00:00:00.000Z',
        },
      })),
    });

    const lockfile: ParsedLockfile = {
      type: 'npm',
      packages: [{ name: 'lodash', version: '4.17.20' }],
      rawPackages: {
        '': { version: '1.0.0', dependencies: { lodash: '^4.17.0' } },
      },
    };

    const result = await analyze(lockfile, config);
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    const pkg = result.value.packages[0];
    const versionStrings = pkg.availableVersions.map((v) => v.version);
    expect(versionStrings).toContain('4.17.20');
    expect(versionStrings).toContain('4.17.21');
    expect(versionStrings).not.toContain('5.0.0');
  });

  it('should include consumers from range map', async () => {
    mockedCheckNexus.mockResolvedValue(ok(200));
    mockedCheckVulns.mockResolvedValue(ok(new Map()));
    mockedCreateFetcher.mockReturnValue({
      fetch: vi.fn().mockResolvedValue(ok({
        name: 'lodash',
        versions: { '4.17.21': {} },
        time: { '4.17.21': OLD_DATE },
      })),
    });

    const lockfile: ParsedLockfile = {
      type: 'npm',
      packages: [{ name: 'lodash', version: '4.17.21' }],
      rawPackages: {
        '': { version: '1.0.0', dependencies: { lodash: '^4.17.0' } },
        'node_modules/my-lib': { version: '1.0.0', dependencies: { lodash: '~4.17.20' } },
      },
    };

    const result = await analyze(lockfile, config);
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    const pkg = result.value.packages[0];
    expect(pkg.consumers.length).toBe(2);
    expect(pkg.consumers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: '', range: '^4.17.0' }),
        expect.objectContaining({ name: 'node_modules/my-lib', range: '~4.17.20' }),
      ]),
    );
  });

  it('should set availableVersions to empty when registry fails', async () => {
    mockedCheckNexus.mockResolvedValue(ok(404));
    mockedCheckVulns.mockResolvedValue(ok(new Map()));
    mockedCreateFetcher.mockReturnValue({
      fetch: vi.fn().mockResolvedValue(err(registryError('@internal/pkg', new Error('not found')))),
    });

    const lockfile: ParsedLockfile = {
      type: 'npm',
      packages: [{ name: '@internal/pkg', version: '1.0.0' }],
      rawPackages: {
        '': { version: '1.0.0', dependencies: { '@internal/pkg': '^1.0.0' } },
      },
    };

    const result = await analyze(lockfile, config);
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    const pkg = result.value.packages[0];
    expect(pkg.availableVersions).toEqual([]);
    expect(pkg.consumers).toBeDefined();
  });
});
