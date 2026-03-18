import { describe, it, expect } from 'vitest';
import { isOk, isErr } from '../../fp/result.js';
import {
  PackageName, SemverRange, Purl, ISODate, Version,
} from '../../domain/types.js';

describe('Branded Types', () => {
  describe('PackageName', () => {
    it('should accept valid package name', () => {
      const result = PackageName.parse('express');
      expect(isOk(result)).toBe(true);
    });

    it('should accept scoped package', () => {
      const result = PackageName.parse('@scope/name');
      expect(isOk(result)).toBe(true);
    });

    it('should reject empty string', () => {
      expect(isErr(PackageName.parse(''))).toBe(true);
    });
  });

  describe('SemverRange', () => {
    it('should accept valid range', () => {
      expect(isOk(SemverRange.parse('^1.0.0'))).toBe(true);
      expect(isOk(SemverRange.parse('~2.3.4'))).toBe(true);
      expect(isOk(SemverRange.parse('>=1.0.0 <2.0.0'))).toBe(true);
    });

    it('should reject invalid range', () => {
      expect(isErr(SemverRange.parse('not-a-range'))).toBe(true);
    });
  });

  describe('Version', () => {
    it('should accept valid semver', () => {
      expect(isOk(Version.parse('1.2.3'))).toBe(true);
    });

    it('should reject invalid version', () => {
      expect(isErr(Version.parse('abc'))).toBe(true);
    });
  });

  describe('Purl', () => {
    it('should build PURL for regular package', () => {
      const purl = Purl.build('express' as PackageName, '4.18.0' as Version);
      expect(purl).toBe('pkg:npm/express@4.18.0');
    });

    it('should build PURL for scoped package', () => {
      const purl = Purl.build('@types/node' as PackageName, '20.0.0' as Version);
      expect(purl).toBe('pkg:npm/%40types/node@20.0.0');
    });
  });

  describe('ISODate', () => {
    it('should accept valid ISO date', () => {
      expect(isOk(ISODate.parse('2024-01-15T00:00:00.000Z'))).toBe(true);
    });

    it('should reject invalid date', () => {
      expect(isErr(ISODate.parse('not-a-date'))).toBe(true);
    });
  });
});
