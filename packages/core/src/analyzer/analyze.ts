import type {
  ParsedLockfile,
  LockwiseConfig,
  LockwiseReport,
  PackageResult,
  PackageCategory,
  VulnInfo,
} from '../types.js';
import { buildNexusTarballUrl, checkNexusAvailability } from '../checkers/nexus-checker.js';
import { checkVulnerabilities } from '../checkers/osv-checker.js';
import { createRegistryFetcher } from '../checkers/registry-fetcher.js';
import { buildRangeMap, resolveRange } from './range-resolver.js';
import { selectBestVersion } from './version-selector.js';

interface NexusCheckResult {
  readonly name: string;
  readonly version: string;
  readonly status: number;
  readonly tarballUrl: string;
}

export async function analyze(
  parsedLockfile: ParsedLockfile,
  config: LockwiseConfig,
): Promise<LockwiseReport> {
  const { packages, rawPackages, type: lockfileType } = parsedLockfile;
  const rangeMap = buildRangeMap(rawPackages);
  const fetcher = createRegistryFetcher(config.publicRegistry);

  const nexusResults = await checkAllNexus(packages, config.nexusUrl);

  const nexusStatusMap = new Map<string, NexusCheckResult>();
  for (const result of nexusResults) {
    nexusStatusMap.set(`${result.name}@${result.version}`, result);
  }

  const unavailablePackages = nexusResults.filter((r) => r.status === 404);

  const purls: string[] = [];
  const purlToPackage = new Map<string, { name: string; version: string }>();

  for (const pkg of packages) {
    const purl = `pkg:npm/${pkg.name}@${pkg.version}`;
    purls.push(purl);
    purlToPackage.set(purl, { name: pkg.name, version: pkg.version });
  }

  const vulnMap = await checkVulnerabilities(purls);

  const registryCache = new Map<string, Awaited<ReturnType<typeof fetcher.fetch>>>();
  const registryFetches = packages.map(async (pkg) => {
    if (!registryCache.has(pkg.name)) {
      const data = await fetcher.fetch(pkg.name);
      registryCache.set(pkg.name, data);
    }
  });
  await Promise.allSettled(registryFetches);

  const packageResults: PackageResult[] = [];

  for (const pkg of packages) {
    const key = `${pkg.name}@${pkg.version}`;
    const nexusResult = nexusStatusMap.get(key);
    const nexusAvailable = nexusResult !== undefined && nexusResult.status === 200;

    const range = resolveRange(pkg.name, pkg.version, rangeMap);
    const registryData = registryCache.get(pkg.name) ?? null;

    const selection = selectBestVersion(
      pkg.name,
      range,
      registryData,
      vulnMap,
      config.minAgeDays,
    );

    const purl = `pkg:npm/${pkg.name}@${pkg.version}`;
    const vulnEntry = vulnMap.get(purl);
    const vulnerabilities: VulnInfo[] = vulnEntry?.vulnerabilities ?? [];

    if (selection === null) {
      packageResults.push({
        name: pkg.name,
        currentVersion: pkg.version,
        category: 'unavailable',
        vulnerabilities,
        nexusAvailable,
        semverRange: range,
      });
    } else {
      packageResults.push({
        name: pkg.name,
        currentVersion: pkg.version,
        recommendedVersion: selection.version,
        category: selection.category,
        vulnerabilities,
        nexusAvailable,
        semverRange: range,
      });
    }
  }

  const summary = buildSummary(packageResults);

  const nexusUpload = unavailablePackages.map((r) => r.tarballUrl);

  return {
    meta: {
      lockfileType,
      analyzedAt: new Date().toISOString(),
      totalPackages: packages.length,
    },
    packages: packageResults,
    summary,
    nexusUpload,
  };
}

async function checkAllNexus(
  packages: ParsedLockfile['packages'],
  nexusUrl: string,
): Promise<NexusCheckResult[]> {
  const checks = packages.map(async (pkg) => {
    const tarballUrl = buildNexusTarballUrl(pkg.name, pkg.version, nexusUrl);
    const status = await checkNexusAvailability(tarballUrl);
    return { name: pkg.name, version: pkg.version, status, tarballUrl };
  });

  const settled = await Promise.allSettled(checks);
  return settled
    .filter((r): r is PromiseFulfilledResult<NexusCheckResult> => r.status === 'fulfilled')
    .map((r) => r.value);
}

function buildSummary(results: PackageResult[]): LockwiseReport['summary'] {
  const summary = {
    success: 0,
    due1month: 0,
    mixed: 0,
    maybeVulnerable: 0,
    unavailable: 0,
  };

  for (const result of results) {
    const cat = result.category;
    if (cat === 'success' || cat === 'due1month' || cat === 'mixed' || cat === 'maybeVulnerable' || cat === 'unavailable') {
      summary[cat]++;
    }
  }

  return summary;
}
