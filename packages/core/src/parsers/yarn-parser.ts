import type { ParsedLockfile, PackageEntry, RawPackageData } from '../types.js';
import type { LockfileParser } from './types.js';
// @ts-expect-error -- @yarnpkg/lockfile has no type declarations
import * as lockfile from '@yarnpkg/lockfile';

const MAX_LOCKFILE_SIZE = 50 * 1024 * 1024;

interface YarnLockEntry {
  readonly version: string;
  readonly resolved?: string;
  readonly dependencies?: Record<string, string>;
}

function extractPackageName(key: string): string {
  // Keys come as "name@range" or "@scope/name@range"
  // Remove surrounding quotes if present
  const cleaned = key.replace(/^"|"$/g, '');

  // For scoped packages: @scope/name@range → find the last @ that isn't at position 0
  if (cleaned.startsWith('@')) {
    const afterScope = cleaned.indexOf('/', 1);
    if (afterScope !== -1) {
      const atIndex = cleaned.indexOf('@', afterScope + 1);
      if (atIndex !== -1) return cleaned.slice(0, atIndex);
    }
    return cleaned;
  }

  // For regular packages: name@range
  const atIndex = cleaned.indexOf('@');
  if (atIndex > 0) return cleaned.slice(0, atIndex);
  return cleaned;
}

export const yarnParser: LockfileParser = {
  canParse(content: string): boolean {
    return content.includes('# yarn lockfile v1');
  },

  parse(content: string): ParsedLockfile {
    if (content.length > MAX_LOCKFILE_SIZE) {
      throw new Error(`Lockfile size (${content.length} bytes) exceeds maximum allowed size (${MAX_LOCKFILE_SIZE} bytes).`);
    }
    const parsed = lockfile.parse(content) as { type: string; object: Record<string, YarnLockEntry> };
    const entries = parsed.object;
    const rawPackages: Record<string, RawPackageData> = {};
    const seen = new Set<string>();
    const packages: PackageEntry[] = [];

    for (const [key, details] of Object.entries(entries)) {
      const name = extractPackageName(key);
      const dedupeKey = `${name}@${details.version}`;

      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      packages.push({
        name,
        version: details.version,
        ...(details.resolved ? { resolved: details.resolved } : {}),
        ...(details.dependencies ? { dependencies: details.dependencies } : {}),
      });

      rawPackages[key] = {
        version: details.version,
        ...(details.resolved ? { resolved: details.resolved } : {}),
        ...(details.dependencies ? { dependencies: details.dependencies } : {}),
      };
    }

    return { type: 'yarn', packages, rawPackages };
  },
};
