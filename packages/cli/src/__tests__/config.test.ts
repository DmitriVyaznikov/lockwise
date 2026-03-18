import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveConfig } from '../config.js';

describe('resolveConfig', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should throw when nexusUrl is not provided from any source', () => {
    expect(() => resolveConfig({})).toThrow('LOCKWISE_NEXUS_URL');
  });

  it('should use CLI flag for nexusUrl', () => {
    const config = resolveConfig({ nexusUrl: 'http://cli-nexus/npm' });
    expect(config.nexusUrl).toBe('http://cli-nexus/npm');
  });

  it('should use env var for nexusUrl when CLI flag is not provided', () => {
    vi.stubEnv('LOCKWISE_NEXUS_URL', 'http://env-nexus/npm');
    const config = resolveConfig({});
    expect(config.nexusUrl).toBe('http://env-nexus/npm');
  });

  it('should prefer CLI flag over env var for nexusUrl', () => {
    vi.stubEnv('LOCKWISE_NEXUS_URL', 'http://env-nexus/npm');
    const config = resolveConfig({ nexusUrl: 'http://cli-nexus/npm' });
    expect(config.nexusUrl).toBe('http://cli-nexus/npm');
  });

  it('should use env var for publicRegistry', () => {
    vi.stubEnv('LOCKWISE_NEXUS_URL', 'http://nexus/npm');
    vi.stubEnv('LOCKWISE_PUBLIC_REGISTRY', 'http://custom-registry');
    const config = resolveConfig({});
    expect(config.publicRegistry).toBe('http://custom-registry');
  });

  it('should fall back to default for publicRegistry', () => {
    const config = resolveConfig({ nexusUrl: 'http://nexus/npm' });
    expect(config.publicRegistry).toBe('https://registry.npmjs.org');
  });

  it('should parse numeric LOCKWISE_MIN_AGE_DAYS env var', () => {
    vi.stubEnv('LOCKWISE_NEXUS_URL', 'http://nexus/npm');
    vi.stubEnv('LOCKWISE_MIN_AGE_DAYS', '14');
    const config = resolveConfig({});
    expect(config.minAgeDays).toBe(14);
  });

  it('should ignore invalid (non-numeric) LOCKWISE_MIN_AGE_DAYS', () => {
    vi.stubEnv('LOCKWISE_NEXUS_URL', 'http://nexus/npm');
    vi.stubEnv('LOCKWISE_MIN_AGE_DAYS', 'abc');
    const config = resolveConfig({});
    expect(config.minAgeDays).toBe(30);
  });

  it('should use env var for outputDir', () => {
    vi.stubEnv('LOCKWISE_NEXUS_URL', 'http://nexus/npm');
    vi.stubEnv('LOCKWISE_OUTPUT_DIR', 'custom-output');
    const config = resolveConfig({});
    expect(config.outputDir).toBe('custom-output');
  });

  it('should fall back to default for outputDir', () => {
    const config = resolveConfig({ nexusUrl: 'http://nexus/npm' });
    expect(config.outputDir).toBe('.lockwise');
  });

  it('should return all config fields', () => {
    const config = resolveConfig({ nexusUrl: 'http://nexus/npm' });
    expect(config).toEqual({
      nexusUrl: 'http://nexus/npm',
      publicRegistry: 'https://registry.npmjs.org',
      minAgeDays: 30,
      outputDir: '.lockwise',
      servePort: 3001,
      uiPort: 3000,
    });
  });

  it('should throw when nexusUrl is not a valid HTTP URL', () => {
    expect(() => resolveConfig({ nexusUrl: 'ftp://nexus/npm' })).toThrow();
  });

  it('should throw when nexusUrl is garbage', () => {
    expect(() => resolveConfig({ nexusUrl: 'not-a-url' })).toThrow();
  });

  it('should throw when publicRegistry is not a valid HTTP URL', () => {
    vi.stubEnv('LOCKWISE_PUBLIC_REGISTRY', 'ftp://bad-registry');
    expect(() => resolveConfig({ nexusUrl: 'http://nexus/npm' })).toThrow();
  });

  it('should fall back to default for negative minAgeDays', () => {
    vi.stubEnv('LOCKWISE_NEXUS_URL', 'http://nexus/npm');
    vi.stubEnv('LOCKWISE_MIN_AGE_DAYS', '-5');
    const config = resolveConfig({});
    expect(config.minAgeDays).toBe(30);
  });

  it('should strip credentials from URL in error messages', () => {
    expect(() => resolveConfig({ nexusUrl: 'ftp://user:secret@nexus.internal/npm' })).toThrow(
      /Invalid Nexus URL/,
    );
    try {
      resolveConfig({ nexusUrl: 'ftp://user:secret@nexus.internal/npm' });
    } catch (error) {
      expect((error as Error).message).not.toContain('secret');
    }
  });

  it('should strip credentials from public registry URL in error messages', () => {
    vi.stubEnv('LOCKWISE_PUBLIC_REGISTRY', 'ftp://admin:pass123@registry.internal');
    try {
      resolveConfig({ nexusUrl: 'http://nexus/npm' });
    } catch (error) {
      expect((error as Error).message).not.toContain('pass123');
    }
  });
});
