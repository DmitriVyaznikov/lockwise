import chalk from 'chalk';

export function formatUploadList(nexusUpload: string[]): string {
  if (nexusUpload.length === 0) {
    return chalk.green('\n  ✓ All packages are available in Nexus.\n');
  }

  const lines: string[] = [
    '',
    chalk.bold.underline(`Packages to upload to Nexus (${nexusUpload.length}):`),
    '',
    `  ${nexusUpload.join(' ')}`,
    '',
  ];

  return lines.join('\n');
}
