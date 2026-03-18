import { describe, it, expect } from 'vitest';
import { tuple, fst, snd, mapFst, mapSnd, bimap } from '../../fp/tuple.js';

describe('Tuple', () => {
  it('should create a tuple and access elements', () => {
    const t = tuple('hello', 42);
    expect(fst(t)).toBe('hello');
    expect(snd(t)).toBe(42);
  });

  it('should map first element', () => {
    const t = tuple('hello', 42);
    const result = mapFst((s: string) => s.toUpperCase())(t);
    expect(fst(result)).toBe('HELLO');
    expect(snd(result)).toBe(42);
  });

  it('should map second element', () => {
    const t = tuple('hello', 42);
    const result = mapSnd((n: number) => n * 2)(t);
    expect(fst(result)).toBe('hello');
    expect(snd(result)).toBe(84);
  });

  it('should bimap both elements', () => {
    const t = tuple('hello', 42);
    const result = bimap(
      (s: string) => s.length,
      (n: number) => n > 40,
    )(t);
    expect(fst(result)).toBe(5);
    expect(snd(result)).toBe(true);
  });

  it('should support toString', () => {
    expect(tuple('express', '4.0.0').toString()).toBe('(express, 4.0.0)');
  });

  it('should support structural equality via toJSON', () => {
    const t1 = tuple(1, 2);
    const t2 = tuple(1, 2);
    expect(JSON.stringify(t1)).toEqual(JSON.stringify(t2));
  });
});
