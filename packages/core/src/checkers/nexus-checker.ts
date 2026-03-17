import axios, { AxiosError } from 'axios';
import { logger } from '../logger.js';

const REQUEST_TIMEOUT_MS = 10_000;

export function buildNexusTarballUrl(packageName: string, version: string, nexusUrl: string): string {
  const shortName = packageName.startsWith('@') ? packageName.split('/')[1] : packageName;
  return `${nexusUrl}/${packageName}/-/${shortName}-${version}.tgz`;
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
