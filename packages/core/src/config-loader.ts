import { cosmiconfig } from 'cosmiconfig';
import type { LockwiseConfig } from './types.js';
import { DEFAULT_CONFIG } from './types.js';

/**
 * Loads Lockwise configuration using cosmiconfig.
 *
 * Search paths (in order):
 * - lockwise.config.ts / .js / .cjs / .mjs
 * - .lockwiserc / .lockwiserc.json / .lockwiserc.yaml / .lockwiserc.yml
 * - .lockwiserc.js / .lockwiserc.cjs / .lockwiserc.mjs
 * - package.json#lockwise
 *
 * Missing fields are filled from DEFAULT_CONFIG.
 */
export async function loadConfig(cwd?: string): Promise<LockwiseConfig> {
  const explorer = cosmiconfig('lockwise', {
    searchStrategy: 'global',
  });

  const result = await explorer.search(cwd);

  if (!result || result.isEmpty) {
    return { ...DEFAULT_CONFIG };
  }

  return { ...DEFAULT_CONFIG, ...result.config };
}
