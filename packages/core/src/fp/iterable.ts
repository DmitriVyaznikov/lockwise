function lazy<T>(factory: () => Iterator<T>): Iterable<T> {
  return { [Symbol.iterator]: factory };
}

export class Iter<T> {
  private constructor(private readonly source: Iterable<T>) {}

  static from<T>(source: Iterable<T>): Iter<T> {
    return new Iter(source);
  }

  map<U>(fn: (value: T) => U): Iter<U> {
    const source = this.source;
    return new Iter(lazy(function* () {
      for (const item of source) {
        yield fn(item);
      }
    }));
  }

  filter(predicate: (value: T) => boolean): Iter<T> {
    const source = this.source;
    return new Iter(lazy(function* () {
      for (const item of source) {
        if (predicate(item)) yield item;
      }
    }));
  }

  take(n: number): Iter<T> {
    const source = this.source;
    return new Iter(lazy(function* () {
      let count = 0;
      for (const item of source) {
        yield item;
        if (++count >= n) break;
      }
    }));
  }

  flatMap<U>(fn: (value: T) => Iterable<U>): Iter<U> {
    const source = this.source;
    return new Iter(lazy(function* () {
      for (const item of source) {
        yield* fn(item);
      }
    }));
  }

  fold<U>(initial: U, fn: (acc: U, value: T) => U): U {
    let acc = initial;
    for (const item of this.source) {
      acc = fn(acc, item);
    }
    return acc;
  }

  forEach(fn: (value: T) => void): void {
    for (const item of this.source) {
      fn(item);
    }
  }

  groupBy(fn: (value: T) => string): Record<string, T[]> {
    const result: Record<string, T[]> = {};
    for (const item of this.source) {
      const key = fn(item);
      (result[key] ??= []).push(item);
    }
    return result;
  }

  toArray(): T[] {
    return [...this.source];
  }

  *[Symbol.iterator](): Iterator<T> {
    yield* this.source;
  }
}
