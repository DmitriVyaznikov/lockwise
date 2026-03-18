import type { Result } from '../fp/result.js';
import { ok, err } from '../fp/result.js';
import { flatMap, map } from '../fp/result.js';
import type { ParsedLockfile, PackageEntry, RawPackageData } from '../domain/report.js';
import { parseError } from '../domain/errors.js';
import type { LockwiseError } from '../domain/errors.js';
import { pipe } from '../fp/pipe.js';
import YAML from 'yaml';

const MAX_LOCKFILE_SIZE = 50 * 1024 * 1024;

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

function validateSize(content: string): Result<string, LockwiseError> {
  return content.length > MAX_LOCKFILE_SIZE
    ? err(parseError('pnpm', `Lockfile size (${content.length} bytes) exceeds maximum allowed size (${MAX_LOCKFILE_SIZE} bytes).`))
    : ok(content);
}

function parseYaml(content: string): Result<PnpmLockfile, LockwiseError> {
  try {
    return ok(YAML.parse(content, { maxAliasCount: 100 }) as PnpmLockfile);
  } catch (e) {
    return err(parseError('pnpm', e instanceof Error ? e.message : 'Failed to parse YAML'));
  }
}

function extractPackages(data: PnpmLockfile): ParsedLockfile {
  const rawPackages: Record<string, RawPackageData> = {};
  const packages: PackageEntry[] = [];

  if (!data.packages) {
    return { type: 'pnpm', packages, rawPackages };
  }

  for (const [key, details] of Object.entries(data.packages)) {
    const parsed = parsePackageKey(key);
    if (!parsed) continue;

    packages.push({
      name: parsed.name,
      version: parsed.version,
      ...(details.dependencies ? { dependencies: details.dependencies } : {}),
      ...(details.devDependencies ? { devDependencies: details.devDependencies } : {}),
      ...(details.peerDependencies ? { peerDependencies: details.peerDependencies } : {}),
    });

    rawPackages[key] = {
      version: parsed.version,
      ...(details.dependencies ? { dependencies: details.dependencies } : {}),
      ...(details.devDependencies ? { devDependencies: details.devDependencies } : {}),
      ...(details.peerDependencies ? { peerDependencies: details.peerDependencies } : {}),
    };
  }

  return { type: 'pnpm', packages, rawPackages };
}

export const pnpmParser = {
  canParse(content: string): boolean {
    return !content.trimStart().startsWith('{') && content.includes('lockfileVersion:');
  },

  parse(content: string): Result<ParsedLockfile, LockwiseError> {
    return pipe(
      content,
      validateSize,
      flatMap(parseYaml),
      map(extractPackages),
    );
  },
};
