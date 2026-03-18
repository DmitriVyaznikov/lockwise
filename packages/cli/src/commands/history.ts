import fsp from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import type { LockwiseReport, PackageResult, DiffResult, ReportListItem } from '@lockwise/core';

const MAX_PAGE_LIMIT = 500;
const DEFAULT_PAGE_LIMIT = 100;

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
    if (fromPkg.category !== toPkg.category || fromPkg.currentVersion !== toPkg.currentVersion) {
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

async function loadReport(reportsDir: string, filename: string): Promise<LockwiseReport | null> {
  try {
    const content = await fsp.readFile(path.join(reportsDir, filename), 'utf-8');
    return JSON.parse(content) as LockwiseReport;
  } catch {
    return null;
  }
}

export function createHistoryRouter(outputDir: string): Router {
  const router = Router();
  const reportsDir = path.join(outputDir, 'reports');

  // IMPORTANT: /diff must be before /:filename to avoid matching 'diff' as a filename
  router.get('/api/reports/diff', async (req, res) => {
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

    const fromReport = await loadReport(reportsDir, from);
    const toReport = await loadReport(reportsDir, to);

    if (!fromReport || !toReport) {
      res.status(404).json({ error: 'One or both reports not found.' });
      return;
    }

    res.json(computeDiff(fromReport, toReport));
  });

  router.get('/api/reports/:filename', async (req, res) => {
    const { filename } = req.params;

    if (!isValidFilename(filename)) {
      res.status(400).json({ error: 'Invalid filename.' });
      return;
    }

    const report = await loadReport(reportsDir, filename);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }

    res.json(report);
  });

  router.get('/api/reports', async (req, res) => {
    let files: string[];
    try {
      const entries = await fsp.readdir(reportsDir);
      files = entries
        .filter((f): f is string => typeof f === 'string')
        .filter((f) => f.endsWith('.json') && f !== 'latest.json')
        .sort()
        .reverse();
    } catch {
      res.status(404).json({ error: 'No reports directory found.' });
      return;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Number(req.query.limit) || DEFAULT_PAGE_LIMIT));
    const start = (page - 1) * limit;
    const pageFiles = files.slice(start, start + limit);

    const items: ReportListItem[] = [];

    for (const filename of pageFiles) {
      const report = await loadReport(reportsDir, filename);
      if (!report) continue;
      items.push({
        filename,
        meta: report.meta,
        summary: report.summary,
      });
    }

    res.json({ items, total: files.length, page, limit });
  });

  return router;
}
