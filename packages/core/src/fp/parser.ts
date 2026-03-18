import { type Result, ok, err, isOk } from './result.js';
import { type Maybe, some, none } from './maybe.js';

export interface ParseError {
  readonly expected: string;
  readonly pos: number;
  readonly input: string;
}

export type ParseSuccess<T> = { readonly value: T; readonly pos: number };
export type Parser<T> = (input: string, pos: number) => Result<ParseSuccess<T>, ParseError>;

function success<T>(value: T, pos: number): Result<ParseSuccess<T>, ParseError> {
  return ok({ value, pos });
}

function failure(expected: string, pos: number, input: string): Result<never, ParseError> {
  return err({ expected, pos, input });
}

export function run<T>(parser: Parser<T>, input: string): Result<T, ParseError> {
  const result = parser(input, 0);
  return isOk(result) ? ok(result.value.value) : result;
}

export function literal(str: string): Parser<string> {
  return (input, pos) =>
    input.startsWith(str, pos)
      ? success(str, pos + str.length)
      : failure(`"${str}"`, pos, input);
}

export function regex(re: RegExp): Parser<string> {
  const anchored = new RegExp(`^(?:${re.source})`, re.flags.replace('g', ''));
  return (input, pos) => {
    const match = anchored.exec(input.slice(pos));
    return match
      ? success(match[0], pos + match[0].length)
      : failure(`/${re.source}/`, pos, input);
  };
}

export function char(predicate: (c: string) => boolean): Parser<string> {
  return (input, pos) => {
    const c = input[pos];
    return c !== undefined && predicate(c)
      ? success(c, pos + 1)
      : failure('char', pos, input);
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function seq<T extends any[]>(
  ...parsers: { [K in keyof T]: Parser<T[K]> }
): Parser<T> {
  return (input, pos) => {
    const results: any[] = [];
    let currentPos = pos;
    for (const parser of parsers) {
      const result = parser(input, currentPos);
      if (!isOk(result)) return result;
      results.push(result.value.value);
      currentPos = result.value.pos;
    }
    return success(results as T, currentPos);
  };
}

export function alt<T>(...parsers: Parser<T>[]): Parser<T> {
  return (input, pos) => {
    for (const parser of parsers) {
      const result = parser(input, pos);
      if (isOk(result)) return result;
    }
    return failure('one of alternatives', pos, input);
  };
}

export function many<T>(parser: Parser<T>): Parser<T[]> {
  return (input, pos) => {
    const results: T[] = [];
    let currentPos = pos;
    while (currentPos < input.length) {
      const result = parser(input, currentPos);
      if (!isOk(result)) break;
      results.push(result.value.value);
      currentPos = result.value.pos;
    }
    return success(results, currentPos);
  };
}

export function many1<T>(parser: Parser<T>): Parser<T[]> {
  return (input, pos) => {
    const result = many(parser)(input, pos);
    if (!isOk(result)) return result;
    return result.value.value.length > 0
      ? result
      : failure('at least one', pos, input);
  };
}

export function optional<T>(parser: Parser<T>): Parser<Maybe<T>> {
  return (input, pos) => {
    const result = parser(input, pos);
    return isOk(result)
      ? success(some(result.value.value), result.value.pos)
      : success(none, pos);
  };
}

export function sepBy<T, S>(parser: Parser<T>, separator: Parser<S>): Parser<T[]> {
  return (input, pos) => {
    const firstResult = parser(input, pos);
    if (!isOk(firstResult)) return success([], pos);

    const results: T[] = [firstResult.value.value];
    let currentPos = firstResult.value.pos;

    while (currentPos < input.length) {
      const sepResult = separator(input, currentPos);
      if (!isOk(sepResult)) break;
      const nextResult = parser(input, sepResult.value.pos);
      if (!isOk(nextResult)) break;
      results.push(nextResult.value.value);
      currentPos = nextResult.value.pos;
    }

    return success(results, currentPos);
  };
}

export function map<T, U>(parser: Parser<T>, fn: (value: T) => U): Parser<U> {
  return (input, pos) => {
    const result = parser(input, pos);
    return isOk(result)
      ? success(fn(result.value.value), result.value.pos)
      : result;
  };
}

export function flatMap<T, U>(parser: Parser<T>, fn: (value: T) => Parser<U>): Parser<U> {
  return (input, pos) => {
    const result = parser(input, pos);
    if (!isOk(result)) return result;
    return fn(result.value.value)(input, result.value.pos);
  };
}

export function between<L, T, R>(left: Parser<L>, content: Parser<T>, right: Parser<R>): Parser<T> {
  return (input, pos) => {
    const leftResult = left(input, pos);
    if (!isOk(leftResult)) return leftResult as Result<never, ParseError>;
    const contentResult = content(input, leftResult.value.pos);
    if (!isOk(contentResult)) return contentResult;
    const rightResult = right(input, contentResult.value.pos);
    if (!isOk(rightResult)) return rightResult as Result<never, ParseError>;
    return success(contentResult.value.value, rightResult.value.pos);
  };
}
