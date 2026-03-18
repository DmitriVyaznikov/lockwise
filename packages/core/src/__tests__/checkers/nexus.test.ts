import { describe, it, expect, vi } from 'vitest';
import { isOk, isErr } from '../../fp/result.js';
import { buildNexusTarballUrl, checkNexusAvailability } from '../../checkers/nexus.js';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, head: vi.fn() } };
});
import axios, { AxiosError } from 'axios';
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
  it('should return Ok with status for available package', async () => {
    mockedAxios.head.mockResolvedValueOnce({ status: 200 });
    const result = await checkNexusAvailability(`${NEXUS_URL}/axios/-/axios-1.7.2.tgz`);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value).toBe(200);
  });

  it('should return Ok with 404 for unavailable package', async () => {
    const error = new AxiosError('Not Found', '404', undefined, undefined, {
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config: { headers: {} } as never,
      data: null,
    });
    mockedAxios.head.mockRejectedValueOnce(error);
    const result = await checkNexusAvailability(`${NEXUS_URL}/foo/-/foo-1.0.0.tgz`);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value).toBe(404);
  });

  it('should return Err for unexpected errors', async () => {
    mockedAxios.head.mockRejectedValueOnce(new Error('network down'));
    const result = await checkNexusAvailability(`${NEXUS_URL}/bar/-/bar-1.0.0.tgz`);
    expect(isErr(result)).toBe(true);
  });
});
