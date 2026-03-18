import { describe, it, expect } from 'vitest';
import { curry } from '../../fp/curry.js';

describe('curry', () => {
  it('should curry a 2-argument function', () => {
    const add = curry((a: number, b: number) => a + b);
    expect(add(1, 2)).toBe(3);
    expect(add(1)(2)).toBe(3);
  });

  it('should curry a 3-argument function', () => {
    const add3 = curry((a: number, b: number, c: number) => a + b + c);
    expect(add3(1, 2, 3)).toBe(6);
    expect(add3(1)(2)(3)).toBe(6);
    expect(add3(1, 2)(3)).toBe(6);
    expect(add3(1)(2, 3)).toBe(6);
  });

  it('should curry a 4-argument function', () => {
    const concat = curry((a: string, b: string, c: string, d: string) => a + b + c + d);
    expect(concat('a')('b')('c')('d')).toBe('abcd');
    expect(concat('a', 'b')('c', 'd')).toBe('abcd');
    expect(concat('a', 'b', 'c', 'd')).toBe('abcd');
  });

  it('should return value immediately for 0-argument function', () => {
    const fn = curry(() => 42);
    expect(fn()).toBe(42);
  });

  it('should return value immediately for 1-argument function', () => {
    const double = curry((x: number) => x * 2);
    expect(double(21)).toBe(42);
  });

  it('should preserve this context', () => {
    const fn = curry(function (this: { base: number }, x: number) {
      return this.base + x;
    });
    const obj = { base: 40, fn };
    expect(obj.fn(2)).toBe(42);
  });
});
