/** Package category based on analysis results */
export type PackageCategory = 'success' | 'due1month' | 'mixed' | 'maybeVulnerable';

/** Vulnerability information */
export interface VulnInfo {
  readonly id: string;
  readonly summary: string;
  readonly cvssScore: number;
}

/** Package entry from lock-file */
export interface PackageEntry {
  readonly name: string;
  readonly version: string;
  readonly resolved?: string;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
}

/** Parsed lock-file result */
export interface ParsedLockfile {
  readonly type: 'npm' | 'yarn' | 'pnpm';
  readonly packages: PackageEntry[];
  readonly rawPackages: Record<string, RawPackageData>;
}

/** Raw package data from lock-file */
export interface RawPackageData {
  readonly version?: string;
  readonly resolved?: string;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
}

/** Semver range map entry */
export interface RangeEntry {
  readonly range: string;
  readonly from: string;
}

/** Best version selection result */
export interface VersionSelection {
  readonly version: string;
  readonly fullName: string;
  readonly category: PackageCategory;
}

/** Version info for package detail timeline */
export interface VersionInfo {
  readonly version: string;
  readonly publishedAt: string;
  readonly isInNexus: boolean;
}

/** Consumer info -- who depends on this package */
export interface ConsumerInfo {
  readonly name: string;
  readonly range: string;
}

/** Single package analysis result */
export interface PackageResult {
  readonly name: string;
  readonly currentVersion: string;
  readonly recommendedVersion?: string;
  readonly category: PackageCategory | 'unavailable';
  readonly vulnerabilities: VulnInfo[];
  readonly nexusAvailable: boolean;
  readonly semverRange?: string;
  readonly availableVersions?: VersionInfo[];
  readonly consumers?: ConsumerInfo[];
}

/** Analysis report */
export interface LockwiseReport {
  readonly meta: {
    readonly lockfileType: 'npm' | 'yarn' | 'pnpm';
    readonly analyzedAt: string;
    readonly totalPackages: number;
  };
  readonly packages: PackageResult[];
  readonly summary: {
    readonly success: number;
    readonly due1month: number;
    readonly mixed: number;
    readonly maybeVulnerable: number;
    readonly unavailable: number;
  };
  readonly nexusUpload: string;
}

/** Configuration */
export interface LockwiseConfig {
  readonly nexusUrl: string;
  readonly publicRegistry: string;
  readonly minAgeDays: number;
  readonly lockfile?: string;
  readonly outputDir: string;
}

/** Changed item in a diff between two reports */
export interface DiffChangedItem {
  readonly name: string;
  readonly wasCategory: string;
  readonly nowCategory: string;
  readonly wasVersion: string;
  readonly nowVersion: string;
}

/** Diff result between two reports */
export interface DiffResult {
  readonly added: PackageResult[];
  readonly removed: PackageResult[];
  readonly changed: DiffChangedItem[];
}

/** Summary item for report list */
export interface ReportListItem {
  readonly filename: string;
  readonly meta: LockwiseReport['meta'];
  readonly summary: LockwiseReport['summary'];
}

export const CONFIG_DEFAULTS = {
  publicRegistry: 'https://registry.npmjs.org',
  minAgeDays: 30,
  outputDir: '.lockwise',
} as const satisfies Omit<LockwiseConfig, 'nexusUrl'>;
