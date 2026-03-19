import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LockwiseReport } from '@lockwise/core';

vi.mock('node:fs');
vi.mock('@lockwise/core', () => ({
  analyze: vi.fn(),
  detectAndParse: vi.fn(),
  isOk: vi.fn((r: { _tag: string }) => r._tag === 'Ok'),
  isErr: vi.fn((r: { _tag: string }) => r._tag === 'Err'),
  formatError: vi.fn((e: { message: string }) => e.message),
}));
vi.mock('../../config.js', () => ({
  resolveConfig: vi.fn().mockReturnValue({
    nexusUrl: 'http://nexus.test/repository/npm-group',
    publicRegistry: 'https://registry.npmjs.org',
    minAgeDays: 30,
    outputDir: '.lockwise',
  }),
}));
vi.mock('ora', () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  }),
}));
vi.mock('../../lockfile-resolver.js', () => ({
  resolveLockfile: vi.fn().mockReturnValue('/project/package-lock.json'),
}));
vi.mock('../../report-saver.js', () => ({
  saveReport: vi.fn().mockReturnValue('/project/.lockwise/reports/latest.json'),
}));
vi.mock('../../formatters/summary.js', () => ({
  formatSummary: vi.fn().mockReturnValue('summary-output'),
}));
vi.mock('../../formatters/table.js', () => ({
  formatTable: vi.fn().mockReturnValue('table-output'),
}));
vi.mock('../../formatters/upload-list.js', () => ({
  formatUploadList: vi.fn().mockReturnValue('upload-list-output'),
}));
vi.mock('../../exit-code.js', () => ({
  resolveExitCode: vi.fn().mockReturnValue(0),
}));

const mockReport: LockwiseReport = {
  meta: {
    lockfileType: 'npm',
    analyzedAt: '2026-03-17T10:00:00.000Z',
    totalPackages: 5,
    configUsed: {
      nexusUrl: 'http://nexus.test/repository/npm-group',
      publicRegistry: 'https://registry.npmjs.org',
      minAgeDays: 30,
    },
  },
  packages: [
    {
      name: 'lodash',
      currentVersion: '4.17.21',
      recommendedVersion: '4.17.21',
      category: 'success',
      vulnerabilities: [],
      isInNexus: true,
      maxCvss: 0,
      availableVersions: [],
      consumers: [],
      range: '^4.17.0',
    },
  ],
  summary: { success: 5, due1month: 0, mixed: 0, maybeVulnerable: 0, unavailable: 0 },
  nexusUpload: '',
};

function okResult<T>(value: T) {
  return { _tag: 'Ok' as const, value };
}

function errResult<E>(error: E) {
  return { _tag: 'Err' as const, error };
}

