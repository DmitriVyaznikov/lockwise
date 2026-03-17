import fs from 'node:fs';
import path from 'node:path';
import express, { Router } from 'express';
import type { LockwiseReport } from '@lockwise/core';

export function loadLatestReport(outputDir: string): LockwiseReport | null {
  const latestPath = path.join(outputDir, 'reports', 'latest.json');
  if (!fs.existsSync(latestPath)) return null;

  const content = fs.readFileSync(latestPath, 'utf-8');
  return JSON.parse(content) as LockwiseReport;
}

export function createApiRouter(outputDir: string): Router {
  const router = Router();

  router.get('/api/report', (_req, res) => {
    const report = loadLatestReport(outputDir);
    if (!report) {
      res.status(404).json({ error: 'No report found. Run "lockwise analyze" first.' });
      return;
    }
    res.json(report);
  });

  return router;
}

export function startServer(
  outputDir: string,
  port: number,
  uiDistPath?: string,
): { close: () => void } {
  const app = express();

  app.use(createApiRouter(outputDir));

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
