export type PackageCategory = 'success' | 'due1month' | 'mixed' | 'maybeVulnerable';

export interface VulnInfo {
  readonly id: string;
  readonly summary: string;
  readonly cvssScore: number;
}

export interface PackageEntry {
  readonly name: string;
  readonly version: string;
  readonly resolved?: string;
  readonly dependencies?: Record<string, string>;
}

export interface RawPackageData {
  readonly version: string;
  readonly resolved?: string;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
}

export type LockfileType = 'npm' | 'yarn' | 'pnpm';

export interface ParsedLockfile {
  readonly type: LockfileType;
  readonly packages: readonly PackageEntry[];
  readonly rawPackages: Readonly<Record<string, RawPackageData>>;
}

export interface RangeEntry {
  readonly range: string;
  readonly from: string;
}

export type VersionSelection =
  | { readonly status: 'clean'; readonly version: string; readonly fullName: string; readonly category: 'success' }
  | { readonly status: 'fresh'; readonly version: string; readonly fullName: string; readonly category: 'due1month' }
  | { readonly status: 'mixed'; readonly version: string; readonly fullName: string; readonly category: 'mixed' }
  | { readonly status: 'vulnerable'; readonly version: string; readonly fullName: string; readonly category: 'maybeVulnerable' };

export interface VersionInfo {
  readonly version: string;
  readonly publishedAt: string;
  readonly isInNexus: boolean;
}

export interface ConsumerInfo {
  readonly name: string;
  readonly range: string;
}

export interface PackageResult {
  readonly name: string;
  readonly currentVersion: string;
  readonly recommendedVersion: string | null;
  readonly category: PackageCategory | 'unavailable';
  readonly isInNexus: boolean;
  readonly vulnerabilities: readonly VulnInfo[];
  readonly maxCvss: number;
  readonly availableVersions: readonly VersionInfo[];
  readonly consumers: readonly ConsumerInfo[];
  readonly range: string;
}

export interface ReportSummary {
  readonly success: number;
  readonly due1month: number;
  readonly mixed: number;
  readonly maybeVulnerable: number;
  readonly unavailable: number;
}

export interface LockwiseConfig {
  readonly nexusUrl: string;
  readonly publicRegistry: string;
  readonly minAgeDays: number;
  readonly lockfilePath?: string;
}

export interface LockwiseReport {
  readonly meta: {
    readonly lockfileType: string;
    readonly analyzedAt: string;
    readonly totalPackages: number;
    readonly configUsed: LockwiseConfig;
  };
  readonly packages: readonly PackageResult[];
  readonly summary: ReportSummary;
  readonly nexusUpload: string;
}

export interface DiffChangedItem {
  readonly name: string;
  readonly from: { readonly version: string; readonly category: string };
  readonly to: { readonly version: string; readonly category: string };
}

export interface DiffResult {
  readonly added: readonly PackageResult[];
  readonly removed: readonly PackageResult[];
  readonly changed: readonly DiffChangedItem[];
}

export interface ReportListItem {
  readonly filename: string;
  readonly analyzedAt: string;
  readonly totalPackages: number;
  readonly summary: ReportSummary;
}

export const DEFAULT_CONFIG: LockwiseConfig = {
  nexusUrl: 'https://nexus.example.com/repository/npm-proxy',
  publicRegistry: 'https://registry.npmjs.org',
  minAgeDays: 30,
} as const;
