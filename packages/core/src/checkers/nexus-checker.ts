import axios, { AxiosError } from 'axios';
import { logger } from '../logger.js';
import { encodePackageName } from './encode-package-name.js';

const REQUEST_TIMEOUT_MS = 10_000;

export function buildNexusTarballUrl(packageName: string, version: string, nexusUrl: string): string {
  const encoded = encodePackageName(packageName);
  const shortName = packageName.startsWith('@') ? packageName.split('/')[1] : packageName;
  const encodedShortName = encodeURIComponent(shortName);
  const encodedVersion = encodeURIComponent(version);
  return `${nexusUrl}/${encoded}/-/${encodedShortName}-${encodedVersion}.tgz`;
}

export async function checkNexusAvailability(url: string): Promise<number> {
  try {
    const response = await axios.head(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return response.status;
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      return error.response?.status ?? 0;
    }
    logger.error('[NexusChecker] unexpected error:', error, { url });
    return 0;
  }
}
