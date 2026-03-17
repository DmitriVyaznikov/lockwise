import chalk from 'chalk';
import type { LockwiseReport } from '@lockwise/core';

export function formatSummary(report: LockwiseReport): string {
  const { meta, summary, nexusUpload } = report;

  const lines: string[] = [
    '',
    chalk.bold.underline('Lockwise Analysis Summary'),
    '',
    `  Lockfile:    ${chalk.cyan(meta.lockfileType)}`,
    `  Analyzed at: ${chalk.dim(meta.analyzedAt)}`,
    `  Total:       ${chalk.bold(String(meta.totalPackages))} packages`,
    '',
    chalk.bold('Categories:'),
    `  ${chalk.green('\u2713')} Success:          ${chalk.green.bold(String(summary.success))}`,
    `  ${chalk.yellow('\u25F7')} Due (<30d):       ${chalk.yellow.bold(String(summary.due1month))}`,
    `  ${chalk.magenta('\u25D0')} Mixed:            ${chalk.magenta.bold(String(summary.mixed))}`,
    `  ${chalk.red('\u2717')} Vulnerable:       ${chalk.red.bold(String(summary.maybeVulnerable))}`,
    `  ${chalk.gray('?')} Unavailable:      ${chalk.gray.bold(String(summary.unavailable))}`,
    '',
    `  ${chalk.bold('Nexus upload:')}  ${nexusUpload.length > 0 ? chalk.yellow.bold(String(nexusUpload.length)) : chalk.green('0')} packages`,
    '',
  ];

  return lines.join('\n');
}
