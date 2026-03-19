import type { PackageResult } from '@lockwise/core';

export function buildUploadEntries(packages: readonly PackageResult[]): string[] {
  const items = new Set<string>();
  for (const pkg of packages) {
    if (!pkg.isInNexus) {
      items.add(`${pkg.name}@${pkg.currentVersion}`);
    }
    if (pkg.recommendedVersion !== null && pkg.recommendedVersion !== pkg.currentVersion) {
      items.add(`${pkg.name}@${pkg.recommendedVersion}`);
    }
  }
  return [...items];
}
