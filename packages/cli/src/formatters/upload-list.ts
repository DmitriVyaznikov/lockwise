import chalk from 'chalk';

export function formatUploadList(nexusUpload: string): string {
  if (nexusUpload.length === 0) {
    return chalk.green('\n  \u2713 All packages are available in Nexus.\n');
  }

  const count = nexusUpload.split(' ').length;

  const lines: string[] = [
    '',
    chalk.bold.underline(`Packages to upload to Nexus (${count}):`),
    '',
    `  ${nexusUpload}`,
    '',
  ];

  return lines.join('\n');
}
