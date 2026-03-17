import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LockwiseReport } from '@lockwise/core';
import fs from 'node:fs';
import express from 'express';
import request from 'supertest';
import { createApiRouter, loadLatestReport } from './serve.js';

vi.mock('node:fs');

const mockReport: LockwiseReport = {
  meta: { lockfileType: 'npm', analyzedAt: '2026-03-17T10:00:00.000Z', totalPackages: 5 },
  packages: [],
  summary: { success: 5, due1month: 0, mixed: 0, maybeVulnerable: 0, unavailable: 0 },
  nexusUpload: [],
};

describe('loadLatestReport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should load report from latest.json', () => {
    const mockedFs = vi.mocked(fs);
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockReport));

    const report = loadLatestReport('.lockwise');
    expect(report).toEqual(mockReport);
  });

  it('should return null when latest.json does not exist', () => {
    const mockedFs = vi.mocked(fs);
    mockedFs.existsSync.mockReturnValue(false);

    const report = loadLatestReport('.lockwise');
    expect(report).toBeNull();
  });

  it('should return null on malformed JSON', () => {
    const mockedFs = vi.mocked(fs);
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('not json');

    const report = loadLatestReport('.lockwise');
    expect(report).toBeNull();
  });
});

describe('GET /api/report', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createApp(outputDir: string) {
    const app = express();
    app.use(createApiRouter(outputDir));
    return app;
  }

  it('should return 200 with report when available', async () => {
    const mockedFs = vi.mocked(fs);
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockReport));

    const res = await request(createApp('.lockwise')).get('/api/report');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockReport);
  });

  it('should return 404 when no report exists', async () => {
    const mockedFs = vi.mocked(fs);
    mockedFs.existsSync.mockReturnValue(false);

    const res = await request(createApp('.lockwise')).get('/api/report');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/No report found/);
  });

  it('should return 404 when report is malformed', async () => {
    const mockedFs = vi.mocked(fs);
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('{broken');

    const res = await request(createApp('.lockwise')).get('/api/report');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/No report found/);
  });
});
