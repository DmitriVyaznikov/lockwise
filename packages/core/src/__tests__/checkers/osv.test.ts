import { describe, it, expect, vi } from 'vitest';
import { isOk, isErr } from '../../fp/result.js';
import { checkVulnerabilities, extractCvssScore } from '../../checkers/osv.js';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
import axios from 'axios';
const mockedAxios = vi.mocked(axios);

describe('extractCvssScore', () => {
  it('should return score from database_specific.cvss', () => {
    expect(extractCvssScore({ database_specific: { cvss: { score: 9.8 } } })).toBe(9.8);
  });
  it('should map severity to numeric score', () => {
    expect(extractCvssScore({ database_specific: { severity: 'HIGH' } })).toBe(7.5);
    expect(extractCvssScore({ database_specific: { severity: 'CRITICAL' } })).toBe(9.5);
    expect(extractCvssScore({ database_specific: { severity: 'LOW' } })).toBe(2.5);
  });
  it('should return 5.0 for severity without mapping', () => {
    expect(extractCvssScore({ severity: [{ type: 'CVSS_V3' }] })).toBe(5.0);
  });
  it('should return 0 when no data', () => {
    expect(extractCvssScore({})).toBe(0);
  });
});

describe('checkVulnerabilities', () => {
  it('should return Ok with empty Map for empty list', async () => {
    const result = await checkVulnerabilities([]);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value.size).toBe(0);
  });

  it('should process batch response from OSV.dev', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        results: [
          { vulns: [{ id: 'GHSA-123', summary: 'XSS vulnerability', database_specific: { severity: 'HIGH' } }] },
          { vulns: [] },
        ],
      },
    });
    const result = await checkVulnerabilities(['pkg:npm/lodash@4.17.20', 'pkg:npm/axios@1.7.2']);
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.size).toBe(2);
    expect(result.value.get('pkg:npm/lodash@4.17.20')!.vulnerabilities).toHaveLength(1);
    expect(result.value.get('pkg:npm/axios@1.7.2')!.vulnerabilities).toHaveLength(0);
  });

  it('should return Err on all batches failing', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
    const result = await checkVulnerabilities(['pkg:npm/foo@1.0.0']);
    expect(isErr(result)).toBe(true);
  });
});
