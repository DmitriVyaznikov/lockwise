import { describe, it, expect, vi } from 'vitest';
import { checkVulnerabilities, extractCvssScore } from './osv-checker.js';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
import axios from 'axios';
const mockedAxios = vi.mocked(axios);

describe('extractCvssScore', () => {
  it('должен вернуть score из database_specific.cvss', () => {
    expect(extractCvssScore({ database_specific: { cvss: { score: 9.8 } } })).toBe(9.8);
  });
  it('должен маппить severity в числовой score', () => {
    expect(extractCvssScore({ database_specific: { severity: 'HIGH' } })).toBe(7.5);
    expect(extractCvssScore({ database_specific: { severity: 'CRITICAL' } })).toBe(9.5);
    expect(extractCvssScore({ database_specific: { severity: 'LOW' } })).toBe(2.5);
  });
  it('должен вернуть 5.0 при наличии severity без маппинга', () => {
    expect(extractCvssScore({ severity: [{ type: 'CVSS_V3' }] })).toBe(5.0);
  });
  it('должен вернуть 0 при отсутствии данных', () => {
    expect(extractCvssScore({})).toBe(0);
  });
});

describe('checkVulnerabilities', () => {
  it('должен вернуть пустую Map для пустого списка', async () => {
    const result = await checkVulnerabilities([]);
    expect(result.size).toBe(0);
  });
  it('должен обработать batch-ответ от OSV.dev', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        results: [
          { vulns: [{ id: 'GHSA-123', summary: 'XSS vulnerability', database_specific: { severity: 'HIGH' } }] },
          { vulns: [] },
        ],
      },
    });
    const result = await checkVulnerabilities(['pkg:npm/lodash@4.17.20', 'pkg:npm/axios@1.7.2']);
    expect(result.size).toBe(2);
    expect(result.get('pkg:npm/lodash@4.17.20')!.vulnerabilities).toHaveLength(1);
    expect(result.get('pkg:npm/axios@1.7.2')!.vulnerabilities).toHaveLength(0);
  });
  it('должен вернуть пустую Map при ошибке API', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
    const result = await checkVulnerabilities(['pkg:npm/foo@1.0.0']);
    expect(result.size).toBe(0);
  });
});
