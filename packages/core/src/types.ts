/** Категория пакета по результатам анализа */
export type PackageCategory = 'success' | 'due1month' | 'mixed' | 'maybeVulnerable';

/** Информация об уязвимости */
export interface VulnInfo {
  readonly id: string;
  readonly summary: string;
  readonly cvssScore: number;
}

/** Запись о пакете из lock-файла */
export interface PackageEntry {
  readonly name: string;
  readonly version: string;
  readonly resolved?: string;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
}

/** Результат парсинга lock-файла */
export interface ParsedLockfile {
  readonly type: 'npm' | 'yarn' | 'pnpm';
  readonly packages: PackageEntry[];
  readonly rawPackages: Record<string, RawPackageData>;
}

/** Сырые данные пакета из lock-файла */
export interface RawPackageData {
  readonly version?: string;
  readonly resolved?: string;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
}

/** Запись в карте semver ranges */
export interface RangeEntry {
  readonly range: string;
  readonly from: string;
}

/** Результат выбора лучшей версии */
export interface VersionSelection {
  readonly version: string;
  readonly fullName: string;
  readonly category: PackageCategory;
}

/** Результат анализа одного пакета */
export interface PackageResult {
  readonly name: string;
  readonly currentVersion: string;
  readonly recommendedVersion?: string;
  readonly category: PackageCategory | 'unavailable';
  readonly vulnerabilities: VulnInfo[];
  readonly nexusAvailable: boolean;
  readonly semverRange?: string;
}

/** Итоговый отчёт */
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
  readonly nexusUpload: string[];
}

/** Конфигурация */
export interface LockwiseConfig {
  readonly nexusUrl: string;
  readonly publicRegistry: string;
  readonly minAgeDays: number;
  readonly lockfile?: string;
  readonly outputDir: string;
}

export const DEFAULT_CONFIG: LockwiseConfig = {
  nexusUrl: 'REDACTED',
  publicRegistry: 'https://registry.npmjs.org',
  minAgeDays: 30,
  outputDir: '.lockwise',
} as const;
