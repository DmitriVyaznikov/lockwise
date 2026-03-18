import { describe, it, expect } from 'vitest';
import { pipe, flow } from '../../fp/pipe.js';
import { ok, map, unwrapOr } from '../../fp/result.js';

describe('pipe', () => {
  it('should return value with no functions', () => {
    expect(pipe(42)).toBe(42);
  });

  it('should apply single function', () => {
    expect(pipe(21, (x: number) => x * 2)).toBe(42);
  });

  it('should apply multiple functions left-to-right', () => {
    const result = pipe(
      '  hello  ',
      (s: string) => s.trim(),
      (s: string) => s.toUpperCase(),
      (s: string) => s.length,
    );
    expect(result).toBe(5);
  });

  it('should work with Result operations', () => {
    const result = pipe(
      ok(10),
      map((x: number) => x + 1),
      map((x: number) => x * 2),
      unwrapOr(0),
    );
    expect(result).toBe(22);
  });
});

describe('flow', () => {
  it('should compose functions into a single function', () => {
    const transform = flow(
      (s: string) => s.trim(),
      (s: string) => s.toUpperCase(),
      (s: string) => s.length,
    );
    expect(transform('  hello  ')).toBe(5);
  });

  it('should compose single function', () => {
    const double = flow((x: number) => x * 2);
    expect(double(21)).toBe(42);
  });
});
