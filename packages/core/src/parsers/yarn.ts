import type { Result } from '../fp/result.js';
import { ok, err } from '../fp/result.js';
import { flatMap, map } from '../fp/result.js';
import type { ParsedLockfile, PackageEntry, RawPackageData } from '../domain/report.js';
import { parseError } from '../domain/errors.js';
import type { LockwiseError } from '../domain/errors.js';
import { pipe } from '../fp/pipe.js';
// @ts-expect-error -- @yarnpkg/lockfile has no type declarations
import * as lockfile from '@yarnpkg/lockfile';

const MAX_LOCKFILE_SIZE = 50 * 1024 * 1024;

interface YarnLockEntry {
  readonly version: string;
  readonly resolved?: string;
  readonly dependencies?: Record<string, string>;
}

function extractPackageName(key: string): string {
  const cleaned = key.replace(/^"|"$/g, '');
  if (cleaned.startsWith('@')) {
    const afterScope = cleaned.indexOf('/', 1);
    if (afterScope !== -1) {
      const atIndex = cleaned.indexOf('@', afterScope + 1);
      if (atIndex !== -1) return cleaned.slice(0, atIndex);
    }
    return cleaned;
  }
  const atIndex = cleaned.indexOf('@');
  if (atIndex > 0) return cleaned.slice(0, atIndex);
  return cleaned;
}

function validateSize(content: string): Result<string, LockwiseError> {
  return content.length > MAX_LOCKFILE_SIZE
    ? err(parseError('yarn', `Lockfile size (${content.length} bytes) exceeds maximum allowed size (${MAX_LOCKFILE_SIZE} bytes).`))
    : ok(content);
}

function parseYarnLock(content: string): Result<Record<string, YarnLockEntry>, LockwiseError> {
  try {
    const parsed = lockfile.parse(content) as { type: string; object: Record<string, YarnLockEntry> };
    return ok(parsed.object);
  } catch (e) {
    return err(parseError('yarn', e instanceof Error ? e.message : 'Failed to parse yarn.lock'));
  }
}

function extractPackages(entries: Record<string, YarnLockEntry>): ParsedLockfile {
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
}

export const yarnParser = {
  canParse(content: string): boolean {
    return content.includes('# yarn lockfile v1');
  },

  parse(content: string): Result<ParsedLockfile, LockwiseError> {
    return pipe(
      content,
      validateSize,
      flatMap(parseYarnLock),
      map(extractPackages),
    );
  },
};
