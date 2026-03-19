import type { PackageCategory } from '@lockwise/core';

export type CategoryKey = 'all' | PackageCategory | 'unavailable';

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  all: 'All',
  success: 'Success',
  due1month: 'Due',
  mixed: 'Mixed',
  maybeVulnerable: 'Vulnerable',
  unavailable: 'Unavailable',
};
