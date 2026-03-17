import axios from 'axios';
import type { VulnInfo } from '../types.js';

const OSV_BATCH_URL = 'https://api.osv.dev/v1/querybatch';
const BATCH_SIZE = 1000;

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

export async function checkVulnerabilities(purls: string[]): Promise<Map<string, VulnMapEntry>> {
  const result = new Map<string, VulnMapEntry>();
  if (purls.length === 0) return result;

  try {
    for (let i = 0; i < purls.length; i += BATCH_SIZE) {
      const batch = purls.slice(i, i + BATCH_SIZE);
      const queries = batch.map((purl) => ({ package: { purl } }));
      const response = await axios.post<OsvBatchResponse>(OSV_BATCH_URL, { queries });

      for (let j = 0; j < batch.length; j++) {
        const vulns = response.data.results[j]?.vulns ?? [];
        const vulnerabilities: VulnInfo[] = vulns.map((v) => ({
          id: v.id,
          summary: v.summary ?? '',
          cvssScore: extractCvssScore(v),
        }));
        result.set(batch[j], { vulnerabilities });
      }
    }
  } catch {
    return new Map();
  }

  return result;
}
