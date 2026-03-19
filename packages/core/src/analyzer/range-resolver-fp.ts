import semver from 'semver';
import type { RawPackageData, RangeEntry } from '../domain/report.js';

function* collectDeps(data: RawPackageData): Iterable<[string, string]> {
  if (data.dependencies) yield* Object.entries(data.dependencies);
  if (data.devDependencies) yield* Object.entries(data.devDependencies);
  if (data.peerDependencies) yield* Object.entries(data.peerDependencies);
}

export function buildRangeMap(rawPackages: Record<string, RawPackageData>): Map<string, RangeEntry[]> {
  const rangeMap = new Map<string, RangeEntry[]>();
  for (const [pkgPath, details] of Object.entries(rawPackages)) {
    for (const [depName, range] of collectDeps(details)) {
      if (!rangeMap.has(depName)) rangeMap.set(depName, []);
      rangeMap.get(depName)!.push({ range, from: pkgPath });
    }
  }
  return rangeMap;
}

export function resolveRange(packageName: string, version: string, rangeMap: Map<string, RangeEntry[]>): string {
  const entries = rangeMap.get(packageName);
  if (!entries || entries.length === 0) {
    return `^${semver.major(version)}.0.0`;
  }
  const matching = entries.filter((e) => semver.satisfies(version, e.range));
  if (matching.length === 0) {
    return `^${semver.major(version)}.0.0`;
  }
  const rootRanges = matching.filter((e) => !e.from.includes('node_modules'));
  return rootRanges.length > 0 ? rootRanges[0].range : matching[0].range;
}
