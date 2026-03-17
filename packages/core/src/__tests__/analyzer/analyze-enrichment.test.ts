import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyze } from '../../analyzer/analyze.js';
import type { ParsedLockfile, LockwiseConfig } from '../../types.js';

vi.mock('../../checkers/nexus-checker.js', () => ({
  buildNexusTarballUrl: vi.fn((name: string, version: string, url: string) =>
    `${url}/${name}/-/${name.split('/').pop()}-${version}.tgz`,
  ),
  checkNexusAvailability: vi.fn(),
}));

vi.mock('../../checkers/osv-checker.js', () => ({
  checkVulnerabilities: vi.fn(),
}));

vi.mock('../../checkers/registry-fetcher.js', () => ({
  createRegistryFetcher: vi.fn(),
}));

import { checkNexusAvailability } from '../../checkers/nexus-checker.js';
import { checkVulnerabilities } from '../../checkers/osv-checker.js';
import { createRegistryFetcher } from '../../checkers/registry-fetcher.js';

const mockedCheckNexus = vi.mocked(checkNexusAvailability);
const mockedCheckVulns = vi.mocked(checkVulnerabilities);
const mockedCreateFetcher = vi.mocked(createRegistryFetcher);

const ONE_MONTH_MS = 31 * 24 * 60 * 60 * 1000;
const OLD_DATE = new Date(Date.now() - ONE_MONTH_MS).toISOString();

const config: LockwiseConfig = {
  nexusUrl: 'http://nexus.test/repository/npm',
  publicRegistry: 'https://registry.npmjs.org',
  minAgeDays: 30,
  outputDir: '.lockwise',
};

describe('enriched PackageResult fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include availableVersions from registry data filtered by semver range', async () => {
    mockedCheckNexus.mockResolvedValue(200);
    mockedCheckVulns.mockResolvedValue(new Map());
    mockedCreateFetcher.mockReturnValue({
      fetch: vi.fn().mockResolvedValue({
        name: 'lodash',
        versions: {
          '4.17.20': {},
          '4.17.21': {},
          '4.18.0': {},
          '5.0.0': {},
        },
        time: {
          '4.17.20': '2020-01-01T00:00:00.000Z',
          '4.17.21': '2020-06-01T00:00:00.000Z',
          '4.18.0': '2020-09-01T00:00:00.000Z',
          '5.0.0': '2025-01-01T00:00:00.000Z',
        },
      }),
    });

    const lockfile: ParsedLockfile = {
      type: 'npm',
      packages: [{ name: 'lodash', version: '4.17.20' }],
      rawPackages: {
        '': { dependencies: { lodash: '^4.17.0' } },
      },
    };

    const report = await analyze(lockfile, config);
    const pkg = report.packages[0];

    expect(pkg.availableVersions).toBeDefined();
    expect(pkg.availableVersions!.length).toBeGreaterThan(0);
    expect(pkg.availableVersions![0]).toEqual(
      expect.objectContaining({
        version: expect.any(String),
        publishedAt: expect.any(String),
        isInNexus: expect.any(Boolean),
      }),
    );

    // Only versions matching ^4.17.0 should be included (not 5.0.0)
    const versionStrings = pkg.availableVersions!.map((v) => v.version);
    expect(versionStrings).toContain('4.17.20');
    expect(versionStrings).toContain('4.17.21');
    expect(versionStrings).not.toContain('5.0.0');
  });

  it('should include consumers from range map', async () => {
    mockedCheckNexus.mockResolvedValue(200);
    mockedCheckVulns.mockResolvedValue(new Map());
    mockedCreateFetcher.mockReturnValue({
      fetch: vi.fn().mockResolvedValue({
        name: 'lodash',
        versions: { '4.17.21': {} },
        time: { '4.17.21': OLD_DATE },
      }),
    });

    const lockfile: ParsedLockfile = {
      type: 'npm',
      packages: [{ name: 'lodash', version: '4.17.21' }],
      rawPackages: {
        '': { dependencies: { lodash: '^4.17.0' } },
        'node_modules/my-lib': { dependencies: { lodash: '~4.17.20' } },
      },
    };

    const report = await analyze(lockfile, config);
    const pkg = report.packages[0];

    expect(pkg.consumers).toBeDefined();
    expect(pkg.consumers!.length).toBe(2);
    expect(pkg.consumers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: '', range: '^4.17.0' }),
        expect.objectContaining({ name: 'node_modules/my-lib', range: '~4.17.20' }),
      ]),
    );
  });

  it('should set availableVersions to empty array when registry data is null', async () => {
    mockedCheckNexus.mockResolvedValue(404);
    mockedCheckVulns.mockResolvedValue(new Map());
    mockedCreateFetcher.mockReturnValue({
      fetch: vi.fn().mockResolvedValue(null),
    });

    const lockfile: ParsedLockfile = {
      type: 'npm',
      packages: [{ name: '@internal/pkg', version: '1.0.0' }],
      rawPackages: {
        '': { dependencies: { '@internal/pkg': '^1.0.0' } },
      },
    };

    const report = await analyze(lockfile, config);
    const pkg = report.packages[0];

    expect(pkg.availableVersions).toEqual([]);
    expect(pkg.consumers).toBeDefined();
  });
});
