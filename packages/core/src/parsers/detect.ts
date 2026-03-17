import type { ParsedLockfile } from '../types.js';
import type { LockfileParser } from './types.js';
import { npmParser } from './npm-parser.js';
import { yarnParser } from './yarn-parser.js';
import { pnpmParser } from './pnpm-parser.js';

const PARSERS: LockfileParser[] = [npmParser, yarnParser, pnpmParser];

export function detectAndParse(content: string): ParsedLockfile | null {
  for (const parser of PARSERS) {
    if (parser.canParse(content)) return parser.parse(content);
  }
  return null;
}
