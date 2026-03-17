import { CONFIG_DEFAULTS } from '@lockwise/core';
import type { LockwiseConfig } from '@lockwise/core';

export interface ResolveConfigOptions {
  readonly nexusUrl?: string;
}

export function resolveConfig(cliOptions: ResolveConfigOptions): LockwiseConfig {
  const nexusUrl = cliOptions.nexusUrl ?? process.env.LOCKWISE_NEXUS_URL;

  if (!nexusUrl) {
    throw new Error(
      'Nexus URL is required. Provide it via --nexus-url flag or LOCKWISE_NEXUS_URL env var.',
    );
  }

  const publicRegistry =
    process.env.LOCKWISE_PUBLIC_REGISTRY ?? CONFIG_DEFAULTS.publicRegistry;

  const minAgeDaysRaw = process.env.LOCKWISE_MIN_AGE_DAYS;
  const minAgeDaysParsed = minAgeDaysRaw ? Number(minAgeDaysRaw) : NaN;
  const minAgeDays = Number.isFinite(minAgeDaysParsed)
    ? minAgeDaysParsed
    : CONFIG_DEFAULTS.minAgeDays;

  const outputDir =
    process.env.LOCKWISE_OUTPUT_DIR ?? CONFIG_DEFAULTS.outputDir;

  return { nexusUrl, publicRegistry, minAgeDays, outputDir };
}
