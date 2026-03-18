import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LockwiseReport } from '@lockwise/core';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import express from 'express';
import request from 'supertest';
import { createApiRouter, createSecureApp, loadLatestReport } from '../../commands/serve.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

const mockReport: LockwiseReport = {
  meta: { lockfileType: 'npm', analyzedAt: '2026-03-17T10:00:00.000Z', totalPackages: 5 },
  packages: [],
  summary: { success: 5, due1month: 0, mixed: 0, maybeVulnerable: 0, unavailable: 0 },
  nexusUpload: '',
};

describe('loadLatestReport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should load report from latest.json', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fsp.readFile).mockResolvedValue(JSON.stringify(mockReport));

    const report = await loadLatestReport('.lockwise');
    expect(report).toEqual(mockReport);
  });

  it('should return null when latest.json does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const report = await loadLatestReport('.lockwise');
    expect(report).toBeNull();
  });

  it('should return null on malformed JSON', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fsp.readFile).mockResolvedValue('not json');

    const report = await loadLatestReport('.lockwise');
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
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fsp.readFile).mockResolvedValue(JSON.stringify(mockReport));

    const res = await request(createApp('.lockwise')).get('/api/report');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockReport);
  });

  it('should return 404 when no report exists', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const res = await request(createApp('.lockwise')).get('/api/report');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/No report found/);
  });

  it('should return 404 when report is malformed', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fsp.readFile).mockResolvedValue('{broken');

    const res = await request(createApp('.lockwise')).get('/api/report');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/No report found/);
  });
});

describe('security headers', () => {
  function createSecuredApp() {
    const app = createSecureApp(3000);
    app.use(createApiRouter('.lockwise'));
    return app;
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  it('should include helmet security headers', async () => {
    const res = await request(createSecuredApp()).get('/api/report');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('should include CORS headers for localhost', async () => {
    const res = await request(createSecuredApp())
      .get('/api/report')
      .set('Origin', 'http://127.0.0.1:3000');

    expect(res.headers['access-control-allow-origin']).toBe('http://127.0.0.1:3000');
  });

  it('should return 204 for preflight OPTIONS request', async () => {
    const res = await request(createSecuredApp())
      .options('/api/report')
      .set('Origin', 'http://127.0.0.1:3000')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-methods']).toBe('GET, OPTIONS');
  });
});
