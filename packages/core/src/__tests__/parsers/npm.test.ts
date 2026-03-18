import { describe, it, expect } from 'vitest';
import { isOk, isErr } from '../../fp/result.js';
import { npmParser } from '../../parsers/npm.js';

const MINIMAL_LOCKFILE_V3 = JSON.stringify({
  name: 'test-project',
  version: '1.0.0',
  lockfileVersion: 3,
  packages: {
    '': {
      name: 'test-project',
      version: '1.0.0',
      dependencies: { axios: '^1.7.0' },
    },
    'node_modules/axios': {
      version: '1.7.2',
      resolved: 'https://registry.npmjs.org/axios/-/axios-1.7.2.tgz',
      dependencies: { 'follow-redirects': '^1.15.6' },
    },
    'node_modules/follow-redirects': {
      version: '1.15.6',
      resolved: 'https://registry.npmjs.org/follow-redirects/-/follow-redirects-1.15.6.tgz',
    },
  },
});

const SCOPED_PACKAGE_LOCKFILE = JSON.stringify({
  name: 'test-project',
  version: '1.0.0',
  lockfileVersion: 3,
  packages: {
    '': { name: 'test-project', version: '1.0.0', dependencies: { '@types/node': '^22.0.0' } },
    'node_modules/@types/node': {
      version: '22.5.0',
      resolved: 'https://registry.npmjs.org/@types/node/-/node-22.5.0.tgz',
    },
  },
});

describe('npmParser', () => {
  describe('canParse', () => {
    it('should recognize valid package-lock.json', () => {
      expect(npmParser.canParse(MINIMAL_LOCKFILE_V3)).toBe(true);
    });
    it('should reject invalid JSON', () => {
      expect(npmParser.canParse('not json')).toBe(false);
    });
    it('should reject JSON without lockfileVersion', () => {
      expect(npmParser.canParse(JSON.stringify({ name: 'test' }))).toBe(false);
    });
  });

  describe('parse', () => {
    it('should extract packages from lockfile v3', () => {
      const result = npmParser.parse(MINIMAL_LOCKFILE_V3);
      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;
      expect(result.value.type).toBe('npm');
      expect(result.value.packages).toHaveLength(2);
      expect(result.value.packages[0]).toEqual({
        name: 'axios',
        version: '1.7.2',
        resolved: 'https://registry.npmjs.org/axios/-/axios-1.7.2.tgz',
        dependencies: { 'follow-redirects': '^1.15.6' },
      });
    });

    it('should handle scoped packages', () => {
      const result = npmParser.parse(SCOPED_PACKAGE_LOCKFILE);
      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;
      expect(result.value.packages).toHaveLength(1);
      expect(result.value.packages[0].name).toBe('@types/node');
    });

    it('should skip root package', () => {
      const result = npmParser.parse(MINIMAL_LOCKFILE_V3);
      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;
      const names = result.value.packages.map((p) => p.name);
      expect(names).not.toContain('test-project');
    });

    it('should preserve rawPackages for buildRangeMap', () => {
      const result = npmParser.parse(MINIMAL_LOCKFILE_V3);
      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;
      expect(result.value.rawPackages).toBeDefined();
      expect(result.value.rawPackages['']).toBeDefined();
      expect(result.value.rawPackages['node_modules/axios']).toBeDefined();
    });

    it('should return Err for oversized content', () => {
      const oversized = '{"lockfileVersion":3,' + '"packages":{' + '"a":'.repeat(50 * 1024 * 1024 / 4) + '}}';
      const result = npmParser.parse(oversized);
      expect(isErr(result)).toBe(true);
    });

    it('should return Err for invalid JSON', () => {
      const result = npmParser.parse('{ invalid json');
      expect(isErr(result)).toBe(true);
    });
  });
});
