#!/usr/bin/env node
import { Command } from 'commander';
import { runAnalyze } from './commands/analyze.js';

const program = new Command()
  .name('lockwise')
  .description('Sync npm dependencies between public registry and private Nexus')
  .version('0.1.0');

program
  .command('analyze')
  .description('Analyze lockfile and check Nexus availability')
  .option('-l, --lockfile <path>', 'Path to lockfile (auto-detects if omitted)')
  .option('-n, --nexus-url <url>', 'Nexus registry URL')
  .option('-o, --output <path>', 'Output report path')
  .option('--json', 'Output raw JSON instead of formatted table')
  .action(async (options) => {
    try {
      const { exitCode } = await runAnalyze(options);
      process.exit(exitCode);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
