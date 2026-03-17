import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyze } from './analyze.js';
import type { LockwiseConfig, ParsedLockfile } from '../types.js';

vi.mock('../checkers/nexus-checker.js', () => ({
  buildNexusTarballUrl: vi.fn((name: string, version: string, url: string) =>
    `${url}/${name}/-/${name.split('/').pop()}-${version}.tgz`
  ),
  checkNexusAvailability: vi.fn(),
}));

vi.mock('../checkers/osv-checker.js', () => ({
  checkVulnerabilities: vi.fn(),
}));

vi.mock('../checkers/registry-fetcher.js', () => ({
  createRegistryFetcher: vi.fn(),
}));

import { checkNexusAvailability } from '../checkers/nexus-checker.js';
import { checkVulnerabilities } from '../checkers/osv-checker.js';
import { createRegistryFetcher } from '../checkers/registry-fetcher.js';

const mockedCheckNexus = vi.mocked(checkNexusAvailability);
const mockedCheckVulns = vi.mocked(checkVulnerabilities);
const mockedCreateFetcher = vi.mocked(createRegistryFetcher);

const ONE_MONTH_MS = 31 * 24 * 60 * 60 * 1000;
const OLD_DATE = new Date(Date.now() - ONE_MONTH_MS).toISOString();

const config: LockwiseConfig = {
  nexusUrl: 'http://nexus.test/npm',
  publicRegistry: 'https://registry.npmjs.org',
  minAgeDays: 30,
  outputDir: '.lockwise',
};

describe('analyze', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return LockwiseReport with all fields', async () => {
    const parsedLockfile: ParsedLockfile = {
      type: 'npm',
      packages: [{ name: 'axios', version: '1.7.2', resolved: 'https://registry.npmjs.org/axios/-/axios-1.7.2.tgz' }],
      rawPackages: {
        '': { dependencies: { axios: '^1.7.0' } },
        'node_modules/axios': { version: '1.7.2' },
      },
    };
    mockedCheckNexus.mockResolvedValue(200);
    mockedCheckVulns.mockResolvedValue(new Map());
    mockedCreateFetcher.mockReturnValue({
      fetch: vi.fn().mockResolvedValue({ name: 'axios', versions: { '1.7.2': {} }, time: { '1.7.2': OLD_DATE } }),
    });

    const report = await analyze(parsedLockfile, config);
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
        '': { dependencies: { foo: '^1.0.0' } },
        'node_modules/foo': { version: '1.0.0' },
      },
    };
    mockedCheckNexus.mockResolvedValue(404);
    mockedCheckVulns.mockResolvedValue(new Map());
    mockedCreateFetcher.mockReturnValue({
      fetch: vi.fn().mockResolvedValue({ name: 'foo', versions: { '1.0.0': {} }, time: { '1.0.0': OLD_DATE } }),
    });

    const report = await analyze(parsedLockfile, config);
    expect(report.nexusUpload.length).toBeGreaterThan(0);
  });
});
