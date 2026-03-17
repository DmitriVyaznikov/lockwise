# Lockwise Plan 4: Package Detail + History

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Package Detail screen (versions timeline, vulnerabilities, consumers) and History screen (run list, report diff, trend chart) -- completing the second half of the UI.

**Architecture:** Enrich `PackageResult` in core with `availableVersions` and `consumers` fields. Add history API endpoints to Express server (list reports, load specific report, compute diff). Build two new Vue pages: `PackageDetailPage` (drill-down from dashboard table) and `HistoryPage` (run list, diff view, trend chart). Navigation added to App.vue header.

**Tech Stack:** Vue 3.4, vue-router, chart.js + vue-chartjs, Express, @lockwise/core, @tanstack/vue-table

**Scope:** Package Detail page, History page with diff and trend chart. Dashboard remains unchanged except PackageTable gets clickable names.

---

## Task 1: Extend Core Types + Analyzer

Enrich `PackageResult` with version timeline and consumer data so the detail page has everything it needs.

**Files:**
- Modify: `packages/core/src/types.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/src/analyzer/analyze.ts`
- Create: `packages/core/src/analyzer/analyze-enrichment.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/core/src/analyzer/analyze-enrichment.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ParsedLockfile, LockwiseConfig, PackageResult } from '../types.js';
import type { RegistryData } from '../checkers/registry-fetcher.js';

describe('enriched PackageResult fields', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should include availableVersions from registry data filtered by semver range', async () => {
    vi.mock('../checkers/nexus-checker.js', () => ({
      buildNexusTarballUrl: (name: string, version: string, url: string) =>
        `${url}/${name}/-/${name}-${version}.tgz`,
      checkNexusAvailability: vi.fn().mockResolvedValue(200),
    }));
    vi.mock('../checkers/osv-checker.js', () => ({
      checkVulnerabilities: vi.fn().mockResolvedValue(new Map()),
    }));
    vi.mock('../checkers/registry-fetcher.js', () => ({
      createRegistryFetcher: () => ({
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
        } satisfies RegistryData),
      }),
    }));

    const { analyze } = await import('./analyze.js');

    const lockfile: ParsedLockfile = {
      type: 'npm',
      packages: [{ name: 'lodash', version: '4.17.20' }],
      rawPackages: {
        '': { dependencies: { lodash: '^4.17.0' } },
      },
    };

    const config: LockwiseConfig = {
      nexusUrl: 'http://nexus.test/repository/npm',
      publicRegistry: 'https://registry.npmjs.org',
      minAgeDays: 30,
      outputDir: '.lockwise',
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
    vi.mock('../checkers/nexus-checker.js', () => ({
      buildNexusTarballUrl: (name: string, version: string, url: string) =>
        `${url}/${name}/-/${name}-${version}.tgz`,
      checkNexusAvailability: vi.fn().mockResolvedValue(200),
    }));
    vi.mock('../checkers/osv-checker.js', () => ({
      checkVulnerabilities: vi.fn().mockResolvedValue(new Map()),
    }));
    vi.mock('../checkers/registry-fetcher.js', () => ({
      createRegistryFetcher: () => ({
        fetch: vi.fn().mockResolvedValue({
          name: 'lodash',
          versions: { '4.17.21': {} },
          time: { '4.17.21': '2020-06-01T00:00:00.000Z' },
        } satisfies RegistryData),
      }),
    }));

    const { analyze } = await import('./analyze.js');

    const lockfile: ParsedLockfile = {
      type: 'npm',
      packages: [{ name: 'lodash', version: '4.17.21' }],
      rawPackages: {
        '': { dependencies: { lodash: '^4.17.0' } },
        'node_modules/my-lib': { dependencies: { lodash: '~4.17.20' } },
      },
    };

    const config: LockwiseConfig = {
      nexusUrl: 'http://nexus.test/repository/npm',
      publicRegistry: 'https://registry.npmjs.org',
      minAgeDays: 30,
      outputDir: '.lockwise',
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
    vi.mock('../checkers/nexus-checker.js', () => ({
      buildNexusTarballUrl: (name: string, version: string, url: string) =>
        `${url}/${name}/-/${name}-${version}.tgz`,
      checkNexusAvailability: vi.fn().mockResolvedValue(404),
    }));
    vi.mock('../checkers/osv-checker.js', () => ({
      checkVulnerabilities: vi.fn().mockResolvedValue(new Map()),
    }));
    vi.mock('../checkers/registry-fetcher.js', () => ({
      createRegistryFetcher: () => ({
        fetch: vi.fn().mockResolvedValue(null),
      }),
    }));

    const { analyze } = await import('./analyze.js');

    const lockfile: ParsedLockfile = {
      type: 'npm',
      packages: [{ name: '@internal/pkg', version: '1.0.0' }],
      rawPackages: {
        '': { dependencies: { '@internal/pkg': '^1.0.0' } },
      },
    };

    const config: LockwiseConfig = {
      nexusUrl: 'http://nexus.test/repository/npm',
      publicRegistry: 'https://registry.npmjs.org',
      minAgeDays: 30,
      outputDir: '.lockwise',
    };

    const report = await analyze(lockfile, config);
    const pkg = report.packages[0];

    expect(pkg.availableVersions).toEqual([]);
    expect(pkg.consumers).toBeDefined();
  });
});
```

**Step 2: Run tests -- expect FAIL**

```bash
npm run test:core -- --run analyze-enrichment
```

Expected: compilation error -- `availableVersions` and `consumers` do not exist on `PackageResult`.

