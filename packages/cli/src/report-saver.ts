import fs from 'node:fs';
import path from 'node:path';
import type { LockwiseReport } from '@lockwise/core';

export function saveReport(
  report: LockwiseReport,
  outputDir: string,
  explicitOutput?: string,
): string {
  const json = JSON.stringify(report, null, 2);

  if (explicitOutput) {
    const dir = path.dirname(explicitOutput);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(explicitOutput, json, 'utf-8');
    return explicitOutput;
  }

  const reportsDir = path.join(outputDir, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}.json`;
  const filePath = path.join(reportsDir, filename);

  fs.writeFileSync(filePath, json, 'utf-8');
  fs.copyFileSync(filePath, path.join(reportsDir, 'latest.json'));

  return filePath;
}
