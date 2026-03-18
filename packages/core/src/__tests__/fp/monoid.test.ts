import { describe, it, expect } from 'vitest';
import { type Monoid, fold, concatAll } from '../../fp/monoid.js';

describe('Monoid', () => {
  const sumMonoid: Monoid<number> = { empty: 0, concat: (a, b) => a + b };
  const productMonoid: Monoid<number> = { empty: 1, concat: (a, b) => a * b };
  const arrayMonoid: Monoid<number[]> = { empty: [], concat: (a, b) => [...a, ...b] };

  describe('fold', () => {
    it('should fold numbers with sum monoid', () => {
      expect(fold(sumMonoid)([1, 2, 3, 4])).toBe(10);
    });

    it('should return empty for empty array', () => {
      expect(fold(sumMonoid)([])).toBe(0);
    });

    it('should fold with product monoid', () => {
      expect(fold(productMonoid)([2, 3, 4])).toBe(24);
    });

    it('should fold arrays with concat', () => {
      expect(fold(arrayMonoid)([[1, 2], [3], [4, 5]])).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('concatAll', () => {
    it('should concat two values', () => {
      expect(concatAll(sumMonoid)(1, 2)).toBe(3);
    });

    it('should concat multiple values', () => {
      expect(concatAll(sumMonoid)(1, 2, 3)).toBe(6);
    });
  });
});