**Step 3: Add new types to types.ts**

Add the following interfaces before `PackageResult` in `packages/core/src/types.ts`:

```typescript
/** Version info for package detail timeline */
export interface VersionInfo {
  readonly version: string;
  readonly publishedAt: string;
  readonly isInNexus: boolean;
}

/** Consumer info -- who depends on this package */
export interface ConsumerInfo {
  readonly name: string;
  readonly range: string;
}
```

Add two optional fields to `PackageResult`:

```typescript
export interface PackageResult {
  readonly name: string;
  readonly currentVersion: string;
  readonly recommendedVersion?: string;
  readonly category: PackageCategory | 'unavailable';
  readonly vulnerabilities: VulnInfo[];
  readonly nexusAvailable: boolean;
  readonly semverRange?: string;
  readonly availableVersions?: VersionInfo[];
  readonly consumers?: ConsumerInfo[];
}
```

**Step 4: Export new types from core index**

Update `packages/core/src/index.ts` to include `VersionInfo` and `ConsumerInfo`:

```typescript
export type {
  PackageCategory, VulnInfo, PackageEntry, ParsedLockfile, RawPackageData,
  RangeEntry, VersionSelection, PackageResult, LockwiseReport, LockwiseConfig,
  VersionInfo, ConsumerInfo,
} from './types.js';
```

**Step 5: Update analyze.ts to populate enriched fields**

In `packages/core/src/analyzer/analyze.ts`, update the `buildPackageResults` function signature and body.

Add a helper function:

```typescript
function buildAvailableVersions(
  packageName: string,
  range: string,
  registryData: RegistryData | null,
  nexusStatusMap: Map<string, NexusCheckResult>,
): VersionInfo[] {
  if (registryData === null) return [];

  return Object.keys(registryData.versions)
    .filter((v) => semver.satisfies(v, range))
    .sort((a, b) => semver.compare(a, b))
    .map((v) => ({
      version: v,
      publishedAt: registryData.time[v] ?? new Date().toISOString(),
      isInNexus: nexusStatusMap.get(`${packageName}@${v}`)?.status === 200,
    }));
}

function buildConsumers(
  packageName: string,
  rangeMap: Map<string, RangeEntry[]>,
): ConsumerInfo[] {
  const entries = rangeMap.get(packageName);
  if (!entries || entries.length === 0) return [];
  return entries.map((e) => ({ name: e.from, range: e.range }));
}
```

Add `import semver from 'semver';` at the top of analyze.ts (if not already present). Add imports for `VersionInfo`, `ConsumerInfo`, `RangeEntry`.

Update `buildPackageResults` to include these fields in both the `unavailable` branch and the normal branch:

```typescript
// In the unavailable branch:
return {
  name: pkg.name,
  currentVersion: pkg.version,
  category: 'unavailable' as const,
  vulnerabilities,
  nexusAvailable,
  semverRange: range,
  availableVersions: buildAvailableVersions(pkg.name, range, registryData, nexusStatusMap),
  consumers: buildConsumers(pkg.name, rangeMap),
};

// In the normal branch:
return {
  name: pkg.name,
  currentVersion: pkg.version,
  recommendedVersion: selection.version,
  category: selection.category,
  vulnerabilities,
  nexusAvailable,
  semverRange: range,
  availableVersions: buildAvailableVersions(pkg.name, range, registryData, nexusStatusMap),
  consumers: buildConsumers(pkg.name, rangeMap),
};
```

**Step 6: Run tests -- expect PASS**

```bash
npm run test:core
```

Expected: all tests pass including new enrichment tests.

**Step 7: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/index.ts packages/core/src/analyzer/analyze.ts packages/core/src/analyzer/analyze-enrichment.test.ts
git commit -m "feat(core): enrich PackageResult with availableVersions and consumers"
```

---

## Task 2: History API Endpoints

Add endpoints for listing historical reports, loading a specific report, and computing a diff between two reports.

**Files:**
- Create: `packages/cli/src/commands/history.ts`
- Create: `packages/cli/src/commands/history.test.ts`
- Modify: `packages/cli/src/commands/serve.ts`

**Step 1: Write the failing tests**

```typescript
// packages/cli/src/commands/history.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import express from 'express';
import request from 'supertest';
import type { LockwiseReport } from '@lockwise/core';
import { createHistoryRouter, computeDiff } from './history.js';

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
      .get('/api/reports/../../etc/passwd');

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
```

**Step 2: Run tests -- expect FAIL**

```bash
npm run test:cli -- --run history
```

Expected: cannot import `./history.js` -- module does not exist.

**Step 3: Implement history.ts**

```typescript
// packages/cli/src/commands/history.ts
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import type { LockwiseReport, PackageResult } from '@lockwise/core';

export interface ReportListItem {
  readonly filename: string;
  readonly meta: LockwiseReport['meta'];
  readonly summary: LockwiseReport['summary'];
}

export interface DiffResult {
  readonly added: PackageResult[];
  readonly removed: PackageResult[];
  readonly changed: {
    readonly name: string;
    readonly wasCategory: string;
    readonly nowCategory: string;
    readonly wasVersion: string;
    readonly nowVersion: string;
  }[];
}

