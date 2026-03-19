import semver from 'semver';
import type { Maybe } from '../fp/maybe.js';
import { some, none } from '../fp/maybe.js';
import type { VersionSelection } from '../domain/report.js';
import type { VulnMapEntry } from '../checkers/osv.js';
import type { RegistryData } from '../checkers/registry.js';

interface Candidate {
  readonly version: string;
  readonly publishedAt: Date;
  readonly isOld: boolean;
  readonly purl: string;
}

type SelectionState =
  | { readonly status: 'noCandidates' }
  | { readonly status: 'onlyFresh'; readonly candidates: Candidate[] }
  | { readonly status: 'hasClean'; readonly candidates: Candidate[] }
  | { readonly status: 'allVulnerable'; readonly candidates: Candidate[] }
  | { readonly status: 'mixedWithFresh'; readonly old: Candidate[]; readonly fresh: Candidate[] };

function buildPurl(name: string, version: string): string {
  const encoded = name.startsWith('@') ? `%40${name.slice(1)}` : name;
  return `pkg:npm/${encoded}@${version}`;
}

function buildCandidates(
  packageName: string,
  range: string,
  registryData: RegistryData,
  minAgeDays: number,
): Candidate[] {
  const now = Date.now();
  const minAgeMs = minAgeDays * 24 * 60 * 60 * 1000;

  return Object.keys(registryData.versions)
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
}

function classify(
  candidates: Candidate[],
  vulnMap: Map<string, VulnMapEntry>,
): SelectionState {
  if (candidates.length === 0) return { status: 'noCandidates' };

  const groups = Object.groupBy(candidates, (c) => (c.isOld ? 'old' : 'fresh'));
  const old = groups.old ?? [];
  const fresh = groups.fresh ?? [];

  if (old.length === 0) {
    return { status: 'onlyFresh', candidates: fresh };
  }

  const clean = old.filter((c) => {
    const entry = vulnMap.get(c.purl);
    return !entry || entry.vulnerabilities.length === 0;
  });

  if (clean.length > 0) {
    return { status: 'hasClean', candidates: clean };
  }

  if (fresh.length > 0) {
    return { status: 'mixedWithFresh', old, fresh };
  }

  return { status: 'allVulnerable', candidates: old };
}

function leastVulnerable(candidates: Candidate[], vulnMap: Map<string, VulnMapEntry>): Candidate {
  return candidates
    .map((c) => {
      const entry = vulnMap.get(c.purl);
      const maxCvss = entry ? Math.max(...entry.vulnerabilities.map((v) => v.cvssScore)) : 0;
      return { candidate: c, maxCvss };
    })
    .sort((a, b) => a.maxCvss - b.maxCvss)[0].candidate;
}

function makeSelection(
  packageName: string,
  version: string,
  category: VersionSelection['category'],
  status: VersionSelection['status'],
): VersionSelection {
  return { status, version, fullName: `${packageName}@${version}`, category } as VersionSelection;
}

function selectFromState(
  state: SelectionState,
  packageName: string,
  vulnMap: Map<string, VulnMapEntry>,
): Maybe<VersionSelection> {
  switch (state.status) {
    case 'noCandidates':
      return none;

    case 'onlyFresh': {
      const best = state.candidates[state.candidates.length - 1];
      return some(makeSelection(packageName, best.version, 'due1month', 'fresh'));
    }

    case 'hasClean': {
      const best = state.candidates[state.candidates.length - 1];
      return some(makeSelection(packageName, best.version, 'success', 'clean'));
    }

    case 'mixedWithFresh': {
      const best = leastVulnerable(state.old, vulnMap);
      return some(makeSelection(packageName, best.version, 'mixed', 'mixed'));
    }

    case 'allVulnerable': {
      const best = leastVulnerable(state.candidates, vulnMap);
      return some(makeSelection(packageName, best.version, 'maybeVulnerable', 'vulnerable'));
    }

    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function selectBestVersion(
  packageName: string,
  range: string,
  registryData: RegistryData | null,
  vulnMap: Map<string, VulnMapEntry>,
  minAgeDays: number,
): Maybe<VersionSelection> {
  if (registryData === null) return none;

  const candidates = buildCandidates(packageName, range, registryData, minAgeDays);
  const state = classify(candidates, vulnMap);
  return selectFromState(state, packageName, vulnMap);
}
