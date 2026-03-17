import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveReport } from '../report-saver.js';
import fs from 'node:fs';
import type { LockwiseReport } from '@lockwise/core';

vi.mock('node:fs');
const mockedFs = vi.mocked(fs);

const mockReport: LockwiseReport = {
  meta: { lockfileType: 'npm', analyzedAt: '2026-03-17T10:00:00.000Z', totalPackages: 2 },
  packages: [],
  summary: { success: 1, due1month: 1, mixed: 0, maybeVulnerable: 0, unavailable: 0 },
  nexusUpload: '',
};

describe('saveReport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.writeFileSync.mockReturnValue(undefined);
    mockedFs.copyFileSync.mockReturnValue(undefined);
  });

  it('should create output directory if it does not exist', () => {
    mockedFs.existsSync.mockReturnValue(false);

    saveReport(mockReport, '.lockwise');

    expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('reports'),
      { recursive: true },
    );
  });

  it('should write report as JSON with timestamp filename', () => {
    mockedFs.existsSync.mockReturnValue(true);

    const filePath = saveReport(mockReport, '.lockwise');

    expect(filePath).toMatch(/\.lockwise\/reports\/\d{4}-\d{2}-\d{2}T[\d-]+Z\.json$/);
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      filePath,
      JSON.stringify(mockReport, null, 2),
      'utf-8',
    );
  });

  it('should copy report as latest.json', () => {
    mockedFs.existsSync.mockReturnValue(true);

    saveReport(mockReport, '.lockwise');

    expect(mockedFs.copyFileSync).toHaveBeenCalledWith(
      expect.stringContaining('reports/'),
      expect.stringContaining('latest.json'),
    );
  });

  it('should write to explicit output path instead of default when provided', () => {
    mockedFs.existsSync.mockReturnValue(true);

    const filePath = saveReport(mockReport, '.lockwise', '/project/custom-report.json');

    expect(filePath).toBe('/project/custom-report.json');
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      '/project/custom-report.json',
      JSON.stringify(mockReport, null, 2),
      'utf-8',
    );
  });

  it('should create parent directory when explicit output path parent does not exist', () => {
    mockedFs.existsSync.mockReturnValue(false);

    const filePath = saveReport(mockReport, '.lockwise', '/new-dir/report.json');

    expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/new-dir', { recursive: true });
    expect(filePath).toBe('/new-dir/report.json');
  });
});