export function computeDiff(from: LockwiseReport, to: LockwiseReport): DiffResult {
  const fromMap = new Map(from.packages.map((p) => [p.name, p]));
  const toMap = new Map(to.packages.map((p) => [p.name, p]));

  const added: PackageResult[] = [];
  const removed: PackageResult[] = [];
  const changed: DiffResult['changed'] = [];

  for (const [name, pkg] of toMap) {
    if (!fromMap.has(name)) {
      added.push(pkg);
    }
  }

  for (const [name, pkg] of fromMap) {
    if (!toMap.has(name)) {
      removed.push(pkg);
    }
  }

  for (const [name, fromPkg] of fromMap) {
    const toPkg = toMap.get(name);
    if (!toPkg) continue;
    if (fromPkg.category !== toPkg.category) {
      changed.push({
        name,
        wasCategory: fromPkg.category,
        nowCategory: toPkg.category,
        wasVersion: fromPkg.currentVersion,
        nowVersion: toPkg.currentVersion,
      });
    }
  }

  return { added, removed, changed };
}

function isValidFilename(filename: string): boolean {
  return /^[\w\-.]+\.json$/.test(filename) && !filename.includes('..');
}

function loadReport(reportsDir: string, filename: string): LockwiseReport | null {
  const filePath = path.join(reportsDir, filename);
  if (!fs.existsSync(filePath)) return null;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as LockwiseReport;
  } catch {
    return null;
  }
}

export function createHistoryRouter(outputDir: string): Router {
  const router = Router();
  const reportsDir = path.join(outputDir, 'reports');

  router.get('/api/reports/diff', (req, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    if (!from || !to) {
      res.status(400).json({ error: 'Both "from" and "to" query params are required.' });
      return;
    }

    if (!isValidFilename(from) || !isValidFilename(to)) {
      res.status(400).json({ error: 'Invalid filename.' });
      return;
    }

    const fromReport = loadReport(reportsDir, from);
    const toReport = loadReport(reportsDir, to);

    if (!fromReport || !toReport) {
      res.status(404).json({ error: 'One or both reports not found.' });
      return;
    }

    res.json(computeDiff(fromReport, toReport));
  });

  router.get('/api/reports/:filename', (req, res) => {
    const { filename } = req.params;

    if (!isValidFilename(filename)) {
      res.status(400).json({ error: 'Invalid filename.' });
      return;
    }

    const report = loadReport(reportsDir, filename);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }

    res.json(report);
  });

  router.get('/api/reports', (_req, res) => {
    if (!fs.existsSync(reportsDir)) {
      res.status(404).json({ error: 'No reports directory found.' });
      return;
    }

    const files = fs.readdirSync(reportsDir)
      .filter((f): f is string => typeof f === 'string')
      .filter((f) => f.endsWith('.json') && f !== 'latest.json')
      .sort()
      .reverse();

    const items: ReportListItem[] = [];

    for (const filename of files) {
      const report = loadReport(reportsDir, filename);
      if (!report) continue;
      items.push({
        filename,
        meta: report.meta,
        summary: report.summary,
      });
    }

    res.json(items);
  });

  return router;
}
```

**Step 4: Run tests -- expect PASS**

```bash
npm run test:cli -- --run history
```

**Step 5: Wire history router into serve.ts**

In `packages/cli/src/commands/serve.ts`, import and use the history router:

```typescript
// Add import at top:
import { createHistoryRouter } from './history.js';

// In startServer function, after createApiRouter:
app.use(createHistoryRouter(outputDir));
```

The full `startServer` function becomes:

```typescript
export function startServer(
  outputDir: string,
  port: number,
  uiDistPath?: string,
): { close: () => void } {
  const app = express();

  // API routers must be registered before the SPA catch-all
  app.use(createApiRouter(outputDir));
  app.use(createHistoryRouter(outputDir));

  if (uiDistPath && fs.existsSync(uiDistPath)) {
    app.use(express.static(uiDistPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(uiDistPath, 'index.html'));
    });
  }

  const server = app.listen(port, () => {
    console.log(`Lockwise server running at http://localhost:${port}`);
  });

  return { close: () => server.close() };
}
```

**Step 6: Run all CLI tests**

```bash
npm run test:cli
```

Expected: all tests pass.

**Step 7: Commit**

```bash
git add packages/cli/src/commands/history.ts packages/cli/src/commands/history.test.ts packages/cli/src/commands/serve.ts
git commit -m "feat(cli): add history API endpoints (list, detail, diff)"
```

---

## Task 3: Navigation + Router

Add header navigation with Dashboard and History links. Add routes for `/package/:name` and `/history`.

**Files:**
- Modify: `packages/ui/src/App.vue`
- Modify: `packages/ui/src/main.ts`

**Step 1: Update main.ts to add new routes**

```typescript
// packages/ui/src/main.ts
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import './assets/main.css';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('./pages/DashboardPage.vue'),
    },
    {
      path: '/package/:name(.*)',
      name: 'package-detail',
      component: () => import('./pages/PackageDetailPage.vue'),
      props: true,
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('./pages/HistoryPage.vue'),
    },
  ],
});

const app = createApp(App);
app.use(router);
app.mount('#app');
```

Note: The `:name(.*)` pattern is needed because scoped package names contain `/` (e.g., `@types/node`).

**Step 2: Update App.vue with navigation**

```vue
<!-- packages/ui/src/App.vue -->
<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router';
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-logo">Lockwise</h1>
      <nav class="app-nav">
        <RouterLink to="/" class="nav-link">Dashboard</RouterLink>
        <RouterLink to="/history" class="nav-link">History</RouterLink>
      </nav>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  display: flex;
  align-items: center;
  gap: 32px;
}

.app-logo {
  font-size: 1.25rem;
  font-weight: 600;
}

