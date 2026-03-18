#!/usr/bin/env node
import { Command } from 'commander';
import { runAnalyze } from './commands/analyze.js';
import { startServer } from './commands/serve.js';
import { printConfig } from './commands/config.js';
import { validatePort } from './validation.js';
import { loadConfig } from '@lockwise/core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

try { process.loadEnvFile(); } catch { /* .env file is optional */ }

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

program
  .command('serve')
  .description('Start API server for the dashboard')
  .option('-p, --port <number>', 'Server port')
  .action(async (options) => {
    try {
      const config = await loadConfig();
      const port = options.port ? validatePort(options.port) : config.servePort;
      startServer(config.outputDir, port);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('ui')
  .description('Start dashboard with API server')
  .option('-p, --port <number>', 'Server port')
  .action(async (options) => {
    try {
      const config = await loadConfig();
      const port = options.port ? validatePort(options.port) : config.uiPort;
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const uiDist = path.resolve(__dirname, '../../ui/dist');
      startServer(config.outputDir, port, uiDist);
      console.log(`Dashboard: http://127.0.0.1:${port}`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Print resolved configuration')
  .action(async () => {
    await printConfig();
  });

program.parse();
