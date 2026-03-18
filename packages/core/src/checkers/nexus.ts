import axios, { AxiosError } from 'axios';
import type { Result } from '../fp/result.js';
import { ok, err } from '../fp/result.js';
import { nexusError } from '../domain/errors.js';
import type { LockwiseError } from '../domain/errors.js';
import { encodePackageName } from './encode-package-name.js';

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;

export function buildNexusTarballUrl(packageName: string, version: string, nexusUrl: string): string {
  const encoded = encodePackageName(packageName);
  const shortName = packageName.startsWith('@') ? packageName.split('/')[1] : packageName;
  const encodedShortName = encodeURIComponent(shortName);
  const encodedVersion = encodeURIComponent(version);
  return `${nexusUrl}/${encoded}/-/${encodedShortName}-${encodedVersion}.tgz`;
}

export async function checkNexusAvailability(url: string): Promise<Result<number, LockwiseError>> {
  try {
    const response = await axios.head(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      maxContentLength: MAX_RESPONSE_SIZE,
    });
    return ok(response.status);
  } catch (error: unknown) {
    if (error instanceof AxiosError && error.response?.status) {
      return ok(error.response.status);
    }
    return err(nexusError(url, 0));
  }
}

export function createNexusChecker(nexusUrl: string): (name: string, version: string) => Promise<Result<number, LockwiseError>> {
  return (name, version) => {
    const url = buildNexusTarballUrl(name, version, nexusUrl);
    return checkNexusAvailability(url);
  };
}
