import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveConfig } from './config.js';

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
    });
  });
});
