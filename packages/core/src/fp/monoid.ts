export interface Monoid<T> {
  readonly empty: T;
  readonly concat: (a: T, b: T) => T;
}

export function fold<T>(monoid: Monoid<T>): (items: T[]) => T {
  return (items) => items.reduce(monoid.concat, monoid.empty);
}

export function concatAll<T>(monoid: Monoid<T>): (...items: T[]) => T {
  return (...items) => items.reduce(monoid.concat, monoid.empty);
}
