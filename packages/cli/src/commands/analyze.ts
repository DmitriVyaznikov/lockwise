import fs from 'node:fs';
import ora from 'ora';
import { analyze, detectAndParse, DEFAULT_CONFIG } from '@lockwise/core';
import type { LockwiseConfig, LockwiseReport } from '@lockwise/core';
import { resolveLockfile } from '../lockfile-resolver.js';
import { saveReport } from '../report-saver.js';
import { formatSummary } from '../formatters/summary.js';
import { formatTable } from '../formatters/table.js';
import { formatUploadList } from '../formatters/upload-list.js';
import { resolveExitCode } from '../exit-code.js';

export interface AnalyzeCliOptions {
  readonly lockfile?: string;
  readonly nexusUrl?: string;
  readonly output?: string;
  readonly json?: boolean;
}

export interface AnalyzeResult {
  readonly exitCode: number;
  readonly report: LockwiseReport;
}

export async function runAnalyze(options: AnalyzeCliOptions): Promise<AnalyzeResult> {
  const spinner = ora();

  const lockfilePath = resolveLockfile(options.lockfile);
  spinner.start(`Reading lockfile: ${lockfilePath}`);
  const content = fs.readFileSync(lockfilePath, 'utf-8');

  const parsed = detectAndParse(content);
  if (!parsed) {
    spinner.fail('Failed to parse lockfile');
    throw new Error(`Failed to parse lockfile: ${lockfilePath}`);
  }
  spinner.succeed(`Parsed ${parsed.type} lockfile (${parsed.packages.length} packages)`);

  const config: LockwiseConfig = {
    ...DEFAULT_CONFIG,
    ...(options.nexusUrl ? { nexusUrl: options.nexusUrl } : {}),
  };

  const report = await analyze(parsed, config, {
    onProgress(phase, current, total) {
      spinner.text = `[${phase}] ${current}/${total}`;
      if (current === 0) spinner.start();
      if (current === total) spinner.succeed(`[${phase}] done`);
    },
  });

  const savedPath = saveReport(report, DEFAULT_CONFIG.outputDir, options.output);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatSummary(report));
    console.log(formatTable(report.packages));
    console.log(formatUploadList(report.nexusUpload));
    console.log(`  Report saved: ${savedPath}\n`);
  }

  const exitCode = resolveExitCode(report);
  return { exitCode, report };
}