.app-nav {
  display: flex;
  gap: 16px;
}

.nav-link {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.15s ease, background 0.15s ease;
}

.nav-link:hover {
  color: var(--color-text);
}

.nav-link.router-link-active,
.nav-link.router-link-exact-active {
  color: var(--color-info);
  background: color-mix(in srgb, var(--color-info) 10%, transparent);
  font-weight: 500;
}

.app-main {
  flex: 1;
  padding: 24px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}
</style>
```

**Step 3: Create placeholder pages so router compiles**

```vue
<!-- packages/ui/src/pages/PackageDetailPage.vue -->
<template>
  <div>
    <h2>Package Detail</h2>
    <p>Loading...</p>
  </div>
</template>
```

```vue
<!-- packages/ui/src/pages/HistoryPage.vue -->
<template>
  <div>
    <h2>History</h2>
    <p>Loading...</p>
  </div>
</template>
```

**Step 4: Verify build**

```bash
cd packages/ui && npx vite build 2>&1 | tail -10
```

Expected: build succeeds.

**Step 5: Commit**

```bash
git add packages/ui/src/App.vue packages/ui/src/main.ts packages/ui/src/pages/PackageDetailPage.vue packages/ui/src/pages/HistoryPage.vue
git commit -m "feat(ui): add navigation header and routes for detail/history pages"
```

---

## Task 4: Package Detail Page

Full detail page showing header, versions timeline, vulnerabilities, and consumers sections.

**Files:**
- Create: `packages/ui/src/pages/PackageDetailPage.vue` (replace placeholder)
- Modify: `packages/ui/src/components/PackageTable.vue`

**Step 1: Implement PackageDetailPage**

```vue
<!-- packages/ui/src/pages/PackageDetailPage.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useReport } from '../composables/useReport';
import type { PackageResult } from '@lockwise/core';

const route = useRoute();
const router = useRouter();
const { report, isLoading, error } = useReport();

const packageName = computed(() => route.params.name as string);

const pkg = computed<PackageResult | null>(() => {
  if (!report.value) return null;
  return report.value.packages.find((p) => p.name === packageName.value) ?? null;
});

const maxCvss = computed(() => {
  if (!pkg.value || pkg.value.vulnerabilities.length === 0) return null;
  return Math.max(...pkg.value.vulnerabilities.map((v) => v.cvssScore));
});

function cvssColor(score: number): string {
  if (score >= 9) return 'var(--color-error)';
  if (score >= 7) return 'var(--color-error)';
  if (score >= 4) return 'var(--color-warning)';
  return 'var(--color-success)';
}

function goBack() {
  router.push('/');
}
</script>

