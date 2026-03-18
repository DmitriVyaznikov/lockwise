import type { ParsedLockfile, PackageEntry, RawPackageData } from '../types.js';
import type { LockfileParser } from './types.js';

const MAX_LOCKFILE_SIZE = 50 * 1024 * 1024;

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
    return content.trimStart().startsWith('{') && content.includes('"lockfileVersion"');
  },

  parse(content: string): ParsedLockfile {
    if (content.length > MAX_LOCKFILE_SIZE) {
      throw new Error(`Lockfile size (${content.length} bytes) exceeds maximum allowed size (${MAX_LOCKFILE_SIZE} bytes).`);
    }
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
