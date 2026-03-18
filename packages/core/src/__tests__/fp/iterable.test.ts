import { describe, it, expect } from 'vitest';
import { Iter } from '../../fp/iterable.js';

describe('Iter', () => {
  describe('from', () => {
    it('should create from array', () => {
      expect(Iter.from([1, 2, 3]).toArray()).toEqual([1, 2, 3]);
    });

    it('should create from generator', () => {
      function* gen() { yield 1; yield 2; yield 3; }
      expect(Iter.from(gen()).toArray()).toEqual([1, 2, 3]);
    });
  });

  describe('map', () => {
    it('should lazily transform elements', () => {
      const calls: number[] = [];
      const result = Iter.from([1, 2, 3])
        .map(x => { calls.push(x); return x * 2; })
        .take(2)
        .toArray();
      expect(result).toEqual([2, 4]);
      expect(calls).toEqual([1, 2]);
    });
  });

  describe('filter', () => {
    it('should lazily filter elements', () => {
      const result = Iter.from([1, 2, 3, 4, 5])
        .filter(x => x % 2 === 0)
        .toArray();
      expect(result).toEqual([2, 4]);
    });
  });

  describe('take', () => {
    it('should take first n elements', () => {
      expect(Iter.from([1, 2, 3, 4, 5]).take(3).toArray()).toEqual([1, 2, 3]);
    });

    it('should handle take more than available', () => {
      expect(Iter.from([1, 2]).take(5).toArray()).toEqual([1, 2]);
    });
  });

  describe('flatMap', () => {
    it('should flatten mapped iterables', () => {
      const result = Iter.from([1, 2, 3])
        .flatMap(x => [x, x * 10])
        .toArray();
      expect(result).toEqual([1, 10, 2, 20, 3, 30]);
    });
  });

  describe('fold', () => {
    it('should reduce to single value', () => {
      const sum = Iter.from([1, 2, 3, 4]).fold(0, (acc, x) => acc + x);
      expect(sum).toBe(10);
    });
  });

  describe('forEach', () => {
    it('should execute side-effect for each element', () => {
      const items: number[] = [];
      Iter.from([1, 2, 3]).forEach(x => items.push(x));
      expect(items).toEqual([1, 2, 3]);
    });
  });

  describe('groupBy', () => {
    it('should group elements by key function', () => {
      const result = Iter.from([1, 2, 3, 4, 5, 6])
        .groupBy(x => x % 2 === 0 ? 'even' : 'odd');
      expect(result).toEqual({ even: [2, 4, 6], odd: [1, 3, 5] });
    });
  });

  describe('chaining', () => {
    it('should compose operations lazily', () => {
      const result = Iter.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        .filter(x => x % 2 === 0)
        .map(x => x * x)
        .take(3)
        .toArray();
      expect(result).toEqual([4, 16, 36]);
    });
  });
});
