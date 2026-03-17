import axios from 'axios';

export interface RegistryData {
  name: string;
  versions: Record<string, Record<string, unknown>>;
  time: Record<string, string>;
}

export interface RegistryFetcher {
  fetch(packageName: string): Promise<RegistryData | null>;
}

export function createRegistryFetcher(registryUrl: string): RegistryFetcher {
  const cache = new Map<string, RegistryData>();
  return {
    async fetch(packageName: string): Promise<RegistryData | null> {
      if (cache.has(packageName)) return cache.get(packageName)!;
      try {
        const { data } = await axios.get<RegistryData>(`${registryUrl}/${packageName}`);
        cache.set(packageName, data);
        return data;
      } catch {
        return null;
      }
    },
  };
}
