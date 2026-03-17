export type {
  PackageCategory, VulnInfo, PackageEntry, ParsedLockfile, RawPackageData,
  RangeEntry, VersionSelection, VersionInfo, ConsumerInfo, PackageResult, LockwiseReport, LockwiseConfig,
  DiffChangedItem, DiffResult, ReportListItem,
} from './types.js';
export { CONFIG_DEFAULTS } from './types.js';
export { analyze } from './analyzer/index.js';
export { detectAndParse } from './parsers/index.js';
export type { RegistryData } from './checkers/registry-fetcher.js';
export { logger, setLogger } from './logger.js';
export type { Logger } from './logger.js';
