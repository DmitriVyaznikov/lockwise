import { describe, it, expect } from 'vitest';
import { isOk, isErr } from '../../fp/result.js';
import { isSome, isNone } from '../../fp/maybe.js';
import {
  run,
  literal, regex, char,
  seq, alt, many, many1, optional, sepBy,
  map, flatMap, between,
} from '../../fp/parser.js';

describe('Parser Combinators', () => {
  describe('literal', () => {
    it('should match exact string', () => {
      const result = run(literal('hello'), 'hello world');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.value).toBe('hello');
    });

    it('should fail on mismatch', () => {
      const result = run(literal('hello'), 'world');
      expect(isErr(result)).toBe(true);
    });
  });

  describe('regex', () => {
    it('should match pattern at current position', () => {
      const digits = regex(/\d+/);
      const result = run(digits, '123abc');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.value).toBe('123');
    });

    it('should fail when pattern does not match', () => {
      const digits = regex(/\d+/);
      const result = run(digits, 'abc');
      expect(isErr(result)).toBe(true);
    });
  });

  describe('char', () => {
    it('should match single character by predicate', () => {
      const letter = char((c) => /[a-z]/.test(c));
      const result = run(letter, 'abc');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.value).toBe('a');
    });
  });

  describe('seq', () => {
    it('should match sequence of parsers', () => {
      const p = seq(literal('a'), literal('b'), literal('c'));
      const result = run(p, 'abc');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.value).toEqual(['a', 'b', 'c']);
    });

    it('should fail if any parser in sequence fails', () => {
      const p = seq(literal('a'), literal('b'), literal('c'));
      const result = run(p, 'axc');
      expect(isErr(result)).toBe(true);
    });
  });

  describe('alt', () => {
    it('should try parsers in order and return first match', () => {
      const p = alt(literal('foo'), literal('bar'), literal('baz'));
      expect(isOk(run(p, 'bar'))).toBe(true);
    });

    it('should fail if no parser matches', () => {
      const p = alt(literal('foo'), literal('bar'));
      expect(isErr(run(p, 'baz'))).toBe(true);
    });
  });

  describe('many / many1', () => {
    it('should match zero or more repetitions', () => {
      const digits = many(regex(/\d/));
      const result = run(digits, 'abc');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.value).toEqual([]);
    });

    it('should match multiple repetitions', () => {
      const digits = many(regex(/\d/));
      const result = run(digits, '123abc');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.value).toEqual(['1', '2', '3']);
    });

    it('many1 should require at least one match', () => {
      const digits = many1(regex(/\d/));
      expect(isErr(run(digits, 'abc'))).toBe(true);
    });

    it('many1 should succeed with one or more', () => {
      const digits = many1(regex(/\d/));
      const result = run(digits, '12x');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.value).toEqual(['1', '2']);
    });
  });

  describe('optional', () => {
    it('should return Some on match', () => {
      const result = run(optional(literal('a')), 'abc');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(isSome(result.value)).toBe(true);
    });

    it('should return None on no match', () => {
      const result = run(optional(literal('a')), 'xyz');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(isNone(result.value)).toBe(true);
    });
  });

  describe('sepBy', () => {
    it('should parse comma-separated values', () => {
      const csv = sepBy(regex(/[a-z]+/), literal(','));
      const result = run(csv, 'foo,bar,baz');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.value).toEqual(['foo', 'bar', 'baz']);
    });

    it('should return empty array on no match', () => {
      const csv = sepBy(regex(/[a-z]+/), literal(','));
      const result = run(csv, '123');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.value).toEqual([]);
    });
  });

  describe('map', () => {
    it('should transform parser result', () => {
      const num = map(regex(/\d+/), Number);
      const result = run(num, '42');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.value).toBe(42);
    });
  });

  describe('flatMap', () => {
    it('should chain parsers based on previous result', () => {
      const p = flatMap(regex(/\d/), (digit) => {
        const n = Number(digit);
        return map(regex(new RegExp(`[a-z]{${n}}`)), (s) => ({ count: n, str: s }));
      });
      const result = run(p, '3abc');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.value).toEqual({ count: 3, str: 'abc' });
    });
  });

  describe('between', () => {
    it('should parse content between delimiters', () => {
      const quoted = between(literal('"'), regex(/[^"]*/), literal('"'));
      const result = run(quoted, '"hello"');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.value).toBe('hello');
    });
  });
});
