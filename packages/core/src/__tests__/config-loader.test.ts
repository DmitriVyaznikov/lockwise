import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig } from '../config-loader.js';
import { DEFAULT_CONFIG } from '../domain/report.js';
import { isOk, isErr } from '../fp/result.js';

vi.mock('cosmiconfig', () => {
  const searchMock = vi.fn();
  return {
    cosmiconfig: vi.fn(() => ({
      search: searchMock,
    })),
    __searchMock: searchMock,
  };
});

async function getSearchMock() {
  const mod = await import('cosmiconfig') as unknown as { __searchMock: ReturnType<typeof vi.fn> };
  return mod.__searchMock;
}

describe('loadConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return Ok with DEFAULT_CONFIG when no config file is found', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockResolvedValue(null);

    const result = await loadConfig('/some/dir');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value).toEqual({ ...DEFAULT_CONFIG });
  });

  it('should return Ok with DEFAULT_CONFIG when config result is empty', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockResolvedValue({ config: {}, isEmpty: true, filepath: '' });

    const result = await loadConfig('/some/dir');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value).toEqual({ ...DEFAULT_CONFIG });
  });

  it('should merge partial config with defaults', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockResolvedValue({
      config: { nexusUrl: 'https://custom-nexus.example.com', minAgeDays: 14 },
      isEmpty: false,
      filepath: '/project/lockwise.config.ts',
    });

    const result = await loadConfig('/project');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({
        ...DEFAULT_CONFIG,
        nexusUrl: 'https://custom-nexus.example.com',
        minAgeDays: 14,
      });
    }
  });

  it('should search from cwd when no directory is provided', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockResolvedValue(null);

    await loadConfig();
    expect(searchMock).toHaveBeenCalledWith(undefined);
  });

  it('should search from specified directory', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockResolvedValue(null);

    await loadConfig('/custom/path');
    expect(searchMock).toHaveBeenCalledWith('/custom/path');
  });

  it('should return Err when cosmiconfig throws', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockRejectedValue(new Error('parse error'));

    const result = await loadConfig('/bad/path');
    expect(isErr(result)).toBe(true);
  });

  it('should merge unknown config fields', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockResolvedValue({
      config: { nexusUrl: 'https://nexus.example.com', unknownField: true },
      isEmpty: false,
      filepath: '/project/lockwise.config.ts',
    });

    const result = await loadConfig('/project');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.nexusUrl).toBe('https://nexus.example.com');
    }
  });
});
