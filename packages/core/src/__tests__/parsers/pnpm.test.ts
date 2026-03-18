import { describe, it, expect } from 'vitest';
import { isOk, isErr } from '../../fp/result.js';
import { pnpmParser } from '../../parsers/pnpm.js';

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

describe('pnpmParser', () => {
  describe('canParse', () => {
    it('should recognize pnpm-lock.yaml', () => {
      expect(pnpmParser.canParse(PNPM_LOCKFILE_V9)).toBe(true);
    });
    it('should reject package-lock.json', () => {
      expect(pnpmParser.canParse(JSON.stringify({ lockfileVersion: 3 }))).toBe(false);
    });
  });

  describe('parse', () => {
    it('should extract packages from pnpm-lock.yaml', () => {
      const result = pnpmParser.parse(PNPM_LOCKFILE_V9);
      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;
      expect(result.value.type).toBe('pnpm');
      expect(result.value.packages.length).toBeGreaterThanOrEqual(2);
      const axios = result.value.packages.find((p) => p.name === 'axios');
      expect(axios).toBeDefined();
      expect(axios!.version).toBe('1.7.2');
    });

    it('should handle scoped packages', () => {
      const result = pnpmParser.parse(PNPM_SCOPED_LOCKFILE);
      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;
      const typesNode = result.value.packages.find((p) => p.name === '@types/node');
      expect(typesNode).toBeDefined();
      expect(typesNode!.version).toBe('22.5.0');
    });

    it('should return Err for oversized content', () => {
      const oversized = 'a'.repeat(50 * 1024 * 1024 + 1);
      const result = pnpmParser.parse(oversized);
      expect(isErr(result)).toBe(true);
    });

    it('should return Err on YAML with excessive aliases', () => {
      const lines = ['lockfileVersion: "9.0"', 'packages:'];
      for (let i = 0; i < 150; i++) {
        lines.push(`  a${i}: &a${i}`);
        if (i > 0) lines.push(`    ref: *a${i - 1}`);
      }
      const result = pnpmParser.parse(lines.join('\n'));
      expect(isErr(result)).toBe(true);
    });
  });
});