describe('runAnalyze', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const fs = await import('node:fs');
    vi.mocked(fs.default.existsSync).mockReturnValue(true);
    vi.mocked(fs.default.readFileSync).mockReturnValue('{"lockfileVersion": 3, "packages": {}}');
    vi.mocked(fs.default.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.default.writeFileSync).mockReturnValue(undefined);
    vi.mocked(fs.default.copyFileSync).mockReturnValue(undefined);

    const core = await import('@lockwise/core');
    vi.mocked(core.detectAndParse).mockReturnValue(okResult({
      type: 'npm' as const,
      packages: [{ name: 'lodash', version: '4.17.21' }],
      rawPackages: {},
    }));
    vi.mocked(core.analyze).mockResolvedValue(okResult(mockReport));

    const { resolveLockfile } = await import('../../lockfile-resolver.js');
    vi.mocked(resolveLockfile).mockReturnValue('/project/package-lock.json');

    const { saveReport } = await import('../../report-saver.js');
    vi.mocked(saveReport).mockReturnValue('/project/.lockwise/reports/latest.json');

    const { resolveExitCode } = await import('../../exit-code.js');
    vi.mocked(resolveExitCode).mockReturnValue(0);

    const { resolveConfig } = await import('../../config.js');
    vi.mocked(resolveConfig).mockReturnValue({
      nexusUrl: 'http://nexus.test/repository/npm-group',
      publicRegistry: 'https://registry.npmjs.org',
      minAgeDays: 30,
      outputDir: '.lockwise',
      servePort: 3001,
      uiPort: 3000,
    });
  });

  it('should return exit code 0 when all packages are OK', async () => {
    const { runAnalyze } = await import('../../commands/analyze.js');
    const result = await runAnalyze({});
    expect(result.exitCode).toBe(0);
  });

  it('should return the report', async () => {
    const { runAnalyze } = await import('../../commands/analyze.js');
    const result = await runAnalyze({});
    expect(result.report).toEqual(mockReport);
  });

  it('should throw when lockfile cannot be parsed', async () => {
    const core = await import('@lockwise/core');
    vi.mocked(core.detectAndParse).mockReturnValue(errResult({ _kind: 'parse', message: 'bad' }));

    const { runAnalyze } = await import('../../commands/analyze.js');
    await expect(runAnalyze({})).rejects.toThrow('Failed to parse lockfile');
  });

  it('should pass explicit lockfile path to resolveLockfile', async () => {
    const { resolveLockfile } = await import('../../lockfile-resolver.js');
    const { runAnalyze } = await import('../../commands/analyze.js');
    await runAnalyze({ lockfile: '/project/custom.json' });
    expect(resolveLockfile).toHaveBeenCalledWith('/project/custom.json');
  });

  it('should pass nexusUrl CLI option to resolveConfig', async () => {
    const { resolveConfig } = await import('../../config.js');
    const { runAnalyze } = await import('../../commands/analyze.js');
    await runAnalyze({ nexusUrl: 'http://custom-nexus/npm' });
    expect(resolveConfig).toHaveBeenCalledWith({ nexusUrl: 'http://custom-nexus/npm' });
  });

  it('should output JSON when json option is true', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { runAnalyze } = await import('../../commands/analyze.js');
    await runAnalyze({ json: true });
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockReport, null, 2));
    consoleSpy.mockRestore();
  });

  it('should output formatted text when json option is false', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { formatSummary } = await import('../../formatters/summary.js');
    const { formatTable } = await import('../../formatters/table.js');
    const { formatUploadList } = await import('../../formatters/upload-list.js');

    const { runAnalyze } = await import('../../commands/analyze.js');
    await runAnalyze({});

    expect(formatSummary).toHaveBeenCalledWith(mockReport);
    expect(formatTable).toHaveBeenCalledWith(mockReport.packages);
    expect(formatUploadList).toHaveBeenCalledWith(mockReport.nexusUpload);
    consoleSpy.mockRestore();
  });

  it('should save the report', async () => {
    const { saveReport } = await import('../../report-saver.js');
    const { runAnalyze } = await import('../../commands/analyze.js');
    await runAnalyze({});
    expect(saveReport).toHaveBeenCalledWith(mockReport, '.lockwise', undefined);
  });

  it('should pass output option to saveReport', async () => {
    const { saveReport } = await import('../../report-saver.js');
    const { runAnalyze } = await import('../../commands/analyze.js');
    await runAnalyze({ output: '/custom/report.json' });
    expect(saveReport).toHaveBeenCalledWith(mockReport, '.lockwise', '/custom/report.json');
  });

  it('should return exit code from resolveExitCode', async () => {
    const { resolveExitCode } = await import('../../exit-code.js');
    vi.mocked(resolveExitCode).mockReturnValue(2);

    const { runAnalyze } = await import('../../commands/analyze.js');
    const result = await runAnalyze({});
    expect(result.exitCode).toBe(2);
  });

  it('should wire onProgress callback to core analyze', async () => {
    const core = await import('@lockwise/core');
    let capturedOnProgress: ((phase: string, current: number, total: number) => void) | undefined;
    vi.mocked(core.analyze).mockImplementation(async (_parsed, _config, options) => {
      capturedOnProgress = options?.onProgress;
      return okResult(mockReport);
    });

    const { runAnalyze } = await import('../../commands/analyze.js');
    await runAnalyze({});

    expect(capturedOnProgress).toBeDefined();
    capturedOnProgress!('nexus', 0, 10);
    capturedOnProgress!('nexus', 10, 10);
  });
});
