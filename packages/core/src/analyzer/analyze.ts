import pLimit from 'p-limit';
import semver from 'semver';
import type {
  ParsedLockfile,
  LockwiseConfig,
  LockwiseReport,
  PackageResult,
  VulnInfo,
  VersionInfo,
  ConsumerInfo,
  RangeEntry,
} from '../types.js';
import { buildNexusTarballUrl, checkNexusAvailability } from '../checkers/nexus-checker.js';
import { checkVulnerabilities } from '../checkers/osv-checker.js';
import type { RegistryData } from '../checkers/registry-fetcher.js';
import { createRegistryFetcher } from '../checkers/registry-fetcher.js';
import { buildRangeMap, resolveRange } from './range-resolver.js';
import { selectBestVersion } from './version-selector.js';
import { buildPurl } from './purl.js';

const CONCURRENCY_LIMIT = 15;

export type ProgressCallback = (phase: string, current: number, total: number) => void;

export interface AnalyzeOptions {
  readonly onProgress?: ProgressCallback;
}

interface NexusCheckResult {
  readonly name: string;
  readonly version: string;
  readonly status: number;
  readonly tarballUrl: string;
}

export async function analyze(
  parsedLockfile: ParsedLockfile,
  config: LockwiseConfig,
  options?: AnalyzeOptions,
): Promise<LockwiseReport> {
  const { packages, rawPackages, type: lockfileType } = parsedLockfile;
  const onProgress = options?.onProgress;
  const rangeMap = buildRangeMap(rawPackages);
  const fetcher = createRegistryFetcher(config.publicRegistry);

  onProgress?.('nexus', 0, packages.length);
  const nexusResults = await checkAllNexus(packages, config.nexusUrl, (current) => {
    onProgress?.('nexus', current, packages.length);
  });
  const nexusStatusMap = buildNexusStatusMap(nexusResults);
  const unavailablePackages = nexusResults.filter((r) => r.status !== 200);

  const purls = packages.map((pkg) => buildPurl(pkg.name, pkg.version));
  onProgress?.('vulnerabilities', 0, purls.length);
  const vulnMap = await checkVulnerabilities(purls);
  onProgress?.('vulnerabilities', purls.length, purls.length);

  const uniqueNames = [...new Set(packages.map((p) => p.name))];
  onProgress?.('registry', 0, uniqueNames.length);
  const registryCache = await fetchAllRegistryData(packages, fetcher, (current) => {
    onProgress?.('registry', current, uniqueNames.length);
  });

  const packageResults = buildPackageResults(packages, nexusStatusMap, vulnMap, registryCache, rangeMap, config.minAgeDays);
  const summary = buildSummary(packageResults);
  onProgress?.('done', packages.length, packages.length);

  return {
    meta: {
      lockfileType,
      analyzedAt: new Date().toISOString(),
      totalPackages: packages.length,
    },
    packages: packageResults,
    summary,
    nexusUpload: buildNexusUploadList(unavailablePackages, packageResults).join(' '),
  };
}

function buildNexusStatusMap(results: NexusCheckResult[]): Map<string, NexusCheckResult> {
  const map = new Map<string, NexusCheckResult>();
  for (const result of results) {
    map.set(`${result.name}@${result.version}`, result);
  }
  return map;
}

async function fetchAllRegistryData(
  packages: ParsedLockfile['packages'],
  fetcher: ReturnType<typeof createRegistryFetcher>,
  onItem?: (completed: number) => void,
): Promise<Map<string, RegistryData | null>> {
  const limit = pLimit(CONCURRENCY_LIMIT);
  const uniqueNames = [...new Set(packages.map((p) => p.name))];
  const cache = new Map<string, RegistryData | null>();
  let completed = 0;

  const fetches = uniqueNames.map((name) =>
    limit(async () => {
      const data = await fetcher.fetch(name);
      cache.set(name, data);
      onItem?.(++completed);
    }),
  );
  await Promise.allSettled(fetches);
  return cache;
}

