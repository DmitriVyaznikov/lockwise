import { cosmiconfig } from 'cosmiconfig';
import type { Result } from './fp/result.js';
import { ok, err } from './fp/result.js';
import type { LockwiseConfig } from './domain/report.js';
import { DEFAULT_CONFIG } from './domain/report.js';
import type { LockwiseError } from './domain/errors.js';
import { validationError } from './domain/errors.js';

export async function loadConfig(cwd?: string): Promise<Result<LockwiseConfig, LockwiseError>> {
  try {
    const explorer = cosmiconfig('lockwise', {
      searchStrategy: 'global',
    });

    const result = await explorer.search(cwd);

    if (!result || result.isEmpty) {
      return ok({ ...DEFAULT_CONFIG });
    }

    return ok({ ...DEFAULT_CONFIG, ...result.config });
  } catch (error) {
    return err(validationError(
      'config',
      error instanceof Error ? error.message : String(error),
    ));
  }
}
