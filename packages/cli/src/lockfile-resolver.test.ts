import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveLockfile } from './lockfile-resolver.js';
import fs from 'node:fs';

vi.mock('node:fs');

const mockedFs = vi.mocked(fs);

describe('resolveLockfile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return the explicit path when --lockfile is provided and file exists', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('{"lockfileVersion": 3}');

    const result = resolveLockfile('/project/custom-lock.json');
    expect(result).toBe('/project/custom-lock.json');
  });

  it('should throw when explicit lockfile does not exist', () => {
    mockedFs.existsSync.mockReturnValue(false);

    expect(() => resolveLockfile('/project/missing.json')).toThrow('Lockfile not found');
  });

  it('should auto-detect package-lock.json first', () => {
    mockedFs.existsSync.mockImplementation((p) =>
      String(p).endsWith('package-lock.json'),
    );

    const result = resolveLockfile(undefined);
    expect(result).toContain('package-lock.json');
  });

  it('should auto-detect yarn.lock when package-lock.json is absent', () => {
    mockedFs.existsSync.mockImplementation((p) =>
      String(p).endsWith('yarn.lock'),
    );

    const result = resolveLockfile(undefined);
    expect(result).toContain('yarn.lock');
  });

  it('should auto-detect pnpm-lock.yaml when others are absent', () => {
    mockedFs.existsSync.mockImplementation((p) =>
      String(p).endsWith('pnpm-lock.yaml'),
    );

    const result = resolveLockfile(undefined);
    expect(result).toContain('pnpm-lock.yaml');
  });

  it('should throw when no lockfile is found', () => {
    mockedFs.existsSync.mockReturnValue(false);

    expect(() => resolveLockfile(undefined)).toThrow('No lockfile found');
  });
});
