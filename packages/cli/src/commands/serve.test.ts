import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LockwiseReport } from '@lockwise/core';
import fs from 'node:fs';

vi.mock('node:fs');

const mockReport: LockwiseReport = {
  meta: { lockfileType: 'npm', analyzedAt: '2026-03-17T10:00:00.000Z', totalPackages: 5 },
  packages: [],
  summary: { success: 5, due1month: 0, mixed: 0, maybeVulnerable: 0, unavailable: 0 },
  nexusUpload: [],
};

describe('createApiRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a function (express router)', async () => {
    const { createApiRouter } = await import('./serve.js');
    const router = createApiRouter('.lockwise');
    expect(typeof router).toBe('function');
  });
});

describe('loadLatestReport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should load report from latest.json', async () => {
    const { loadLatestReport } = await import('./serve.js');
    const mockedFs = vi.mocked(fs);
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockReport));

    const report = loadLatestReport('.lockwise');
    expect(report).toEqual(mockReport);
  });

  it('should return null when latest.json does not exist', async () => {
    const { loadLatestReport } = await import('./serve.js');
    const mockedFs = vi.mocked(fs);
    mockedFs.existsSync.mockReturnValue(false);

    const report = loadLatestReport('.lockwise');
    expect(report).toBeNull();
  });
});
