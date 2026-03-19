import { DEFAULT_CONFIG } from '@lockwise/core';
import type { LockwiseConfig } from '@lockwise/core';
import { isValidHttpUrl } from './validation.js';

export interface CliConfig extends LockwiseConfig {
  readonly outputDir: string;
  readonly servePort: number;
  readonly uiPort: number;
}

export const CLI_DEFAULTS = {
  outputDir: '.lockwise',
  servePort: 3001,
  uiPort: 3000,
} as const;

function sanitizeUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    return '<invalid-url>';
  }
}

export interface ResolveConfigOptions {
  readonly nexusUrl?: string;
}

export function resolveConfig(cliOptions: ResolveConfigOptions): CliConfig {
  const nexusUrl = cliOptions.nexusUrl ?? process.env.LOCKWISE_NEXUS_URL;

  if (!nexusUrl) {
    throw new Error(
      'Nexus URL is required. Provide it via --nexus-url flag or LOCKWISE_NEXUS_URL env var.',
    );
  }

  if (!isValidHttpUrl(nexusUrl)) {
    throw new Error(`Invalid Nexus URL "${sanitizeUrl(nexusUrl)}". Must be a valid HTTP or HTTPS URL.`);
  }

  const publicRegistry =
    process.env.LOCKWISE_PUBLIC_REGISTRY ?? DEFAULT_CONFIG.publicRegistry;

  if (!isValidHttpUrl(publicRegistry)) {
    throw new Error(`Invalid public registry URL "${sanitizeUrl(publicRegistry)}". Must be a valid HTTP or HTTPS URL.`);
  }

  const minAgeDaysRaw = process.env.LOCKWISE_MIN_AGE_DAYS;
  const minAgeDaysParsed = minAgeDaysRaw ? Number(minAgeDaysRaw) : NaN;
  const minAgeDays = Number.isFinite(minAgeDaysParsed) && minAgeDaysParsed >= 0
    ? minAgeDaysParsed
    : DEFAULT_CONFIG.minAgeDays;

  const outputDir =
    process.env.LOCKWISE_OUTPUT_DIR ?? CLI_DEFAULTS.outputDir;

  return {
    nexusUrl,
    publicRegistry,
    minAgeDays,
    outputDir,
    servePort: CLI_DEFAULTS.servePort,
    uiPort: CLI_DEFAULTS.uiPort,
  };
}
