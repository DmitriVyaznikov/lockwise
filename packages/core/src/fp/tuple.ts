export interface Tuple<A, B> {
  readonly _tag: 'Tuple';
  readonly _fst: A;
  readonly _snd: B;
  toString(): string;
  toJSON(): [A, B];
}

export function tuple<A, B>(a: A, b: B): Tuple<A, B> {
  return {
    _tag: 'Tuple',
    _fst: a,
    _snd: b,
    toString: () => `(${String(a)}, ${String(b)})`,
    toJSON: () => [a, b],
  };
}

export function fst<A, B>(t: Tuple<A, B>): A {
  return t._fst;
}

export function snd<A, B>(t: Tuple<A, B>): B {
  return t._snd;
}

export function mapFst<A, C, B>(fn: (a: A) => C): (t: Tuple<A, B>) => Tuple<C, B> {
  return (t) => tuple(fn(t._fst), t._snd);
}

export function mapSnd<A, B, C>(fn: (b: B) => C): (t: Tuple<A, B>) => Tuple<A, C> {
  return (t) => tuple(t._fst, fn(t._snd));
}

export function bimap<A, B, C, D>(
  fnA: (a: A) => C,
  fnB: (b: B) => D,
): (t: Tuple<A, B>) => Tuple<C, D> {
  return (t) => tuple(fnA(t._fst), fnB(t._snd));
}
