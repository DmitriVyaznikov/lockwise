import type { ParsedLockfile, PackageEntry, RawPackageData } from '../types.js';
import type { LockfileParser } from './types.js';
import YAML from 'yaml';

interface PnpmLockfile {
  readonly lockfileVersion: string;
  readonly packages?: Record<string, PnpmPackageEntry>;
}

interface PnpmPackageEntry {
  readonly resolution?: { integrity?: string; tarball?: string };
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
}

function parsePackageKey(key: string): { name: string; version: string } | null {
  // Format: "name@version" or "@scope/name@version"
  if (key.startsWith('@')) {
    const slashIndex = key.indexOf('/', 1);
    if (slashIndex === -1) return null;
    const atIndex = key.indexOf('@', slashIndex + 1);
    if (atIndex === -1) return null;
    return { name: key.slice(0, atIndex), version: key.slice(atIndex + 1) };
  }

  const atIndex = key.indexOf('@');
  if (atIndex <= 0) return null;
  return { name: key.slice(0, atIndex), version: key.slice(atIndex + 1) };
}

export class PnpmParser implements LockfileParser {
  canParse(content: string): boolean {
    return !content.trimStart().startsWith('{') && content.includes('lockfileVersion:');
  }

  parse(content: string): ParsedLockfile {
    const data = YAML.parse(content) as PnpmLockfile;
    const rawPackages: Record<string, RawPackageData> = {};
    const packages: PackageEntry[] = [];

    if (!data.packages) {
      return { type: 'pnpm', packages, rawPackages };
    }

    for (const [key, details] of Object.entries(data.packages)) {
      const parsed = parsePackageKey(key);
      if (!parsed) continue;

      const entry: PackageEntry = {
        name: parsed.name,
        version: parsed.version,
        ...(details.dependencies ? { dependencies: details.dependencies } : {}),
        ...(details.devDependencies ? { devDependencies: details.devDependencies } : {}),
        ...(details.peerDependencies ? { peerDependencies: details.peerDependencies } : {}),
      };
      packages.push(entry);

      rawPackages[key] = {
        version: parsed.version,
        ...(details.dependencies ? { dependencies: details.dependencies } : {}),
        ...(details.devDependencies ? { devDependencies: details.devDependencies } : {}),
        ...(details.peerDependencies ? { peerDependencies: details.peerDependencies } : {}),
      };
    }

    return { type: 'pnpm', packages, rawPackages };
  }
}
