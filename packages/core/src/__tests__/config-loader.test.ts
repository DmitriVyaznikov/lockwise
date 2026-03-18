import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig } from '../config-loader.js';
import { DEFAULT_CONFIG } from '../types.js';

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

  it('should return DEFAULT_CONFIG when no config file is found', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockResolvedValue(null);

    const config = await loadConfig('/some/dir');
    expect(config).toEqual({ ...DEFAULT_CONFIG });
  });

  it('should return DEFAULT_CONFIG when config result is empty', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockResolvedValue({ config: {}, isEmpty: true, filepath: '' });

    const config = await loadConfig('/some/dir');
    expect(config).toEqual({ ...DEFAULT_CONFIG });
  });

  it('should merge partial config with defaults', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockResolvedValue({
      config: { nexusUrl: 'https://custom-nexus.example.com', minAgeDays: 14 },
      isEmpty: false,
      filepath: '/project/lockwise.config.ts',
    });

    const config = await loadConfig('/project');
    expect(config).toEqual({
      ...DEFAULT_CONFIG,
      nexusUrl: 'https://custom-nexus.example.com',
      minAgeDays: 14,
    });
  });

  it('should override all defaults when full config is provided', async () => {
    const searchMock = await getSearchMock();
    const fullConfig = {
      nexusUrl: 'https://nexus.corp.com/npm',
      publicRegistry: 'https://registry.corp.com',
      minAgeDays: 7,
      outputDir: 'reports',
      servePort: 4000,
      uiPort: 4001,
    };
    searchMock.mockResolvedValue({
      config: fullConfig,
      isEmpty: false,
      filepath: '/project/.lockwiserc.json',
    });

    const config = await loadConfig('/project');
    expect(config).toEqual(fullConfig);
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

  it('should ignore unknown config fields', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockResolvedValue({
      config: { nexusUrl: 'https://nexus.example.com', unknownField: true },
      isEmpty: false,
      filepath: '/project/lockwise.config.ts',
    });

    const config = await loadConfig('/project');
    expect(config.nexusUrl).toBe('https://nexus.example.com');
    expect((config as Record<string, unknown>)['unknownField']).toBe(true);
  });
});
