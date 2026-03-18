import { existsSync } from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import express, { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import type { LockwiseReport } from '@lockwise/core';
import { createHistoryRouter } from './history.js';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;

export function createRateLimiter(max = RATE_LIMIT_MAX) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? '127.0.0.1';
    const now = Date.now();
    const entry = hits.get(ip);

    if (!entry || now > entry.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      next();
      return;
    }

    entry.count++;
    if (entry.count > max) {
      res.status(429).json({ error: 'Too many requests. Try again later.' });
      return;
    }
    next();
  };
}

export async function loadLatestReport(outputDir: string): Promise<LockwiseReport | null> {
  const latestPath = path.join(outputDir, 'reports', 'latest.json');
  if (!existsSync(latestPath)) return null;

  try {
    const content = await fsp.readFile(latestPath, 'utf-8');
    return JSON.parse(content) as LockwiseReport;
  } catch (error) {
    console.error('[serve] Failed to load report:', error);
    return null;
  }
}

export function createApiRouter(outputDir: string): Router {
  const router = Router();

  router.get('/api/report', async (_req, res) => {
    const report = await loadLatestReport(outputDir);
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
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
  }));

  app.use(createRateLimiter());

  const allowedOrigins = new Set([
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
  ]);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    }
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

  if (uiDistPath && existsSync(uiDistPath)) {
    app.use(express.static(uiDistPath, { dotfiles: 'ignore' }));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(uiDistPath, 'index.html'));
    });
  }

  const server = app.listen(port, host, () => {
    console.log(`Lockwise server running at http://${host}:${port}`);
  });

  return { close: () => server.close() };
}
