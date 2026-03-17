import { describe, it, expect } from 'vitest';
import { PnpmParser } from './pnpm-parser.js';

const PNPM_LOCKFILE_V9 = `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true

importers:
  .:
    dependencies:
      axios:
        specifier: ^1.7.0
        version: 1.7.2

packages:
  axios@1.7.2:
    resolution: {integrity: sha512-xxx, tarball: https://registry.npmjs.org/axios/-/axios-1.7.2.tgz}
    dependencies:
      follow-redirects: 1.15.6

  follow-redirects@1.15.6:
    resolution: {integrity: sha512-yyy, tarball: https://registry.npmjs.org/follow-redirects/-/follow-redirects-1.15.6.tgz}
`;

const PNPM_SCOPED_LOCKFILE = `lockfileVersion: '9.0'

importers:
  .:
    dependencies:
      '@types/node':
        specifier: ^22.0.0
        version: 22.5.0

packages:
  '@types/node@22.5.0':
    resolution: {integrity: sha512-zzz}
`;

describe('PnpmParser', () => {
  const parser = new PnpmParser();

  describe('canParse', () => {
    it('should recognize pnpm-lock.yaml', () => {
      expect(parser.canParse(PNPM_LOCKFILE_V9)).toBe(true);
    });
    it('should reject package-lock.json', () => {
      expect(parser.canParse(JSON.stringify({ lockfileVersion: 3 }))).toBe(false);
    });
  });

  describe('parse', () => {
    it('should extract packages from pnpm-lock.yaml', () => {
      const result = parser.parse(PNPM_LOCKFILE_V9);
      expect(result.type).toBe('pnpm');
      expect(result.packages.length).toBeGreaterThanOrEqual(2);
      const axios = result.packages.find((p) => p.name === 'axios');
      expect(axios).toBeDefined();
      expect(axios!.version).toBe('1.7.2');
    });
    it('should handle scoped packages', () => {
      const result = parser.parse(PNPM_SCOPED_LOCKFILE);
      const typesNode = result.packages.find((p) => p.name === '@types/node');
      expect(typesNode).toBeDefined();
      expect(typesNode!.version).toBe('22.5.0');
    });
  });
});