function buildAvailableVersions(
  packageName: string,
  range: string,
  registryData: RegistryData | null,
  nexusStatusMap: Map<string, NexusCheckResult>,
): VersionInfo[] {
  if (registryData === null) return [];

  return Object.keys(registryData.versions)
    .filter((v) => semver.satisfies(v, range))
    .sort((a, b) => semver.compare(a, b))
    .map((v) => ({
      version: v,
      publishedAt: registryData.time[v] ?? '',
      isInNexus: nexusStatusMap.get(`${packageName}@${v}`)?.status === 200,
    }));
}

function buildConsumers(
  packageName: string,
  rangeMap: Map<string, RangeEntry[]>,
): ConsumerInfo[] {
  const entries = rangeMap.get(packageName);
  if (!entries || entries.length === 0) return [];
  return entries.map((e) => ({ name: e.from, range: e.range }));
}

function buildPackageResults(
  packages: ParsedLockfile['packages'],
  nexusStatusMap: Map<string, NexusCheckResult>,
  vulnMap: Map<string, { readonly vulnerabilities: VulnInfo[] }>,
  registryCache: Map<string, RegistryData | null>,
  rangeMap: Map<string, { readonly range: string; readonly from: string }[]>,
  minAgeDays: number,
): PackageResult[] {
  return packages.map((pkg) => {
    const key = `${pkg.name}@${pkg.version}`;
    const nexusResult = nexusStatusMap.get(key);
    const nexusAvailable = nexusResult !== undefined && nexusResult.status === 200;
    const range = resolveRange(pkg.name, pkg.version, rangeMap);
    const registryData = registryCache.get(pkg.name) ?? null;

    const selection = selectBestVersion(pkg.name, range, registryData, vulnMap, minAgeDays);

    const purl = buildPurl(pkg.name, pkg.version);
    const vulnEntry = vulnMap.get(purl);
    const vulnerabilities: VulnInfo[] = vulnEntry?.vulnerabilities ?? [];

    const availableVersions = buildAvailableVersions(pkg.name, range, registryData, nexusStatusMap);
    const consumers = buildConsumers(pkg.name, rangeMap);

    if (selection === null) {
      return {
        name: pkg.name,
        currentVersion: pkg.version,
        category: 'unavailable' as const,
        vulnerabilities,
        nexusAvailable,
        semverRange: range,
        availableVersions,
        consumers,
      };
    }

    return {
      name: pkg.name,
      currentVersion: pkg.version,
      recommendedVersion: selection.version,
      category: selection.category,
      vulnerabilities,
      nexusAvailable,
      semverRange: range,
      availableVersions,
      consumers,
    };
  });
}

async function checkAllNexus(
  packages: ParsedLockfile['packages'],
  nexusUrl: string,
  onItem?: (completed: number) => void,
): Promise<NexusCheckResult[]> {
  const limit = pLimit(CONCURRENCY_LIMIT);
  let completed = 0;
  const checks = packages.map((pkg) =>
    limit(async () => {
      const tarballUrl = buildNexusTarballUrl(pkg.name, pkg.version, nexusUrl);
      const status = await checkNexusAvailability(tarballUrl);
      onItem?.(++completed);
      return { name: pkg.name, version: pkg.version, status, tarballUrl };
    }),
  );

  const settled = await Promise.allSettled(checks);
  return settled
    .filter((r): r is PromiseFulfilledResult<NexusCheckResult> => r.status === 'fulfilled')
    .map((r) => r.value);
}

function buildNexusUploadList(
  unavailablePackages: NexusCheckResult[],
  packageResults: PackageResult[],
): string[] {
  const items = new Set<string>();
  for (const pkg of unavailablePackages) {
    items.add(`${pkg.name}@${pkg.version}`);
  }
  for (const result of packageResults) {
    if (result.recommendedVersion && result.recommendedVersion !== result.currentVersion) {
      items.add(`${result.name}@${result.recommendedVersion}`);
    }
  }
  return [...items];
}

function buildSummary(results: PackageResult[]): LockwiseReport['summary'] {
  const grouped = Object.groupBy(results, (r) => r.category);
  return {
    success: grouped.success?.length ?? 0,
    due1month: grouped.due1month?.length ?? 0,
    mixed: grouped.mixed?.length ?? 0,
    maybeVulnerable: grouped.maybeVulnerable?.length ?? 0,
    unavailable: grouped.unavailable?.length ?? 0,
  };
}