<template>
  <div class="detail-page">
    <div v-if="isLoading" class="state-message">Loading report...</div>
    <div v-else-if="error" class="state-message error">Error: {{ error }}</div>
    <div v-else-if="!pkg" class="state-message">
      Package "{{ packageName }}" not found in report.
      <button class="back-btn" @click="goBack">Back to Dashboard</button>
    </div>
    <template v-else>
      <!-- Header Section -->
      <section class="detail-header">
        <button class="back-btn" @click="goBack">Back</button>
        <div class="header-info">
          <h2 class="pkg-name">{{ pkg.name }}</h2>
          <div class="header-meta">
            <span class="meta-item">
              <span class="meta-label">Current:</span>
              <code>{{ pkg.currentVersion }}</code>
            </span>
            <span v-if="pkg.recommendedVersion" class="meta-item">
              <span class="meta-label">Recommended:</span>
              <code>{{ pkg.recommendedVersion }}</code>
            </span>
            <span v-if="pkg.semverRange" class="meta-item">
              <span class="meta-label">Range:</span>
              <code>{{ pkg.semverRange }}</code>
            </span>
            <span
              class="category-badge"
              :data-category="pkg.category"
            >
              {{ pkg.category }}
            </span>
            <span :class="pkg.nexusAvailable ? 'nexus-yes' : 'nexus-no'">
              Nexus: {{ pkg.nexusAvailable ? 'Available' : 'Unavailable' }}
            </span>
          </div>
        </div>
      </section>

      <!-- Versions Timeline -->
      <section class="detail-section">
        <h3>Available Versions</h3>
        <div v-if="!pkg.availableVersions || pkg.availableVersions.length === 0" class="empty-state">
          No version data available from public registry.
        </div>
        <div v-else class="table-wrapper">
          <table class="detail-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Published</th>
                <th>In Nexus</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="v in [...pkg.availableVersions].reverse()"
                :key="v.version"
                :class="{
                  'row-current': v.version === pkg.currentVersion,
                  'row-recommended': v.version === pkg.recommendedVersion,
                }"
              >
                <td>
                  <code>{{ v.version }}</code>
                  <span v-if="v.version === pkg.currentVersion" class="version-tag current-tag">current</span>
                  <span v-if="v.version === pkg.recommendedVersion" class="version-tag recommended-tag">recommended</span>
                </td>
                <td>{{ new Date(v.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }}</td>
                <td>
                  <span :class="v.isInNexus ? 'nexus-yes' : 'nexus-no'">
                    {{ v.isInNexus ? 'Yes' : 'No' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Vulnerabilities -->
      <section class="detail-section">
        <h3>Vulnerabilities</h3>
        <div v-if="pkg.vulnerabilities.length === 0" class="empty-state">
          No known vulnerabilities.
        </div>
        <div v-else class="table-wrapper">
          <table class="detail-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Summary</th>
                <th>CVSS</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="vuln in pkg.vulnerabilities" :key="vuln.id">
                <td>
                  <a
                    :href="`https://osv.dev/vulnerability/${vuln.id}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="vuln-link"
                  >
                    {{ vuln.id }}
                  </a>
                </td>
                <td>{{ vuln.summary }}</td>
                <td>
                  <span
                    class="cvss-score"
                    :style="{ color: cvssColor(vuln.cvssScore) }"
                  >
                    {{ vuln.cvssScore.toFixed(1) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Consumers -->
      <section class="detail-section">
        <h3>Consumers</h3>
        <div v-if="!pkg.consumers || pkg.consumers.length === 0" class="empty-state">
          Direct dependency only.
        </div>
        <div v-else class="table-wrapper">
          <table class="detail-table">
            <thead>
              <tr>
                <th>Dependent</th>
                <th>Range</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="consumer in pkg.consumers" :key="consumer.name + consumer.range">
                <td>
                  <code>{{ consumer.name || '(root project)' }}</code>
                </td>
                <td>
                  <code>{{ consumer.range }}</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.detail-page {
  max-width: 1000px;
}

.state-message {
  text-align: center;
  padding: 80px 20px;
  color: var(--color-text-secondary);
  font-size: 1.1rem;
}

.state-message.error {
  color: var(--color-error);
}

.back-btn {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  transition: all 0.15s ease;
}

.back-btn:hover {
  border-color: var(--color-info);
  color: var(--color-info);
}

.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
}

.header-info {
  flex: 1;
}

.pkg-name {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: var(--font-mono);
  margin-bottom: 8px;
}

.header-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.meta-item {
  font-size: 0.9rem;
}

.meta-label {
  color: var(--color-text-secondary);
  margin-right: 4px;
}

.meta-item code {
  font-family: var(--font-mono);
  background: var(--color-surface);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85rem;
}

.detail-section {
  margin-bottom: 32px;
}

.detail-section h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--color-text);
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
}

.table-wrapper {
  overflow-x: auto;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.detail-table th,
.detail-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.detail-table thead th {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-table tbody tr:hover {
  background: var(--color-surface-hover);
}

.detail-table code {
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.row-current {
  background: color-mix(in srgb, var(--color-info) 8%, transparent);
}

.row-recommended {
  background: color-mix(in srgb, var(--color-success) 8%, transparent);
}

.version-tag {
  display: inline-block;
  font-size: 0.7rem;
  padding: 1px 6px;
  border-radius: 3px;
  margin-left: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.current-tag {
  background: color-mix(in srgb, var(--color-info) 20%, transparent);
  color: var(--color-info);
}

.recommended-tag {
  background: color-mix(in srgb, var(--color-success) 20%, transparent);
  color: var(--color-success);
}

.category-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.category-badge[data-category='success'] {
  background: color-mix(in srgb, var(--color-success) 20%, transparent);
  color: var(--color-success);
}
.category-badge[data-category='due1month'] {
  background: color-mix(in srgb, var(--color-warning) 20%, transparent);
  color: var(--color-warning);
}
.category-badge[data-category='mixed'] {
  background: color-mix(in srgb, var(--color-mixed) 20%, transparent);
  color: var(--color-mixed);
}
.category-badge[data-category='maybeVulnerable'] {
  background: color-mix(in srgb, var(--color-error) 20%, transparent);
  color: var(--color-error);
}
.category-badge[data-category='unavailable'] {
  background: color-mix(in srgb, var(--color-text-secondary) 20%, transparent);
  color: var(--color-text-secondary);
}

.nexus-yes { color: var(--color-success); }
.nexus-no { color: var(--color-error); }

.vuln-link {
  color: var(--color-info);
  text-decoration: none;
}

.vuln-link:hover {
  text-decoration: underline;
}

.cvss-score {
  font-weight: 700;
  font-family: var(--font-mono);
}
</style>
```

**Step 2: Make package names clickable in PackageTable.vue**

In `packages/ui/src/components/PackageTable.vue`, add `RouterLink` import and modify the Name column to link to the detail page.

Add import at the top of `<script setup>`:

```typescript
import { RouterLink } from 'vue-router';
```

Replace the template section for the name column. In the `<tbody>` `<td>` rendering, add a check for the name column:

```vue
<td v-for="cell in row.getVisibleCells()" :key="cell.id">
  <RouterLink
    v-if="cell.column.id === 'name'"
    :to="`/package/${cell.getValue()}`"
    class="pkg-link"
  >
    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
  </RouterLink>
  <span
    v-else-if="cell.column.id === 'category'"
    class="category-badge"
    :data-category="cell.getValue()"
  >
    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
  </span>
  <!-- ... rest of cells unchanged ... -->
</td>
```

Add the link style:

```css
.pkg-link {
  color: var(--color-info);
  text-decoration: none;
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.pkg-link:hover {
  text-decoration: underline;
}
```

**Step 3: Verify build**

```bash
cd packages/ui && npx vite build 2>&1 | tail -10
```

Expected: build succeeds.

**Step 4: Commit**

```bash
git add packages/ui/src/pages/PackageDetailPage.vue packages/ui/src/components/PackageTable.vue
git commit -m "feat(ui): add package detail page with versions, vulns, consumers"
```

---

## Task 5: History Page -- Run List + Diff View

Build the history composable and page with report list table and diff comparison.

**Files:**
- Create: `packages/ui/src/composables/useHistory.ts`
- Create: `packages/ui/src/components/DiffView.vue`
- Modify: `packages/ui/src/pages/HistoryPage.vue` (replace placeholder)

**Step 1: Create useHistory composable**

```typescript
// packages/ui/src/composables/useHistory.ts
import { ref, computed } from 'vue';

export interface ReportListItem {
  readonly filename: string;
  readonly meta: {
    readonly lockfileType: string;
    readonly analyzedAt: string;
    readonly totalPackages: number;
  };
  readonly summary: {
    readonly success: number;
    readonly due1month: number;
    readonly mixed: number;
    readonly maybeVulnerable: number;
    readonly unavailable: number;
  };
}

export interface DiffChangedItem {
  readonly name: string;
  readonly wasCategory: string;
  readonly nowCategory: string;
  readonly wasVersion: string;
  readonly nowVersion: string;
}

export interface DiffResult {
  readonly added: { readonly name: string; readonly currentVersion: string; readonly category: string }[];
  readonly removed: { readonly name: string; readonly currentVersion: string; readonly category: string }[];
  readonly changed: DiffChangedItem[];
}

type HistoryState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; reports: ReportListItem[] }
  | { status: 'error'; message: string };

type DiffState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; diff: DiffResult }
  | { status: 'error'; message: string };

export function useHistory() {
  const state = ref<HistoryState>({ status: 'idle' });
  const diffState = ref<DiffState>({ status: 'idle' });

  async function fetchReports() {
    state.value = { status: 'loading' };
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const reports: ReportListItem[] = await response.json();
      state.value = { status: 'loaded', reports };
    } catch (error) {
      state.value = {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async function fetchDiff(from: string, to: string) {
    diffState.value = { status: 'loading' };
    try {
      const response = await fetch(`/api/reports/diff?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const diff: DiffResult = await response.json();
      diffState.value = { status: 'loaded', diff };
    } catch (error) {
      diffState.value = {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const reports = computed(() =>
    state.value.status === 'loaded' ? state.value.reports : [],
  );

  const isLoading = computed(() => state.value.status === 'loading');

  const error = computed(() =>
    state.value.status === 'error' ? state.value.message : null,
  );

  const diff = computed(() =>
    diffState.value.status === 'loaded' ? diffState.value.diff : null,
  );

  const isDiffLoading = computed(() => diffState.value.status === 'loading');

  const diffError = computed(() =>
    diffState.value.status === 'error' ? diffState.value.message : null,
  );

  return {
    reports,
    isLoading,
    error,
    fetchReports,
    diff,
    isDiffLoading,
    diffError,
    fetchDiff,
  };
}
```

**Step 2: Create DiffView component**

```vue
<!-- packages/ui/src/components/DiffView.vue -->
<script setup lang="ts">
import type { DiffResult } from '../composables/useHistory';

defineProps<{
  diff: DiffResult;
}>();
</script>

<template>
  <div class="diff-view">
    <!-- Added Packages -->
    <section v-if="diff.added.length > 0" class="diff-section">
      <h4 class="diff-heading added-heading">
        Added ({{ diff.added.length }})
      </h4>
      <div class="table-wrapper">
        <table class="diff-table">
          <thead>
            <tr>
              <th>Package</th>
              <th>Version</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pkg in diff.added" :key="pkg.name" class="row-added">
              <td><code>{{ pkg.name }}</code></td>
              <td><code>{{ pkg.currentVersion }}</code></td>
              <td>
                <span class="category-badge" :data-category="pkg.category">
                  {{ pkg.category }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Removed Packages -->
    <section v-if="diff.removed.length > 0" class="diff-section">
      <h4 class="diff-heading removed-heading">
        Removed ({{ diff.removed.length }})
      </h4>
      <div class="table-wrapper">
        <table class="diff-table">
          <thead>
            <tr>
              <th>Package</th>
              <th>Version</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pkg in diff.removed" :key="pkg.name" class="row-removed">
              <td><code>{{ pkg.name }}</code></td>
              <td><code>{{ pkg.currentVersion }}</code></td>
              <td>
                <span class="category-badge" :data-category="pkg.category">
                  {{ pkg.category }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Changed Category -->
    <section v-if="diff.changed.length > 0" class="diff-section">
      <h4 class="diff-heading changed-heading">
        Changed Category ({{ diff.changed.length }})
      </h4>
      <div class="table-wrapper">
        <table class="diff-table">
          <thead>
            <tr>
              <th>Package</th>
              <th>Was</th>
              <th>Now</th>
              <th>Version Change</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in diff.changed" :key="item.name" class="row-changed">
              <td><code>{{ item.name }}</code></td>
              <td>
                <span class="category-badge" :data-category="item.wasCategory">
                  {{ item.wasCategory }}
                </span>
              </td>
              <td>
                <span class="category-badge" :data-category="item.nowCategory">
                  {{ item.nowCategory }}
                </span>
              </td>
              <td>
                <code v-if="item.wasVersion !== item.nowVersion">
                  {{ item.wasVersion }} -> {{ item.nowVersion }}
                </code>
                <span v-else class="no-change">same version</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- No Changes -->
    <div
      v-if="diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0"
      class="empty-state"
    >
      No differences between these two reports.
    </div>
  </div>
</template>

<style scoped>
.diff-view {
  margin-top: 24px;
}

.diff-section {
  margin-bottom: 24px;
}

.diff-heading {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 8px;
  padding: 6px 12px;
  border-radius: var(--radius);
}

.added-heading {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
}

.removed-heading {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.changed-heading {
  color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 10%, transparent);
}

.table-wrapper {
  overflow-x: auto;
}

.diff-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.diff-table th,
.diff-table td {
  padding: 8px 14px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.diff-table thead th {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.diff-table code {
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.row-added {
  background: color-mix(in srgb, var(--color-success) 5%, transparent);
}

.row-removed {
  background: color-mix(in srgb, var(--color-error) 5%, transparent);
}

.row-changed {
  background: color-mix(in srgb, var(--color-warning) 5%, transparent);
}

.category-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.category-badge[data-category='success'] {
  background: color-mix(in srgb, var(--color-success) 20%, transparent);
  color: var(--color-success);
}
.category-badge[data-category='due1month'] {
  background: color-mix(in srgb, var(--color-warning) 20%, transparent);
  color: var(--color-warning);
}
.category-badge[data-category='mixed'] {
  background: color-mix(in srgb, var(--color-mixed) 20%, transparent);
  color: var(--color-mixed);
}
.category-badge[data-category='maybeVulnerable'] {
  background: color-mix(in srgb, var(--color-error) 20%, transparent);
  color: var(--color-error);
}
.category-badge[data-category='unavailable'] {
  background: color-mix(in srgb, var(--color-text-secondary) 20%, transparent);
  color: var(--color-text-secondary);
}

.no-change {
  color: var(--color-text-secondary);
  font-style: italic;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
}
</style>
```

**Step 3: Implement HistoryPage**

```vue
<!-- packages/ui/src/pages/HistoryPage.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useHistory } from '../composables/useHistory';
import DiffView from '../components/DiffView.vue';

const {
  reports,
  isLoading,
  error,
  fetchReports,
  diff,
  isDiffLoading,
  diffError,
  fetchDiff,
} = useHistory();

const selectedFrom = ref<string | null>(null);
const selectedTo = ref<string | null>(null);

const canCompare = computed(() => {
  return selectedFrom.value !== null
    && selectedTo.value !== null
    && selectedFrom.value !== selectedTo.value;
});

function toggleSelection(filename: string) {
  if (selectedFrom.value === filename) {
    selectedFrom.value = null;
    return;
  }
  if (selectedTo.value === filename) {
    selectedTo.value = null;
    return;
  }
  if (selectedFrom.value === null) {
    selectedFrom.value = filename;
  } else if (selectedTo.value === null) {
    selectedTo.value = filename;
  } else {
    // Replace the "from" with the new selection
    selectedFrom.value = selectedTo.value;
    selectedTo.value = filename;
  }
}

function isSelected(filename: string): boolean {
  return selectedFrom.value === filename || selectedTo.value === filename;
}

function selectionLabel(filename: string): string | null {
  if (selectedFrom.value === filename) return 'FROM';
  if (selectedTo.value === filename) return 'TO';
  return null;
}

async function compare() {
  if (!canCompare.value) return;
  await fetchDiff(selectedFrom.value!, selectedTo.value!);
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

onMounted(fetchReports);
</script>

<template>
  <div class="history-page">
    <h2>Analysis History</h2>

    <div v-if="isLoading" class="state-message">Loading reports...</div>
    <div v-else-if="error" class="state-message error">Error: {{ error }}</div>
    <template v-else>
      <!-- Run List Table -->
      <section class="history-section">
        <div class="table-header">
          <h3>Reports</h3>
          <button
            class="compare-btn"
            :disabled="!canCompare"
            @click="compare"
          >
            Compare Selected
          </button>
        </div>
        <div v-if="reports.length === 0" class="empty-state">
          No reports found. Run "lockwise analyze" to generate reports.
        </div>
        <div v-else class="table-wrapper">
          <table class="history-table">
            <thead>
              <tr>
                <th class="col-select">Select</th>
                <th>Date</th>
                <th>Lockfile</th>
                <th>Total</th>
                <th>Success</th>
                <th>Due</th>
                <th>Mixed</th>
                <th>Vulnerable</th>
                <th>Unavailable</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in reports"
                :key="item.filename"
                :class="{ 'row-selected': isSelected(item.filename) }"
                @click="toggleSelection(item.filename)"
              >
                <td class="col-select">
                  <span v-if="selectionLabel(item.filename)" class="selection-badge">
                    {{ selectionLabel(item.filename) }}
                  </span>
                  <span v-else class="selection-circle" />
                </td>
                <td>{{ formatDate(item.meta.analyzedAt) }}</td>
                <td>{{ item.meta.lockfileType }}</td>
                <td>{{ item.meta.totalPackages }}</td>
                <td class="count-success">{{ item.summary.success }}</td>
                <td class="count-due">{{ item.summary.due1month }}</td>
                <td class="count-mixed">{{ item.summary.mixed }}</td>
                <td class="count-vuln">{{ item.summary.maybeVulnerable }}</td>
                <td class="count-unavailable">{{ item.summary.unavailable }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Diff View -->
      <section v-if="isDiffLoading" class="history-section">
        <div class="state-message">Computing diff...</div>
      </section>
      <section v-else-if="diffError" class="history-section">
        <div class="state-message error">Diff error: {{ diffError }}</div>
      </section>
      <section v-else-if="diff" class="history-section">
        <h3>Comparison Result</h3>
        <DiffView :diff="diff" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.history-page h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 24px;
}

.state-message {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-secondary);
  font-size: 1rem;
}

.state-message.error {
  color: var(--color-error);
}

.history-section {
  margin-bottom: 32px;
}

.history-section h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.compare-btn {
  padding: 8px 20px;
  border: 1px solid var(--color-info);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--color-info) 15%, transparent);
  color: var(--color-info);
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.15s ease;
}

.compare-btn:hover:not(:disabled) {
  background: var(--color-info);
  color: var(--color-bg);
}

.compare-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
}

.table-wrapper {
  overflow-x: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.history-table th,
.history-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.history-table thead th {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.history-table tbody tr {
  cursor: pointer;
  transition: background 0.1s ease;
}

.history-table tbody tr:hover {
  background: var(--color-surface-hover);
}

.row-selected {
  background: color-mix(in srgb, var(--color-info) 10%, transparent) !important;
}

.col-select {
  width: 60px;
  text-align: center;
}

.selection-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  background: var(--color-info);
  color: var(--color-bg);
  letter-spacing: 0.05em;
}

.selection-circle {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
}

.count-success { color: var(--color-success); }
.count-due { color: var(--color-warning); }
.count-mixed { color: var(--color-mixed); }
.count-vuln { color: var(--color-error); }
.count-unavailable { color: var(--color-text-secondary); }
</style>
```

**Step 4: Verify build**

```bash
cd packages/ui && npx vite build 2>&1 | tail -10
```

Expected: build succeeds.

**Step 5: Commit**

```bash
git add packages/ui/src/composables/useHistory.ts packages/ui/src/components/DiffView.vue packages/ui/src/pages/HistoryPage.vue
git commit -m "feat(ui): add history page with run list and diff comparison"
```

---

## Task 6: Trend Chart

Stacked area chart showing category distribution over time using chart.js and vue-chartjs.

**Files:**
- Create: `packages/ui/src/components/TrendChart.vue`
- Modify: `packages/ui/src/pages/HistoryPage.vue`
- Modify: `packages/ui/package.json`

**Step 1: Install chart.js dependencies**

```bash
cd /Users/dmitriy/Documents/JOB/lockwise
npm install chart.js vue-chartjs -w packages/ui
```

**Step 2: Create TrendChart component**

```vue
<!-- packages/ui/src/components/TrendChart.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ReportListItem } from '../composables/useHistory';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

const props = defineProps<{
  reports: ReportListItem[];
}>();

const chartData = computed(() => {
  // Reports come sorted desc, reverse for chronological order
  const sorted = [...props.reports].reverse();

  const labels = sorted.map((r) =>
    new Date(r.meta.analyzedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  );

  return {
    labels,
    datasets: [
      {
        label: 'Success',
        data: sorted.map((r) => r.summary.success),
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: '#22c55e',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'Due (<30d)',
        data: sorted.map((r) => r.summary.due1month),
        backgroundColor: 'rgba(234, 179, 8, 0.2)',
        borderColor: '#eab308',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'Mixed',
        data: sorted.map((r) => r.summary.mixed),
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        borderColor: '#a855f7',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'Vulnerable',
        data: sorted.map((r) => r.summary.maybeVulnerable),
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: '#ef4444',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#94a3b8',
        usePointStyle: true,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#f1f5f9',
      bodyColor: '#f1f5f9',
      borderColor: '#334155',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(51, 65, 85, 0.5)',
      },
      ticks: {
        color: '#94a3b8',
      },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      grid: {
        color: 'rgba(51, 65, 85, 0.5)',
      },
      ticks: {
        color: '#94a3b8',
        stepSize: 1,
      },
    },
  },
};
</script>

<template>
  <div class="trend-chart">
    <div v-if="reports.length < 2" class="empty-state">
      Need at least 2 reports to show a trend chart.
    </div>
    <div v-else class="chart-container">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<style scoped>
.trend-chart {
  margin-bottom: 32px;
}

.chart-container {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 20px;
  height: 300px;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
}
</style>
```

**Step 3: Add TrendChart to HistoryPage**

In `packages/ui/src/pages/HistoryPage.vue`, import and use the TrendChart.

Add import:

```typescript
import TrendChart from '../components/TrendChart.vue';
```

Add the chart above the run list table section (inside the `<template v-else>` block, before the `<!-- Run List Table -->` comment):

```vue
<!-- Trend Chart -->
<section class="history-section">
  <h3>Category Trend</h3>
  <TrendChart :reports="reports" />
</section>
```

**Step 4: Verify build**

```bash
cd /Users/dmitriy/Documents/JOB/lockwise
npm install
cd packages/ui && npx vite build 2>&1 | tail -10
```

Expected: build succeeds with chart.js included.

**Step 5: Commit**

```bash
git add packages/ui/src/components/TrendChart.vue packages/ui/src/pages/HistoryPage.vue packages/ui/package.json package-lock.json
git commit -m "feat(ui): add trend chart with stacked area visualization"
```

---

## Task 7: Build + Final Verification

Ensure everything builds, passes lint, and type-checks.

**Step 1: Build UI**

```bash
cd packages/ui && npx vite build
```

Expected: dist/ folder with index.html and assets.

**Step 2: Run final check**

```bash
cd /Users/dmitriy/Documents/JOB/lockwise
npm run final
```

Expected: all tests pass, no type errors, no lint errors.

**Step 3: Fix any issues found**

If type-check or lint errors are found, fix them before proceeding. Common issues:
- Missing type imports in `.vue` files
- Unused imports flagged by ESLint
- Strict type mismatches in chart.js options

**Step 4: Commit and push**

```bash
git add -A
git commit -m "chore(ui): build integration and final verification for phase 4"
git push
```
