import { type Result, ok, err } from '../fp/result.js';
import * as semver from 'semver';

// --- PackageName ---
export type PackageName = string & { readonly __brand: 'PackageName' };

export const PackageName = {
  parse(value: string): Result<PackageName, string> {
    if (!value || value.trim().length === 0) return err('Package name cannot be empty');
    return ok(value as PackageName);
  },
  unsafe(value: string): PackageName {
    return value as PackageName;
  },
} as const;

// --- Version ---
export type Version = string & { readonly __brand: 'Version' };

export const Version = {
  parse(value: string): Result<Version, string> {
    return semver.valid(value) ? ok(value as Version) : err(`Invalid semver: ${value}`);
  },
  unsafe(value: string): Version {
    return value as Version;
  },
} as const;

// --- SemverRange ---
export type SemverRange = string & { readonly __brand: 'SemverRange' };

export const SemverRange = {
  parse(value: string): Result<SemverRange, string> {
    return semver.validRange(value) ? ok(value as SemverRange) : err(`Invalid range: ${value}`);
  },
  unsafe(value: string): SemverRange {
    return value as SemverRange;
  },
} as const;

// --- Purl ---
export type Purl = string & { readonly __brand: 'Purl' };

export const Purl = {
  build(name: PackageName, version: Version): Purl {
    const encoded = (name as string).startsWith('@')
      ? `%40${(name as string).slice(1)}`
      : (name as string);
    return `pkg:npm/${encoded}@${version}` as Purl;
  },
} as const;

// --- ISODate ---
export type ISODate = string & { readonly __brand: 'ISODate' };

export const ISODate = {
  parse(value: string): Result<ISODate, string> {
    const date = new Date(value);
    return isNaN(date.getTime()) ? err(`Invalid date: ${value}`) : ok(value as ISODate);
  },
  unsafe(value: string): ISODate {
    return value as ISODate;
  },
  fromDate(date: Date): ISODate {
    return date.toISOString() as ISODate;
  },
} as const;
