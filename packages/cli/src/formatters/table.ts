import chalk from 'chalk';
import Table from 'cli-table3';
import type { PackageCategory, PackageResult } from '@lockwise/core';

const CATEGORY_COLORS: Record<PackageCategory | 'unavailable', (text: string) => string> = {
  success: chalk.green,
  due1month: chalk.yellow,
  mixed: chalk.magenta,
  maybeVulnerable: chalk.red,
  unavailable: chalk.gray,
};

function maxCvss(pkg: PackageResult): string {
  if (pkg.vulnerabilities.length === 0) return chalk.dim('\u2014');
  const max = Math.max(...pkg.vulnerabilities.map((v) => v.cvssScore));
  const formatted = max.toFixed(1);
  if (max >= 7) return chalk.red.bold(formatted);
  if (max >= 4) return chalk.yellow(formatted);
  return chalk.dim(formatted);
}

export function formatTable(
  packages: PackageResult[],
  filterCategory?: PackageCategory | 'unavailable',
): string {
  const filtered = filterCategory
    ? packages.filter((p) => p.category === filterCategory)
    : packages;

  if (filtered.length === 0) {
    return chalk.dim('\n  No packages to display.\n');
  }

  const table = new Table({
    head: ['Name', 'Current', 'Recommended', 'Category', 'CVSS', 'Nexus'].map((h) =>
      chalk.bold.white(h),
    ),
    style: { head: [], border: [] },
  });

  for (const pkg of filtered) {
    const colorize = CATEGORY_COLORS[pkg.category];
    table.push([
      pkg.name,
      pkg.currentVersion,
      pkg.recommendedVersion ?? chalk.dim('\u2014'),
      colorize(pkg.category),
      maxCvss(pkg),
      pkg.nexusAvailable ? chalk.green('yes') : chalk.red('no'),
    ]);
  }

  return `\n${table.toString()}\n`;
}
