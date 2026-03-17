import axios from 'axios';
import { logger } from '../logger.js';

const REQUEST_TIMEOUT_MS = 15_000;

export interface RegistryData {
  readonly name: string;
  readonly versions: Readonly<Record<string, Record<string, unknown>>>;
  readonly time: Readonly<Record<string, string>>;
}

export interface RegistryFetcher {
  fetch(packageName: string): Promise<RegistryData | null>;
}

export function createRegistryFetcher(registryUrl: string): RegistryFetcher {
  const cache = new Map<string, RegistryData>();
  const inFlight = new Map<string, Promise<RegistryData | null>>();

  return {
    async fetch(packageName: string): Promise<RegistryData | null> {
      if (cache.has(packageName)) return cache.get(packageName)!;
      if (inFlight.has(packageName)) return inFlight.get(packageName)!;

      const promise = axios
        .get<RegistryData>(`${registryUrl}/${packageName}`, {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
        .then(({ data }) => {
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
