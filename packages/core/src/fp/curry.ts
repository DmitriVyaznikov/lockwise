/* eslint-disable @typescript-eslint/no-explicit-any */

export function curry<A, R>(fn: (a: A) => R): (a: A) => R;
export function curry<A, B, R>(fn: (a: A, b: B) => R): {
  (a: A, b: B): R;
  (a: A): (b: B) => R;
};
export function curry<A, B, C, R>(fn: (a: A, b: B, c: C) => R): {
  (a: A, b: B, c: C): R;
  (a: A, b: B): (c: C) => R;
  (a: A): { (b: B, c: C): R; (b: B): (c: C) => R };
};
export function curry<A, B, C, D, R>(fn: (a: A, b: B, c: C, d: D) => R): {
  (a: A, b: B, c: C, d: D): R;
  (a: A, b: B, c: C): (d: D) => R;
  (a: A, b: B): { (c: C, d: D): R; (c: C): (d: D) => R };
  (a: A): { (b: B, c: C, d: D): R; (b: B, c: C): (d: D) => R; (b: B): { (c: C, d: D): R; (c: C): (d: D) => R } };
};
export function curry(fn: (...args: any[]) => any): any {
  const arity = fn.length;
  if (arity === 0) return fn;

  function curried(this: unknown, ...args: any[]): any {
    if (args.length >= arity) {
      return fn.apply(this, args);
    }
    return function (this: unknown, ...moreArgs: any[]) {
      return curried.apply(this, [...args, ...moreArgs]);
    };
  }

  return curried;
}
