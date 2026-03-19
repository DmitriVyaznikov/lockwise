import axios from 'axios';
import type { Result } from '../fp/result.js';
import { ok, err } from '../fp/result.js';
import { registryError } from '../domain/errors.js';
import type { LockwiseError } from '../domain/errors.js';
import { logger } from '../logger.js';
import { encodePackageName } from './encode-package-name.js';

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_SIZE = 50 * 1024 * 1024;
const MAX_CACHE_SIZE = 5000;

export interface RegistryData {
  readonly name: string;
  readonly versions: Readonly<Record<string, Record<string, unknown>>>;
  readonly time: Readonly<Record<string, string>>;
}

function isValidRegistryData(data: unknown): data is RegistryData {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.versions === 'object' && obj.versions !== null &&
    typeof obj.time === 'object' && obj.time !== null
  );
}

export function createRegistryFetcher(registryUrl: string): {
  fetch(packageName: string): Promise<Result<RegistryData, LockwiseError>>;
} {
  const cache = new Map<string, Result<RegistryData, LockwiseError>>();
  const inFlight = new Map<string, Promise<Result<RegistryData, LockwiseError>>>();

  return {
    async fetch(packageName: string): Promise<Result<RegistryData, LockwiseError>> {
      if (cache.has(packageName)) return cache.get(packageName)!;
      if (inFlight.has(packageName)) return inFlight.get(packageName)!;

      const promise = axios
        .get<RegistryData>(`${registryUrl}/${encodePackageName(packageName)}`, {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          maxContentLength: MAX_RESPONSE_SIZE,
          maxBodyLength: MAX_RESPONSE_SIZE,
        })
        .then(({ data }): Result<RegistryData, LockwiseError> => {
          if (!isValidRegistryData(data)) {
            const result = err(registryError(packageName, new Error('Invalid response shape')));
            cache.set(packageName, result);
            return result;
          }
          if (cache.size >= MAX_CACHE_SIZE) {
            const oldest = cache.keys().next().value;
            if (oldest !== undefined) cache.delete(oldest);
          }
          const result = ok(data);
          cache.set(packageName, result);
          return result;
        })
        .catch((error): Result<RegistryData, LockwiseError> => {
          logger.error('[RegistryFetcher] failed:', error, { packageName });
          const result = err(registryError(packageName, error instanceof Error ? error : new Error(String(error))));
          cache.set(packageName, result);
          return result;
        })
        .finally(() => {
          inFlight.delete(packageName);
        });

      inFlight.set(packageName, promise);
      return promise;
    },
  };
}
