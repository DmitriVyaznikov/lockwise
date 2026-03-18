import { describe, it, expect } from 'vitest';
import {
  ok, err, isOk, isErr,
  map, flatMap, mapError,
  unwrapOr, match, tap, tapError,
  all, fromPromise, fromNullable,
} from '../../fp/result.js';

describe('Result', () => {
  describe('constructors and guards', () => {
    it('should create Ok and identify it', () => {
      const result = ok(42);
      expect(isOk(result)).toBe(true);
      expect(isErr(result)).toBe(false);
      expect(result.value).toBe(42);
    });

    it('should create Err and identify it', () => {
      const result = err('fail');
      expect(isErr(result)).toBe(true);
      expect(isOk(result)).toBe(false);
      expect(result.error).toBe('fail');
    });
  });

  describe('map', () => {
    it('should transform Ok value', () => {
      const result = map((x: number) => x * 2)(ok(21));
      expect(result).toEqual(ok(42));
    });

    it('should pass through Err unchanged', () => {
      const result = map((x: number) => x * 2)(err('fail'));
      expect(result).toEqual(err('fail'));
    });
  });

  describe('flatMap', () => {
    it('should chain Ok into next Result', () => {
      const validate = (x: number) => x > 0 ? ok(x) : err('negative');
      const result = flatMap(validate)(ok(5));
      expect(result).toEqual(ok(5));
    });

    it('should short-circuit on Err', () => {
      const validate = (x: number) => x > 0 ? ok(x) : err('negative');
      const result = flatMap(validate)(err('already failed'));
      expect(result).toEqual(err('already failed'));
    });

    it('should propagate Err from chained function', () => {
      const validate = (x: number) => x > 0 ? ok(x) : err('negative');
      const result = flatMap(validate)(ok(-1));
      expect(result).toEqual(err('negative'));
    });
  });

  describe('mapError', () => {
    it('should transform Err error', () => {
      const result = mapError((e: string) => new Error(e))(err('fail'));
      expect(isErr(result)).toBe(true);
      if (isErr(result)) expect(result.error.message).toBe('fail');
    });

    it('should pass through Ok unchanged', () => {
      const result = mapError((e: string) => new Error(e))(ok(42));
      expect(result).toEqual(ok(42));
    });
  });

  describe('unwrapOr', () => {
    it('should return value from Ok', () => {
      expect(unwrapOr(0)(ok(42))).toBe(42);
    });

    it('should return default from Err', () => {
      expect(unwrapOr(0)(err('fail'))).toBe(0);
    });
  });

  describe('match', () => {
    it('should call ok handler for Ok', () => {
      const result = match({ ok: (v: number) => `got ${v}`, err: (e: string) => `err: ${e}` })(ok(42));
      expect(result).toBe('got 42');
    });

    it('should call err handler for Err', () => {
      const result = match({ ok: (v: number) => `got ${v}`, err: (e: string) => `err: ${e}` })(err('fail'));
      expect(result).toBe('err: fail');
    });
  });

  describe('tap / tapError', () => {
    it('should execute side-effect on Ok without changing result', () => {
      const sideEffects: number[] = [];
      const result = tap((v: number) => sideEffects.push(v))(ok(42));
      expect(result).toEqual(ok(42));
      expect(sideEffects).toEqual([42]);
    });

    it('should not execute tap on Err', () => {
      const sideEffects: number[] = [];
      tap((v: number) => sideEffects.push(v))(err('fail'));
      expect(sideEffects).toEqual([]);
    });

    it('should execute side-effect on Err without changing result', () => {
      const errors: string[] = [];
      const result = tapError((e: string) => errors.push(e))(err('fail'));
      expect(result).toEqual(err('fail'));
      expect(errors).toEqual(['fail']);
    });
  });

  describe('all', () => {
    it('should collect all Ok values', () => {
      const result = all([ok(1), ok(2), ok(3)]);
      expect(result).toEqual(ok([1, 2, 3]));
    });

    it('should accumulate all Err errors', () => {
      const result = all([ok(1), err('a'), ok(3), err('b')]);
      expect(result).toEqual(err(['a', 'b']));
    });

    it('should return Ok for empty array', () => {
      expect(all([])).toEqual(ok([]));
    });
  });

  describe('fromPromise', () => {
    it('should wrap resolved promise in Ok', async () => {
      const result = await fromPromise(Promise.resolve(42));
      expect(result).toEqual(ok(42));
    });

    it('should wrap rejected promise in Err', async () => {
      const result = await fromPromise(Promise.reject(new Error('fail')));
      expect(isErr(result)).toBe(true);
      if (isErr(result)) expect(result.error.message).toBe('fail');
    });
  });

  describe('fromNullable', () => {
    it('should return Ok for non-null value', () => {
      expect(fromNullable('missing')(42)).toEqual(ok(42));
    });

    it('should return Err for null', () => {
      expect(fromNullable('missing')(null)).toEqual(err('missing'));
    });

    it('should return Err for undefined', () => {
      expect(fromNullable('missing')(undefined)).toEqual(err('missing'));
    });
  });
});
