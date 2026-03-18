import { loadConfig } from '@lockwise/core';
import type { LockwiseConfig } from '@lockwise/core';

export async function resolveConfigFromFile(): Promise<LockwiseConfig> {
  return loadConfig();
}

export async function printConfig(): Promise<void> {
  const config = await resolveConfigFromFile();
  console.log(JSON.stringify(config, null, 2));
}
