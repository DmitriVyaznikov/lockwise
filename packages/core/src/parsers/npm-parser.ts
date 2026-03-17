import type { ParsedLockfile, PackageEntry, RawPackageData } from '../types.js';
import type { LockfileParser } from './types.js';

interface NpmLockfileJson {
  readonly lockfileVersion?: number;
  readonly packages?: Record<string, NpmRawEntry>;
}

interface NpmRawEntry {
  readonly version?: string;
  readonly resolved?: string;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
}

function extractPackageName(key: string): string | null {
  const match = key.match(/node_modules\/(.+)$/);
  if (!match) return null;
  const raw = match[1];
  const lastModules = raw.lastIndexOf('node_modules/');
  if (lastModules !== -1) {
    return raw.slice(lastModules + 'node_modules/'.length);
  }
  return raw;
}

export const npmParser: LockfileParser = {
  canParse(content: string): boolean {
    try {
      const data = JSON.parse(content) as NpmLockfileJson;
      return typeof data.lockfileVersion === 'number' && data.lockfileVersion >= 2;
    } catch {
      return false;
    }
  },

  parse(content: string): ParsedLockfile {
    const data = JSON.parse(content) as NpmLockfileJson;
    const rawEntries = data.packages ?? {};
    const rawPackages: Record<string, RawPackageData> = {};
    const packages: PackageEntry[] = [];

    for (const [key, details] of Object.entries(rawEntries)) {
      rawPackages[key] = {
        version: details.version,
        ...(details.resolved ? { resolved: details.resolved } : {}),
        ...(details.dependencies ? { dependencies: details.dependencies } : {}),
        ...(details.devDependencies ? { devDependencies: details.devDependencies } : {}),
        ...(details.peerDependencies ? { peerDependencies: details.peerDependencies } : {}),
      };

      if (key === '') continue;
      const name = extractPackageName(key);
      if (!name) continue;
      if (typeof details.version !== 'string') continue;

      packages.push({
        name,
        version: details.version,
        ...(details.resolved ? { resolved: details.resolved } : {}),
        ...(details.dependencies ? { dependencies: details.dependencies } : {}),
        ...(details.devDependencies ? { devDependencies: details.devDependencies } : {}),
        ...(details.peerDependencies ? { peerDependencies: details.peerDependencies } : {}),
      });
    }

    return { type: 'npm', packages, rawPackages };
  },
};
