import { type Result, ok, err } from './result.js';

export interface Some<T> {
  readonly _tag: 'Some';
  readonly value: T;
}

export interface None {
  readonly _tag: 'None';
}

export type Maybe<T> = Some<T> | None;

export const none: Maybe<never> = { _tag: 'None' };

export function some<T>(value: T): Maybe<T> {
  return { _tag: 'Some', value };
}

export function isSome<T>(m: Maybe<T>): m is Some<T> {
  return m._tag === 'Some';
}

export function isNone<T>(m: Maybe<T>): m is None {
  return m._tag === 'None';
}

export function map<T, U>(fn: (value: T) => U): (m: Maybe<T>) => Maybe<U> {
  return (m) => isSome(m) ? some(fn(m.value)) : none;
}

export function flatMap<T, U>(fn: (value: T) => Maybe<U>): (m: Maybe<T>) => Maybe<U> {
  return (m) => isSome(m) ? fn(m.value) : none;
}

export function unwrapOr<T>(defaultValue: T): (m: Maybe<T>) => T {
  return (m) => isSome(m) ? m.value : defaultValue;
}

export function match<T, U>(handlers: {
  some: (value: T) => U;
  none: () => U;
}): (m: Maybe<T>) => U {
  return (m) => isSome(m) ? handlers.some(m.value) : handlers.none();
}

export function fromNullable<T>(value: T | null | undefined): Maybe<T> {
  return value != null ? some(value as NonNullable<typeof value>) : none;
}

export function toResult<E>(error: E): <T>(m: Maybe<T>) => Result<T, E> {
  return (m) => isSome(m) ? ok(m.value) : err(error);
}
