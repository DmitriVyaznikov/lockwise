import axios from 'axios';
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

export interface RegistryFetcher {
  fetch(packageName: string): Promise<RegistryData | null>;
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

export function createRegistryFetcher(registryUrl: string): RegistryFetcher {
  const cache = new Map<string, RegistryData>();
  const inFlight = new Map<string, Promise<RegistryData | null>>();

  return {
    async fetch(packageName: string): Promise<RegistryData | null> {
      if (cache.has(packageName)) return cache.get(packageName)!;
      if (inFlight.has(packageName)) return inFlight.get(packageName)!;

      const promise = axios
        .get<RegistryData>(`${registryUrl}/${encodePackageName(packageName)}`, {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          maxContentLength: MAX_RESPONSE_SIZE,
          maxBodyLength: MAX_RESPONSE_SIZE,
        })
        .then(({ data }) => {
          if (!isValidRegistryData(data)) {
            logger.error('[RegistryFetcher] invalid response shape', { packageName });
            return null;
          }
          if (cache.size >= MAX_CACHE_SIZE) {
            const oldest = cache.keys().next().value;
            if (oldest !== undefined) cache.delete(oldest);
          }
          cache.set(packageName, data);
          return data;
        })
        .catch((error): null => {
          logger.error('[RegistryFetcher] failed:', error, { packageName });
          return null;
        })
        .finally(() => {
          inFlight.delete(packageName);
        });

      inFlight.set(packageName, promise);
      return promise;
    },
  };
}
