import fs from 'node:fs';
import path from 'node:path';
import express, { Router } from 'express';
import helmet from 'helmet';
import type { LockwiseReport } from '@lockwise/core';
import { createHistoryRouter } from './history.js';

export function loadLatestReport(outputDir: string): LockwiseReport | null {
  const latestPath = path.join(outputDir, 'reports', 'latest.json');
  if (!fs.existsSync(latestPath)) return null;

  try {
    const content = fs.readFileSync(latestPath, 'utf-8');
    return JSON.parse(content) as LockwiseReport;
  } catch (error) {
    console.error('[serve] Failed to load report:', error);
    return null;
  }
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

export function createSecureApp(port: number): express.Express {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }));

  const allowedOrigin = `http://127.0.0.1:${port}`;
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  return app;
}

export function startServer(
  outputDir: string,
  port: number,
  uiDistPath?: string,
  host = '127.0.0.1',
): { close: () => void } {
  const app = createSecureApp(port);

  // API routers must be registered before the SPA catch-all
  app.use(createApiRouter(outputDir));
  app.use(createHistoryRouter(outputDir));

  if (uiDistPath && fs.existsSync(uiDistPath)) {
    app.use(express.static(uiDistPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(uiDistPath, 'index.html'));
    });
  }

  const server = app.listen(port, host, () => {
    console.log(`Lockwise server running at http://${host}:${port}`);
  });

  return { close: () => server.close() };
}
