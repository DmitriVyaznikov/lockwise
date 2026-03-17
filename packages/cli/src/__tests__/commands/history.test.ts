import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import express from 'express';
import request from 'supertest';
import type { LockwiseReport } from '@lockwise/core';
import { createHistoryRouter, computeDiff } from '../../commands/history.js';

vi.mock('node:fs');

const makeReport = (overrides: Partial<LockwiseReport> = {}): LockwiseReport => ({
  meta: { lockfileType: 'npm', analyzedAt: '2026-03-17T10:00:00.000Z', totalPackages: 2 },
  packages: [
    {
      name: 'lodash',
      currentVersion: '4.17.21',
      recommendedVersion: '4.17.21',
      category: 'success',
      vulnerabilities: [],
      nexusAvailable: true,
      semverRange: '^4.17.0',
    },
    {
      name: 'express',
      currentVersion: '4.18.0',
      category: 'due1month',
      vulnerabilities: [],
      nexusAvailable: false,
      semverRange: '^4.18.0',
    },
  ],
  summary: { success: 1, due1month: 1, mixed: 0, maybeVulnerable: 0, unavailable: 0 },
  nexusUpload: [],
  ...overrides,
});

const reportOld = makeReport({
  meta: { lockfileType: 'npm', analyzedAt: '2026-03-15T10:00:00.000Z', totalPackages: 2 },
});

const reportNew = makeReport({
  meta: { lockfileType: 'npm', analyzedAt: '2026-03-17T10:00:00.000Z', totalPackages: 3 },
  packages: [
    {
      name: 'lodash',
      currentVersion: '4.17.21',
      recommendedVersion: '4.17.21',
      category: 'success',
      vulnerabilities: [],
      nexusAvailable: true,
      semverRange: '^4.17.0',
    },
    {
      name: 'express',
      currentVersion: '4.19.0',
      category: 'success',
      vulnerabilities: [],
      nexusAvailable: true,
      semverRange: '^4.18.0',
    },
    {
      name: 'axios',
      currentVersion: '1.7.0',
      category: 'success',
      vulnerabilities: [],
      nexusAvailable: true,
      semverRange: '^1.7.0',
    },
  ],
  summary: { success: 3, due1month: 0, mixed: 0, maybeVulnerable: 0, unavailable: 0 },
});

describe('computeDiff', () => {
  it('should detect added packages', () => {
    const diff = computeDiff(reportOld, reportNew);
    expect(diff.added).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'axios' }),
      ]),
    );
  });

  it('should detect removed packages', () => {
    const diff = computeDiff(reportNew, reportOld);
    expect(diff.removed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'axios' }),
      ]),
    );
  });

  it('should detect changed category', () => {
    const diff = computeDiff(reportOld, reportNew);
    expect(diff.changed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'express',
          wasCategory: 'due1month',
          nowCategory: 'success',
        }),
      ]),
    );
  });

  it('should not report unchanged packages', () => {
    const diff = computeDiff(reportOld, reportNew);
    const changedNames = diff.changed.map((c) => c.name);
    expect(changedNames).not.toContain('lodash');
  });

  it('should detect version-only changes without category change', () => {
    const from = makeReport({
      packages: [
        {
          name: 'lodash',
          currentVersion: '4.17.20',
          category: 'success',
          vulnerabilities: [],
          nexusAvailable: true,
        },
      ],
    });
    const to = makeReport({
      packages: [
        {
          name: 'lodash',
          currentVersion: '4.17.21',
          category: 'success',
          vulnerabilities: [],
          nexusAvailable: true,
        },
      ],
    });
    const diff = computeDiff(from, to);
    expect(diff.changed).toEqual([
      expect.objectContaining({
        name: 'lodash',
        wasCategory: 'success',
        nowCategory: 'success',
        wasVersion: '4.17.20',
        nowVersion: '4.17.21',
      }),
    ]);
  });
});

