import { describe, it, expect } from 'vitest';
import {
  some, none, isSome, isNone,
  map, flatMap, unwrapOr, match,
  fromNullable, toResult,
} from '../../fp/maybe.js';
import { ok, err } from '../../fp/result.js';

describe('Maybe', () => {
  describe('constructors and guards', () => {
    it('should create Some and identify it', () => {
      const m = some(42);
      expect(isSome(m)).toBe(true);
      expect(isNone(m)).toBe(false);
      expect(m.value).toBe(42);
    });

    it('should create None and identify it', () => {
      expect(isNone(none)).toBe(true);
      expect(isSome(none)).toBe(false);
    });
  });

  describe('map', () => {
    it('should transform Some value', () => {
      expect(map((x: number) => x * 2)(some(21))).toEqual(some(42));
    });

    it('should pass through None', () => {
      expect(map((x: number) => x * 2)(none)).toBe(none);
    });
  });

  describe('flatMap', () => {
    it('should chain Some into next Maybe', () => {
      const safeSqrt = (x: number) => x >= 0 ? some(Math.sqrt(x)) : none;
      expect(flatMap(safeSqrt)(some(4))).toEqual(some(2));
    });

    it('should short-circuit on None', () => {
      const safeSqrt = (x: number) => x >= 0 ? some(Math.sqrt(x)) : none;
      expect(flatMap(safeSqrt)(none)).toBe(none);
    });

    it('should propagate None from chained function', () => {
      const safeSqrt = (x: number) => x >= 0 ? some(Math.sqrt(x)) : none;
      expect(flatMap(safeSqrt)(some(-1))).toBe(none);
    });
  });

  describe('unwrapOr', () => {
    it('should return value from Some', () => {
      expect(unwrapOr(0)(some(42))).toBe(42);
    });

    it('should return default from None', () => {
      expect(unwrapOr(0)(none)).toBe(0);
    });
  });

  describe('match', () => {
    it('should call some handler for Some', () => {
      const result = match({ some: (v: number) => v + 1, none: () => 0 })(some(41));
      expect(result).toBe(42);
    });

    it('should call none handler for None', () => {
      const result = match({ some: (v: number) => v + 1, none: () => 0 })(none);
      expect(result).toBe(0);
    });
  });

  describe('fromNullable', () => {
    it('should return Some for value', () => {
      expect(fromNullable(42)).toEqual(some(42));
    });

    it('should return None for null', () => {
      expect(fromNullable(null)).toBe(none);
    });

    it('should return None for undefined', () => {
      expect(fromNullable(undefined)).toBe(none);
    });
  });

  describe('toResult', () => {
    it('should convert Some to Ok', () => {
      expect(toResult('missing')(some(42))).toEqual(ok(42));
    });

    it('should convert None to Err', () => {
      expect(toResult('missing')(none)).toEqual(err('missing'));
    });
  });
});
