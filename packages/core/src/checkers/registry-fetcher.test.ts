import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRegistryFetcher } from './registry-fetcher.js';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));
import axios from 'axios';
const mockedAxios = vi.mocked(axios);

describe('RegistryFetcher', () => {
  let fetcher: ReturnType<typeof createRegistryFetcher>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetcher = createRegistryFetcher('https://registry.npmjs.org');
  });

  it('should fetch package data from registry', async () => {
    const mockData = { name: 'axios', versions: { '1.7.0': {}, '1.7.2': {} }, time: { '1.7.0': '2024-01-01', '1.7.2': '2024-06-01' } };
    mockedAxios.get.mockResolvedValueOnce({ data: mockData });
    expect(await fetcher.fetch('axios')).toEqual(mockData);
  });
  it('should cache repeated requests', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { name: 'axios', versions: {}, time: {} } });
    await fetcher.fetch('axios');
    await fetcher.fetch('axios');
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });
  it('should return null on error', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Not found'));
    expect(await fetcher.fetch('nonexistent')).toBeNull();
  });
});
