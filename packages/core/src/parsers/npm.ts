import type { Result } from '../fp/result.js';
import { ok, err } from '../fp/result.js';
import type { ParsedLockfile, PackageEntry, RawPackageData } from '../domain/report.js';
import { parseError } from '../domain/errors.js';
import type { LockwiseError } from '../domain/errors.js';
import { pipe } from '../fp/pipe.js';
import { flatMap, map } from '../fp/result.js';

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
  return lastModules !== -1
    ? raw.slice(lastModules + 'node_modules/'.length)
    : raw;
}

function validateSize(content: string): Result<string, LockwiseError> {
  return content.length > MAX_LOCKFILE_SIZE
    ? err(parseError('npm', `Lockfile size (${content.length} bytes) exceeds maximum allowed size (${MAX_LOCKFILE_SIZE} bytes).`))
    : ok(content);
}

function parseJson(content: string): Result<NpmLockfileJson, LockwiseError> {
  try {
    return ok(JSON.parse(content) as NpmLockfileJson);
  } catch (e) {
    return err(parseError('npm', e instanceof Error ? e.message : 'Invalid JSON'));
  }
}

function extractPackages(data: NpmLockfileJson): ParsedLockfile {
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
}

export const npmParser = {
  canParse(content: string): boolean {
    return content.trimStart().startsWith('{') && content.includes('"lockfileVersion"');
  },

  parse(content: string): Result<ParsedLockfile, LockwiseError> {
    return pipe(
      content,
      validateSize,
      flatMap(parseJson),
      map(extractPackages),
    );
  },
};
