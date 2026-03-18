import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isOk, isErr } from '../../fp/result.js';
import { createRegistryFetcher } from '../../checkers/registry.js';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));
import axios from 'axios';
const mockedAxios = vi.mocked(axios);

describe('RegistryFetcher', () => {
  let fetcher: ReturnType<typeof createRegistryFetcher>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetcher = createRegistryFetcher('https://registry.npmjs.org');
  });

  it('should return Ok with package data from registry', async () => {
    const mockData = { name: 'axios', versions: { '1.7.0': {}, '1.7.2': {} }, time: { '1.7.0': '2024-01-01', '1.7.2': '2024-06-01' } };
    mockedAxios.get.mockResolvedValueOnce({ data: mockData });
    const result = await fetcher.fetch('axios');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value).toEqual(mockData);
  });

  it('should cache repeated requests', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { name: 'axios', versions: {}, time: {} } });
    await fetcher.fetch('axios');
    await fetcher.fetch('axios');
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('should return Err on error', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Not found'));
    const result = await fetcher.fetch('nonexistent');
    expect(isErr(result)).toBe(true);
  });

  it('should return Err for invalid response shape', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { unexpected: true } });
    const result = await fetcher.fetch('bad-shape');
    expect(isErr(result)).toBe(true);
  });

  it('should return Err when versions is missing', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { name: 'pkg', time: {} } });
    const result = await fetcher.fetch('no-versions');
    expect(isErr(result)).toBe(true);
  });
});
