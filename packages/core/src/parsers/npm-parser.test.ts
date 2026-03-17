import { describe, it, expect } from 'vitest';
import { NpmParser } from './npm-parser.js';

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

describe('NpmParser', () => {
  const parser = new NpmParser();

  describe('canParse', () => {
    it('должен распознать валидный package-lock.json', () => {
      expect(parser.canParse(MINIMAL_LOCKFILE_V3)).toBe(true);
    });
    it('должен отклонить невалидный JSON', () => {
      expect(parser.canParse('not json')).toBe(false);
    });
    it('должен отклонить JSON без lockfileVersion', () => {
      expect(parser.canParse(JSON.stringify({ name: 'test' }))).toBe(false);
    });
  });

  describe('parse', () => {
    it('должен извлечь пакеты из lockfile v3', () => {
      const result = parser.parse(MINIMAL_LOCKFILE_V3);
      expect(result.type).toBe('npm');
      expect(result.packages).toHaveLength(2);
      expect(result.packages[0]).toEqual({
        name: 'axios',
        version: '1.7.2',
        resolved: 'https://registry.npmjs.org/axios/-/axios-1.7.2.tgz',
        dependencies: { 'follow-redirects': '^1.15.6' },
      });
    });
    it('должен обработать scoped-пакеты', () => {
      const result = parser.parse(SCOPED_PACKAGE_LOCKFILE);
      expect(result.packages).toHaveLength(1);
      expect(result.packages[0].name).toBe('@types/node');
    });
    it('должен пропустить корневой пакет', () => {
      const result = parser.parse(MINIMAL_LOCKFILE_V3);
      const names = result.packages.map((p) => p.name);
      expect(names).not.toContain('test-project');
    });
    it('должен сохранить rawPackages для buildRangeMap', () => {
      const result = parser.parse(MINIMAL_LOCKFILE_V3);
      expect(result.rawPackages).toBeDefined();
      expect(result.rawPackages['']).toBeDefined();
      expect(result.rawPackages['node_modules/axios']).toBeDefined();
    });
  });
});
