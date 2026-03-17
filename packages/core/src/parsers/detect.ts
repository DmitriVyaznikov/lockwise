import type { ParsedLockfile } from '../types.js';
import type { LockfileParser } from './types.js';
import { NpmParser } from './npm-parser.js';
import { YarnParser } from './yarn-parser.js';
import { PnpmParser } from './pnpm-parser.js';

const PARSERS: LockfileParser[] = [new NpmParser(), new YarnParser(), new PnpmParser()];

export function detectAndParse(content: string): ParsedLockfile {
  for (const parser of PARSERS) {
    if (parser.canParse(content)) return parser.parse(content);
  }
  throw new Error('Unsupported lockfile format');
}
