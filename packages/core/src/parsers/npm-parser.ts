import type { ParsedLockfile, PackageEntry, RawPackageData } from '../types.js';
import type { LockfileParser } from './types.js';

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

export class NpmParser implements LockfileParser {
  canParse(content: string): boolean {
    try {
      const data = JSON.parse(content);
      return typeof data.lockfileVersion === 'number' && data.lockfileVersion >= 2;
    } catch {
      return false;
    }
  }

  parse(content: string): ParsedLockfile {
    const data = JSON.parse(content);
    const rawPackages: Record<string, RawPackageData> = data.packages ?? {};
    const packages: PackageEntry[] = [];

    for (const [key, details] of Object.entries(rawPackages) as [string, Record<string, unknown>][]) {
      if (key === '') continue;
      const name = extractPackageName(key);
      if (!name) continue;
      const version = details.version as string | undefined;
      if (!version) continue;

      const entry: PackageEntry = {
        name,
        version,
        ...(details.resolved ? { resolved: details.resolved as string } : {}),
        ...(details.dependencies ? { dependencies: details.dependencies as Record<string, string> } : {}),
        ...(details.devDependencies ? { devDependencies: details.devDependencies as Record<string, string> } : {}),
        ...(details.peerDependencies ? { peerDependencies: details.peerDependencies as Record<string, string> } : {}),
      };
      packages.push(entry);
    }

    return { type: 'npm', packages, rawPackages: rawPackages as Record<string, RawPackageData> };
  }
}