describe('GET /api/reports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createApp(outputDir: string) {
    const app = express();
    app.use(createHistoryRouter(outputDir));
    return app;
  }

  it('should return list of reports sorted by date desc', async () => {
    const mockedFs = vi.mocked(fs);
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readdirSync.mockReturnValue([
      '2026-03-15T10-00-00-000Z.json' as unknown as fs.Dirent,
      '2026-03-17T10-00-00-000Z.json' as unknown as fs.Dirent,
      'latest.json' as unknown as fs.Dirent,
    ]);
    mockedFs.readFileSync.mockImplementation((filePath) => {
      const p = String(filePath);
      if (p.includes('2026-03-15')) return JSON.stringify(reportOld);
      if (p.includes('2026-03-17')) return JSON.stringify(reportNew);
      return '';
    });

    const res = await request(createApp('.lockwise')).get('/api/reports');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].filename).toBe('2026-03-17T10-00-00-000Z.json');
    expect(res.body[1].filename).toBe('2026-03-15T10-00-00-000Z.json');
    expect(res.body[0].meta).toBeDefined();
    expect(res.body[0].summary).toBeDefined();
  });

  it('should exclude latest.json from list', async () => {
    const mockedFs = vi.mocked(fs);
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readdirSync.mockReturnValue([
      '2026-03-17T10-00-00-000Z.json' as unknown as fs.Dirent,
      'latest.json' as unknown as fs.Dirent,
    ]);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(reportNew));

    const res = await request(createApp('.lockwise')).get('/api/reports');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].filename).not.toBe('latest.json');
  });

  it('should return 404 when reports dir does not exist', async () => {
    const mockedFs = vi.mocked(fs);
    mockedFs.existsSync.mockReturnValue(false);

    const res = await request(createApp('.lockwise')).get('/api/reports');

    expect(res.status).toBe(404);
  });
});

describe('GET /api/reports/:filename', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createApp(outputDir: string) {
    const app = express();
    app.use(createHistoryRouter(outputDir));
    return app;
  }

  it('should return a specific report', async () => {
    const mockedFs = vi.mocked(fs);
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(reportNew));

    const res = await request(createApp('.lockwise'))
      .get('/api/reports/2026-03-17T10-00-00-000Z.json');

    expect(res.status).toBe(200);
    expect(res.body.meta.analyzedAt).toBe('2026-03-17T10:00:00.000Z');
  });

  it('should return 404 for non-existent report', async () => {
    const mockedFs = vi.mocked(fs);
    mockedFs.existsSync.mockReturnValue(false);

    const res = await request(createApp('.lockwise'))
      .get('/api/reports/does-not-exist.json');

    expect(res.status).toBe(404);
  });

  it('should reject path traversal attempts', async () => {
    const res = await request(express().use(createHistoryRouter('.lockwise')))
      .get('/api/reports/..%2F..%2Fetc%2Fpasswd.json');

    expect(res.status).toBe(400);
  });
});

describe('GET /api/reports/diff', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createApp(outputDir: string) {
    const app = express();
    app.use(createHistoryRouter(outputDir));
    return app;
  }

  it('should return diff between two reports', async () => {
    const mockedFs = vi.mocked(fs);
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockImplementation((filePath) => {
      const p = String(filePath);
      if (p.includes('old.json')) return JSON.stringify(reportOld);
      if (p.includes('new.json')) return JSON.stringify(reportNew);
      return '';
    });

    const res = await request(createApp('.lockwise'))
      .get('/api/reports/diff?from=old.json&to=new.json');

    expect(res.status).toBe(200);
    expect(res.body.added).toBeDefined();
    expect(res.body.removed).toBeDefined();
    expect(res.body.changed).toBeDefined();
  });

  it('should return 400 when from/to params are missing', async () => {
    const res = await request(createApp('.lockwise'))
      .get('/api/reports/diff');

    expect(res.status).toBe(400);
  });
});
