import { CONFIG_DEFAULTS } from '@lockwise/core';
import type { LockwiseConfig } from '@lockwise/core';
import { isValidHttpUrl } from './validation.js';

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

  if (!isValidHttpUrl(nexusUrl)) {
    throw new Error(`Invalid Nexus URL "${nexusUrl}". Must be a valid HTTP or HTTPS URL.`);
  }

  const publicRegistry =
    process.env.LOCKWISE_PUBLIC_REGISTRY ?? CONFIG_DEFAULTS.publicRegistry;

  if (!isValidHttpUrl(publicRegistry)) {
    throw new Error(`Invalid public registry URL "${publicRegistry}". Must be a valid HTTP or HTTPS URL.`);
  }

  const minAgeDaysRaw = process.env.LOCKWISE_MIN_AGE_DAYS;
  const minAgeDaysParsed = minAgeDaysRaw ? Number(minAgeDaysRaw) : NaN;
  const minAgeDays = Number.isFinite(minAgeDaysParsed) && minAgeDaysParsed >= 0
    ? minAgeDaysParsed
    : CONFIG_DEFAULTS.minAgeDays;

  const outputDir =
    process.env.LOCKWISE_OUTPUT_DIR ?? CONFIG_DEFAULTS.outputDir;

  return { nexusUrl, publicRegistry, minAgeDays, outputDir };
}
