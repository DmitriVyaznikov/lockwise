import { loadConfig, isOk } from '@lockwise/core';
import type { LockwiseConfig } from '@lockwise/core';

export async function resolveConfigFromFile(): Promise<LockwiseConfig | null> {
  const result = await loadConfig();
  return isOk(result) ? result.value : null;
}

export async function printConfig(): Promise<void> {
  const config = await resolveConfigFromFile();
  if (config) {
    console.log(JSON.stringify(config, null, 2));
  } else {
    console.error('Failed to load config.');
  }
}
