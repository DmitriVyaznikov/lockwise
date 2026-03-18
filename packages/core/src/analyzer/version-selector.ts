import semver from 'semver';
import type { VersionSelection } from '../types.js';
import type { VulnMapEntry } from '../checkers/osv-checker.js';
import type { RegistryData } from '../checkers/registry-fetcher.js';
import { buildPurl } from './purl.js';

interface VersionCandidate {
  readonly version: string;
  readonly publishedAt: Date;
  readonly isOld: boolean;
  readonly purl: string;
}

export function selectBestVersion(
  packageName: string,
  range: string,
  registryData: RegistryData | null,
  vulnMap: Map<string, VulnMapEntry>,
  minAgeDays: number,
): VersionSelection | null {
  if (registryData === null) return null;

  const now = Date.now();
  const minAgeMs = minAgeDays * 24 * 60 * 60 * 1000;

  const candidates: VersionCandidate[] = Object.keys(registryData.versions)
    .filter((v) => semver.satisfies(v, range))
    .map((v) => {
      const publishedAt = new Date(registryData.time[v] ?? now);
      return {
        version: v,
        publishedAt,
        isOld: now - publishedAt.getTime() > minAgeMs,
        purl: buildPurl(packageName, v),
      };
    })
    .sort((a, b) => semver.compare(a.version, b.version));

  if (candidates.length === 0) return null;

  const oldCandidates = candidates.filter((c) => c.isOld);
  const freshCandidates = candidates.filter((c) => !c.isOld);

  if (oldCandidates.length === 0) {
    const best = freshCandidates[freshCandidates.length - 1];
    return {
      version: best.version,
      fullName: `${packageName}@${best.version}`,
      category: 'due1month',
    };
  }

  const cleanOld = oldCandidates.filter((c) => {
    const entry = vulnMap.get(c.purl);
    return !entry || entry.vulnerabilities.length === 0;
  });

  if (cleanOld.length > 0) {
    const best = cleanOld[cleanOld.length - 1];
    return {
      version: best.version,
      fullName: `${packageName}@${best.version}`,
      category: 'success',
    };
  }

  const vulnOld = oldCandidates
    .map((c) => {
      const entry = vulnMap.get(c.purl);
      const maxCvss = entry
        ? Math.max(...entry.vulnerabilities.map((v) => v.cvssScore))
        : 0;
      return { ...c, maxCvss };
    })
    .sort((a, b) => a.maxCvss - b.maxCvss);

  const leastVuln = vulnOld[0];

  if (freshCandidates.length > 0) {
    return {
      version: leastVuln.version,
      fullName: `${packageName}@${leastVuln.version}`,
      category: 'mixed',
    };
  }

  return {
    version: leastVuln.version,
    fullName: `${packageName}@${leastVuln.version}`,
    category: 'maybeVulnerable',
  };
}
