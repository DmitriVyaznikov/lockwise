export interface Ok<T> {
  readonly _tag: 'Ok';
  readonly value: T;
}

export interface Err<E> {
  readonly _tag: 'Err';
  readonly error: E;
}

export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T>(value: T): Result<T, never> {
  return { _tag: 'Ok', value };
}

export function err<E>(error: E): Result<never, E> {
  return { _tag: 'Err', error };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result._tag === 'Ok';
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result._tag === 'Err';
}

export function map<T, U, E>(fn: (value: T) => U): (result: Result<T, E>) => Result<U, E> {
  return (result) => isOk(result) ? ok(fn(result.value)) : result;
}

export function flatMap<T, U, E>(fn: (value: T) => Result<U, E>): (result: Result<T, E>) => Result<U, E> {
  return (result) => isOk(result) ? fn(result.value) : result;
}

export function mapError<T, E, F>(fn: (error: E) => F): (result: Result<T, E>) => Result<T, F> {
  return (result) => isErr(result) ? err(fn(result.error)) : (result as unknown as Result<T, F>);
}

export function unwrapOr<T>(defaultValue: T): <E>(result: Result<T, E>) => T {
  return (result) => isOk(result) ? result.value : defaultValue;
}

export function match<T, E, U>(handlers: {
  ok: (value: T) => U;
  err: (error: E) => U;
}): (result: Result<T, E>) => U {
  return (result) => isOk(result) ? handlers.ok(result.value) : handlers.err(result.error);
}

export function tap<T, E>(fn: (value: T) => void): (result: Result<T, E>) => Result<T, E> {
  return (result) => {
    if (isOk(result)) fn(result.value);
    return result;
  };
}

export function tapError<T, E>(fn: (error: E) => void): (result: Result<T, E>) => Result<T, E> {
  return (result) => {
    if (isErr(result)) fn(result.error);
    return result;
  };
}

export function all<T, E>(results: Result<T, E>[]): Result<T[], E[]> {
  const values: T[] = [];
  const errors: E[] = [];
  for (const r of results) {
    if (isOk(r)) values.push(r.value);
    else errors.push(r.error);
  }
  return errors.length > 0 ? err(errors) : ok(values);
}

export async function fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
  try {
    return ok(await promise);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

export function fromNullable<E>(error: E): <T>(value: T | null | undefined) => Result<T, E> {
  return (value) => value != null ? ok(value as NonNullable<typeof value>) : err(error);
}
