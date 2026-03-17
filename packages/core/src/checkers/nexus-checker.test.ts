import { describe, it, expect, vi } from 'vitest';
import { buildNexusTarballUrl, checkNexusAvailability } from './nexus-checker.js';

vi.mock('axios', () => ({ default: { head: vi.fn() } }));
import axios from 'axios';
const mockedAxios = vi.mocked(axios);

const NEXUS_URL = 'http://nexus.example.com/repository/npm-group';

describe('buildNexusTarballUrl', () => {
  it('should build URL for regular package', () => {
    expect(buildNexusTarballUrl('axios', '1.7.2', NEXUS_URL)).toBe(`${NEXUS_URL}/axios/-/axios-1.7.2.tgz`);
  });
  it('should build URL for scoped package', () => {
    expect(buildNexusTarballUrl('@types/node', '22.5.0', NEXUS_URL)).toBe(`${NEXUS_URL}/@types/node/-/node-22.5.0.tgz`);
  });
});

describe('checkNexusAvailability', () => {
  it('should return 200 for available package', async () => {
    mockedAxios.head.mockResolvedValueOnce({ status: 200 });
    expect(await checkNexusAvailability(`${NEXUS_URL}/axios/-/axios-1.7.2.tgz`)).toBe(200);
  });
  it('should return 404 for unavailable package', async () => {
    mockedAxios.head.mockRejectedValueOnce({ response: { status: 404 } });
    expect(await checkNexusAvailability(`${NEXUS_URL}/foo/-/foo-1.0.0.tgz`)).toBe(404);
  });
});
