import type { Result } from '../fp/result.js';
import { err } from '../fp/result.js';
import type { ParsedLockfile } from '../domain/report.js';
import { parseError } from '../domain/errors.js';
import type { LockwiseError } from '../domain/errors.js';
import { npmParser } from './npm.js';
import { yarnParser } from './yarn.js';
import { pnpmParser } from './pnpm.js';

const PARSERS = [npmParser, yarnParser, pnpmParser] as const;

export function detectAndParseFp(content: string): Result<ParsedLockfile, LockwiseError> {
  const parser = PARSERS.find(p => p.canParse(content));
  return parser
    ? parser.parse(content)
    : err(parseError('unknown', 'Unrecognized lockfile format'));
}
