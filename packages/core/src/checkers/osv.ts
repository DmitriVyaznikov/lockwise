import axios from 'axios';
import pLimit from 'p-limit';
import type { Result } from '../fp/result.js';
import { ok, err, isOk } from '../fp/result.js';
import { all as resultAll } from '../fp/result.js';
import type { VulnInfo } from '../domain/report.js';
import { osvError } from '../domain/errors.js';
import type { LockwiseError } from '../domain/errors.js';
import { logger } from '../logger.js';

const OSV_BATCH_URL = 'https://api.osv.dev/v1/querybatch';
const BATCH_SIZE = 1000;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_SIZE = 50 * 1024 * 1024;
const MAX_REQUEST_SIZE = 10 * 1024 * 1024;
const OSV_BATCH_CONCURRENCY = 5;

const SEVERITY_SCORE_MAP: Record<string, number> = {
  CRITICAL: 9.5,
  HIGH: 7.5,
  MODERATE: 5.0,
  MEDIUM: 5.0,
  LOW: 2.5,
};

export interface VulnMapEntry {
  readonly vulnerabilities: VulnInfo[];
}

interface OsvVuln {
  readonly id: string;
  readonly summary?: string;
  readonly database_specific?: {
    readonly cvss?: { readonly score?: number };
    readonly severity?: string;
  };
  readonly severity?: ReadonlyArray<{ readonly type?: string; readonly score?: string }>;
}

interface OsvBatchResponse {
  readonly results: ReadonlyArray<{ readonly vulns?: OsvVuln[] }>;
}

export function extractCvssScore(vuln: Partial<OsvVuln>): number {
  const dbSpecific = vuln.database_specific;
  if (dbSpecific?.cvss?.score !== undefined) {
    return dbSpecific.cvss.score;
  }
  if (dbSpecific?.severity) {
    const mapped = SEVERITY_SCORE_MAP[dbSpecific.severity.toUpperCase()];
    if (mapped !== undefined) return mapped;
  }
  if (vuln.severity && vuln.severity.length > 0) {
    return 5.0;
  }
  return 0;
}

async function fetchOsvBatch(batch: string[], batchIndex: number): Promise<Result<Map<string, VulnMapEntry>, LockwiseError>> {
  try {
    const queries = batch.map((purl) => ({ package: { purl } }));
    const response = await axios.post<OsvBatchResponse>(OSV_BATCH_URL, { queries }, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      maxContentLength: MAX_RESPONSE_SIZE,
      maxBodyLength: MAX_REQUEST_SIZE,
    });

    const result = new Map<string, VulnMapEntry>();
    for (let j = 0; j < batch.length; j++) {
      const vulns = response.data.results[j]?.vulns ?? [];
      const vulnerabilities: VulnInfo[] = vulns.map((v) => ({
        id: v.id,
        summary: v.summary ?? '',
        cvssScore: extractCvssScore(v),
      }));
      result.set(batch[j], { vulnerabilities });
    }
    return ok(result);
  } catch (error) {
    logger.error('[OsvChecker] batch failed:', error, { batchSize: batch.length });
    return err(osvError(batchIndex, error instanceof Error ? error : new Error(String(error))));
  }
}

export async function checkVulnerabilities(purls: string[]): Promise<Result<Map<string, VulnMapEntry>, LockwiseError[]>> {
  if (purls.length === 0) return ok(new Map());

  const batches: string[][] = [];
  for (let i = 0; i < purls.length; i += BATCH_SIZE) {
    batches.push(purls.slice(i, i + BATCH_SIZE));
  }

  const limit = pLimit(OSV_BATCH_CONCURRENCY);
  const batchResults = await Promise.all(
    batches.map((batch, i) => limit(() => fetchOsvBatch(batch, i))),
  );

  const combined = resultAll(batchResults);
  if (!isOk(combined)) return combined;

  const merged = new Map<string, VulnMapEntry>();
  for (const batchMap of combined.value) {
    for (const [key, value] of batchMap) {
      merged.set(key, value);
    }
  }
  return ok(merged);
}
