import type { ParsedLockfile } from '../types.js';

export interface LockfileParser {
  parse(content: string): ParsedLockfile;
  canParse(content: string): boolean;
}
