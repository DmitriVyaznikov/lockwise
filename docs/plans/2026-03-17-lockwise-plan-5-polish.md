# Lockwise Plan 5: Polish — Config Loader, Publish Preparation, README

**Goal:** Add cosmiconfig-based config loading, prepare packages for npm publish (without actually publishing), and create a comprehensive README.

**Architecture:** Config loader lives in `packages/core` (shared by CLI and future consumers). CLI wires config loading and merges with CLI flags. Publish preparation touches `package.json` files across the monorepo. README lives at root.

**Tech Stack:** cosmiconfig (config loading), existing TypeScript + Vitest + ESLint setup

**Scope:** Config loader, `lockwise config` CLI command, package.json publish fields, `build:all` script, root README.md.

---

## Task 1: Add `uiPort` and `servePort` to LockwiseConfig

**Files:**
- Modify: `packages/core/src/types.ts`

**Step 1: Update the LockwiseConfig interface and DEFAULT_CONFIG**

Add `uiPort` and `servePort` fields to support configurable ports for the `ui` and `serve` commands.

```typescript
// packages/core/src/types.ts — update LockwiseConfig interface

/** Configuration */
export interface LockwiseConfig {
  readonly nexusUrl: string;
  readonly publicRegistry: string;
  readonly minAgeDays: number;
  readonly lockfile?: string;
  readonly outputDir: string;
  readonly servePort: number;
  readonly uiPort: number;
}

export const DEFAULT_CONFIG = {
  nexusUrl: 'REDACTED',
  publicRegistry: 'https://registry.npmjs.org',
  minAgeDays: 30,
  outputDir: '.lockwise',
  servePort: 3001,
  uiPort: 3000,
} as const satisfies LockwiseConfig;
```

**Step 2: Verify type-check passes**

```bash
npm run type-check
```

Expected: no errors (existing code only reads fields it needs; new fields are additive).

**Step 3: Commit**

```bash
git add packages/core/src/types.ts
git commit -m "feat(core): add servePort and uiPort to LockwiseConfig"
```

---

## Task 2: Config Loader with cosmiconfig (TDD)

**Files:**
- Create: `packages/core/src/config-loader.ts`
- Create: `packages/core/src/config-loader.test.ts`
- Modify: `packages/core/src/index.ts` (add export)

**Step 1: Install cosmiconfig**

```bash
npm install cosmiconfig -w packages/core
```

**Step 2: Write failing tests FIRST**

```typescript
// packages/core/src/config-loader.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig } from './config-loader.js';
import { DEFAULT_CONFIG } from './types.js';

vi.mock('cosmiconfig', () => {
  const searchMock = vi.fn();
  return {
    cosmiconfig: vi.fn(() => ({
      search: searchMock,
    })),
    __searchMock: searchMock,
  };
});

async function getSearchMock() {
  const mod = await import('cosmiconfig') as unknown as { __searchMock: ReturnType<typeof vi.fn> };
  return mod.__searchMock;
}

describe('loadConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return DEFAULT_CONFIG when no config file is found', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockResolvedValue(null);

    const config = await loadConfig('/some/dir');
    expect(config).toEqual({ ...DEFAULT_CONFIG });
  });

  it('should return DEFAULT_CONFIG when config result is empty', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockResolvedValue({ config: {}, isEmpty: true, filepath: '' });

    const config = await loadConfig('/some/dir');
    expect(config).toEqual({ ...DEFAULT_CONFIG });
  });

  it('should merge partial config with defaults', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockResolvedValue({
      config: { nexusUrl: 'https://custom-nexus.example.com', minAgeDays: 14 },
      isEmpty: false,
      filepath: '/project/lockwise.config.ts',
    });

    const config = await loadConfig('/project');
    expect(config).toEqual({
      ...DEFAULT_CONFIG,
      nexusUrl: 'https://custom-nexus.example.com',
      minAgeDays: 14,
    });
  });

  it('should override all defaults when full config is provided', async () => {
    const searchMock = await getSearchMock();
    const fullConfig = {
      nexusUrl: 'https://nexus.corp.com/npm',
      publicRegistry: 'https://registry.corp.com',
      minAgeDays: 7,
      outputDir: 'reports',
      servePort: 4000,
      uiPort: 4001,
    };
    searchMock.mockResolvedValue({
      config: fullConfig,
      isEmpty: false,
      filepath: '/project/.lockwiserc.json',
    });

    const config = await loadConfig('/project');
    expect(config).toEqual(fullConfig);
  });

  it('should search from cwd when no directory is provided', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockResolvedValue(null);

    await loadConfig();
    expect(searchMock).toHaveBeenCalledWith(undefined);
  });

  it('should search from specified directory', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockResolvedValue(null);

    await loadConfig('/custom/path');
    expect(searchMock).toHaveBeenCalledWith('/custom/path');
  });

  it('should ignore unknown config fields', async () => {
    const searchMock = await getSearchMock();
    searchMock.mockResolvedValue({
      config: { nexusUrl: 'https://nexus.example.com', unknownField: true },
      isEmpty: false,
      filepath: '/project/lockwise.config.ts',
    });

    const config = await loadConfig('/project');
    expect(config.nexusUrl).toBe('https://nexus.example.com');
    // Unknown fields pass through but don't break anything
    expect((config as Record<string, unknown>)['unknownField']).toBe(true);
  });
});
```

**Step 3: Run tests — expect FAIL**

```bash
npm run test:core -- --reporter verbose 2>&1 | tail -20
```

Expected: tests fail because `config-loader.ts` does not exist.

**Step 4: Implement config-loader.ts**

```typescript
// packages/core/src/config-loader.ts
import { cosmiconfig } from 'cosmiconfig';
import type { LockwiseConfig } from './types.js';
import { DEFAULT_CONFIG } from './types.js';

/**
 * Loads Lockwise configuration using cosmiconfig.
 *
 * Search paths (in order):
 * - lockwise.config.ts / lockwise.config.js / lockwise.config.cjs / lockwise.config.mjs
 * - .lockwiserc / .lockwiserc.json / .lockwiserc.yaml / .lockwiserc.yml
 * - .lockwiserc.js / .lockwiserc.cjs / .lockwiserc.mjs
 * - package.json#lockwise
 *
 * Missing fields are filled from DEFAULT_CONFIG.
 */
export async function loadConfig(cwd?: string): Promise<LockwiseConfig> {
  const explorer = cosmiconfig('lockwise', {
    searchStrategy: 'global',
  });

  const result = cwd ? await explorer.search(cwd) : await explorer.search();

  if (!result || result.isEmpty) {
    return { ...DEFAULT_CONFIG };
  }

  return { ...DEFAULT_CONFIG, ...result.config };
}
```

**Step 5: Run tests — expect PASS**

```bash
npm run test:core -- --reporter verbose 2>&1 | tail -20
```

**Step 6: Export loadConfig from core index**

Add to `packages/core/src/index.ts`:

```typescript
export { loadConfig } from './config-loader.js';
```

**Step 7: Verify type-check**

```bash
npm run type-check
```

**Step 8: Commit**

```bash
git add packages/core/src/config-loader.ts packages/core/src/config-loader.test.ts packages/core/src/index.ts packages/core/package.json package-lock.json
git commit -m "feat(core): add cosmiconfig-based config loader"
```

---

## Task 3: Wire Config into CLI

**Files:**
- Modify: `packages/cli/src/commands/analyze.ts`
- Modify: `packages/cli/src/index.ts`

**Step 1: Update analyze command to accept config**

In `packages/cli/src/commands/analyze.ts`, change `runAnalyze` to accept an optional pre-loaded config and merge CLI options on top:

```typescript
// packages/cli/src/commands/analyze.ts
// Update imports — add loadConfig
import { analyze, detectAndParse, DEFAULT_CONFIG, loadConfig } from '@lockwise/core';
import type { LockwiseConfig, LockwiseReport } from '@lockwise/core';

// Update AnalyzeCliOptions — no changes needed, same interface

// Update runAnalyze to load config first, then merge CLI overrides
export async function runAnalyze(options: AnalyzeCliOptions): Promise<AnalyzeResult> {
  const spinner = ora();

  // Load config from cosmiconfig, then merge CLI overrides
  const fileConfig = await loadConfig();
  const config: LockwiseConfig = {
    ...fileConfig,
    ...(options.nexusUrl ? { nexusUrl: options.nexusUrl } : {}),
    ...(options.output ? { outputDir: options.output } : {}),
  };

  const lockfilePath = resolveLockfile(options.lockfile ?? config.lockfile);
  spinner.start(`Reading lockfile: ${lockfilePath}`);
  const content = fs.readFileSync(lockfilePath, 'utf-8');

  const parsed = detectAndParse(content);
  if (!parsed) {
    spinner.fail('Failed to parse lockfile');
    throw new Error(`Failed to parse lockfile: ${lockfilePath}`);
  }
  spinner.succeed(`Parsed ${parsed.type} lockfile (${parsed.packages.length} packages)`);

  const report = await analyze(parsed, config, {
    onProgress(phase, current, total) {
      spinner.text = `[${phase}] ${current}/${total}`;
      if (current === 0) spinner.start();
      if (current === total) spinner.succeed(`[${phase}] done`);
    },
  });

  const savedPath = saveReport(report, config.outputDir, options.output);

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
```

Key changes:
1. Replace `DEFAULT_CONFIG` spread with `await loadConfig()` result
2. CLI flags (`--nexus-url`, `--output`) override config file values
3. `config.lockfile` is used as fallback if `--lockfile` not provided
4. `config.outputDir` is used instead of `DEFAULT_CONFIG.outputDir`

**Step 2: Update CLI entry point — wire config into serve/ui, add config command**

In `packages/cli/src/index.ts`:

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { runAnalyze } from './commands/analyze.js';
import { startServer } from './commands/serve.js';
import { loadConfig, DEFAULT_CONFIG } from '@lockwise/core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    const config = await loadConfig();
    const port = options.port ? Number(options.port) : config.servePort;
    startServer(config.outputDir, port);
  });

program
  .command('ui')
  .description('Start dashboard with API server')
  .option('-p, --port <number>', 'Server port')
  .action(async (options) => {
    const config = await loadConfig();
    const port = options.port ? Number(options.port) : config.uiPort;
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const uiDist = path.resolve(__dirname, '../../ui/dist');
    startServer(config.outputDir, port, uiDist);
    console.log(`Dashboard: http://localhost:${port}`);
  });

program
  .command('config')
  .description('Print resolved configuration')
  .action(async () => {
    const config = await loadConfig();
    console.log(JSON.stringify(config, null, 2));
  });

program.parse();
```

Key changes:
1. `serve` and `ui` commands now load config, use `config.servePort` / `config.uiPort` as defaults
2. CLI `--port` flag overrides config values
3. New `lockwise config` command prints the resolved config as JSON (useful for debugging)

**Step 3: Verify type-check and tests**

```bash
npm run type-check
npm run test:cli
```

**Step 4: Commit**

```bash
git add packages/cli/src/index.ts packages/cli/src/commands/analyze.ts
git commit -m "feat(cli): wire cosmiconfig loader and add config command"
```

---

## Task 4: Config Command Tests (TDD)

**Files:**
- Create: `packages/cli/src/commands/config.test.ts`
- Create: `packages/cli/src/commands/config.ts`
- Modify: `packages/cli/src/index.ts` (import config command)

Extract the config command logic into a testable function, then test it.

**Step 1: Write failing tests FIRST**

```typescript
// packages/cli/src/commands/config.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveConfig } from './config.js';
import { DEFAULT_CONFIG } from '@lockwise/core';

vi.mock('@lockwise/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@lockwise/core')>();
  return {
    ...original,
    loadConfig: vi.fn(),
  };
});

describe('resolveConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the resolved config from loadConfig', async () => {
    const { loadConfig } = await import('@lockwise/core');
    const mocked = vi.mocked(loadConfig);
    mocked.mockResolvedValue({ ...DEFAULT_CONFIG });

    const config = await resolveConfig();
    expect(config).toEqual({ ...DEFAULT_CONFIG });
  });

  it('should return merged config when config file exists', async () => {
    const { loadConfig } = await import('@lockwise/core');
    const mocked = vi.mocked(loadConfig);
    const customConfig = {
      ...DEFAULT_CONFIG,
      nexusUrl: 'https://custom.nexus.com',
      minAgeDays: 7,
    };
    mocked.mockResolvedValue(customConfig);

    const config = await resolveConfig();
    expect(config.nexusUrl).toBe('https://custom.nexus.com');
    expect(config.minAgeDays).toBe(7);
    // Unset fields keep defaults
    expect(config.publicRegistry).toBe(DEFAULT_CONFIG.publicRegistry);
  });
});
```

**Step 2: Run tests — expect FAIL**

```bash
npm run test:cli -- --reporter verbose 2>&1 | tail -15
```

**Step 3: Implement config command module**

```typescript
// packages/cli/src/commands/config.ts
import { loadConfig } from '@lockwise/core';
import type { LockwiseConfig } from '@lockwise/core';

export async function resolveConfig(): Promise<LockwiseConfig> {
  return loadConfig();
}

export async function printConfig(): Promise<void> {
  const config = await resolveConfig();
  console.log(JSON.stringify(config, null, 2));
}
```

**Step 4: Update CLI entry point to use the extracted module**

In `packages/cli/src/index.ts`, update the config command:

```typescript
// Replace the inline config command action with:
import { printConfig } from './commands/config.js';

// ... in the command definition:
program
  .command('config')
  .description('Print resolved configuration')
  .action(async () => {
    await printConfig();
  });
```

**Step 5: Run tests — expect PASS**

```bash
npm run test:cli -- --reporter verbose 2>&1 | tail -15
```

**Step 6: Commit**

```bash
git add packages/cli/src/commands/config.ts packages/cli/src/commands/config.test.ts packages/cli/src/index.ts
git commit -m "feat(cli): extract and test config command"
```

---

## Task 5: Publish Preparation — packages/core

**Files:**
- Modify: `packages/core/package.json`

**Step 1: Update packages/core/package.json with publish metadata**

```json
{
  "name": "@lockwise/core",
  "version": "0.1.0",
  "description": "Core analysis engine for syncing npm dependencies between public registry and private Nexus",
  "type": "module",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/nicepkg/lockwise.git",
    "directory": "packages/core"
  },
  "keywords": [
    "npm",
    "nexus",
    "lockfile",
    "dependencies",
    "sync",
    "registry",
    "vulnerability",
    "security"
  ],
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsc -p tsconfig.build.json --watch"
  },
  "dependencies": {
    "@yarnpkg/lockfile": "^1.1.0",
    "axios": "^1.7.0",
    "cosmiconfig": "^9.0.0",
    "p-limit": "^7.3.0",
    "semver": "^7.6.0",
    "yaml": "^2.4.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/semver": "^7.5.0"
  }
}
```

Key additions:
- `description` — what the package does
- `license` — MIT
- `repository` — git URL with directory
- `keywords` — npm search terms
- `files` — only dist + README + LICENSE (no source, no tests)
- `engines` — Node >= 20 (required for `Object.groupBy`, iterator helpers, etc.)

**Step 2: Verify npm pack shows correct files**

```bash
cd /Users/dmitriy/Documents/JOB/lockwise && npm pack -w packages/core --dry-run 2>&1
```

Expected output should list only `dist/`, `README.md`, `LICENSE`, `package.json` — no `src/`, no test files.

**Step 3: Commit**

```bash
git add packages/core/package.json
git commit -m "chore(core): add publish metadata to package.json"
```

---

## Task 6: Publish Preparation — packages/cli

**Files:**
- Modify: `packages/cli/package.json`

**Step 1: Update packages/cli/package.json with publish metadata**

```json
{
  "name": "@lockwise/cli",
  "version": "0.1.0",
  "description": "CLI for syncing npm dependencies between public registry and private Nexus",
  "type": "module",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/nicepkg/lockwise.git",
    "directory": "packages/cli"
  },
  "keywords": [
    "lockwise",
    "npm",
    "nexus",
    "cli",
    "lockfile",
    "dependencies",
    "sync"
  ],
  "bin": {
    "lockwise": "./dist/index.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json"
  },
  "dependencies": {
    "@lockwise/core": "*",
    "chalk": "^5.6.2",
    "cli-table3": "^0.6.5",
    "commander": "^14.0.3",
    "express": "^5.2.1",
    "ora": "^9.3.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.6",
    "@types/node": "^22.0.0",
    "@types/supertest": "^7.2.0",
    "supertest": "^7.2.2"
  }
}
```

Key additions:
- `description` — what the CLI does
- `license` — MIT
- `repository` — git URL with directory
- `keywords` — npm search terms
- `files` — only dist + README + LICENSE
- `engines` — Node >= 20

**Step 2: Verify npm pack shows correct files**

```bash
cd /Users/dmitriy/Documents/JOB/lockwise && npm pack -w packages/cli --dry-run 2>&1
```

Expected: only `dist/`, `README.md`, `LICENSE`, `package.json`.

**Step 3: Commit**

```bash
git add packages/cli/package.json
git commit -m "chore(cli): add publish metadata to package.json"
```

---

## Task 7: Build Pipeline — build:all Script

**Files:**
- Modify: root `package.json`

**Step 1: Add build:all script to root package.json**

The build order matters: core must build first (CLI depends on it), then CLI, then UI.

Add to root `package.json` scripts:

```json
{
  "scripts": {
    "build:all": "npm run build -w packages/core && npm run build -w packages/cli && npm run build -w packages/ui"
  }
}
```

This goes alongside the existing scripts. The full scripts section becomes:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:core": "vitest run --project core",
    "test:cli": "vitest run --project cli",
    "test:ui": "vitest run --project ui",
    "coverage": "vitest run --coverage",
    "lint": "eslint packages/ --fix",
    "type-check": "tsc -b tsconfig.json",
    "final": "npm run type-check && npm run lint && npm run test",
    "build": "npm run build --workspaces",
    "build:core": "npm run build -w packages/core",
    "build:cli": "npm run build -w packages/cli",
    "build:all": "npm run build -w packages/core && npm run build -w packages/cli && npm run build -w packages/ui"
  }
}
```

**Step 2: Verify build:all works**

```bash
cd /Users/dmitriy/Documents/JOB/lockwise && npm run build:all
```

Expected: all three packages build without errors.

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add build:all script with correct build order"
```

---

## Task 8: README.md

**Files:**
- Create: `README.md` (root)

**Step 1: Create root README.md**

```markdown
# Lockwise

CLI + Web UI for syncing npm dependencies between a public registry and a private Nexus registry.

Lockwise analyzes your lockfile, checks each package against your Nexus registry, scans for known vulnerabilities via OSV.dev, and recommends safe versions that are at least 30 days old. It generates a report and an upload list for packages missing from Nexus.

## Quick Start

```bash
# Install globally
npm install -g @lockwise/cli

# Analyze your project's lockfile
lockwise analyze

# View results in the web dashboard
lockwise ui
```

## Commands

### `lockwise analyze`

Analyze lockfile and check Nexus availability.

| Option               | Description                              | Default            |
| -------------------- | ---------------------------------------- | ------------------ |
| `-l, --lockfile`     | Path to lockfile (auto-detects if omitted) | auto-detect        |
| `-n, --nexus-url`    | Nexus registry URL                       | from config        |
| `-o, --output`       | Output report path                       | `.lockwise/`       |
| `--json`             | Output raw JSON instead of formatted table | `false`            |

Exit codes:
- `0` — all packages are safe and available in Nexus
- `1` — some packages have issues (vulnerabilities, missing from Nexus)
- `2` — analysis failed (lockfile not found, parse error)

### `lockwise serve`

Start API server for the dashboard.

| Option           | Description    | Default |
| ---------------- | -------------- | ------- |
| `-p, --port`     | Server port    | `3001`  |

### `lockwise ui`

Start dashboard with API server. Opens the web UI with full report visualization.

| Option           | Description    | Default |
| ---------------- | -------------- | ------- |
| `-p, --port`     | Server port    | `3000`  |

### `lockwise config`

Print the resolved configuration as JSON. Useful for debugging config file loading.

## Configuration

Lockwise uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) for configuration. It searches for config in the following locations (in order):

- `lockwise.config.ts` / `lockwise.config.js` / `lockwise.config.cjs` / `lockwise.config.mjs`
- `.lockwiserc` / `.lockwiserc.json` / `.lockwiserc.yaml` / `.lockwiserc.yml`
- `.lockwiserc.js` / `.lockwiserc.cjs` / `.lockwiserc.mjs`
- `package.json` — `"lockwise"` field

### Options

| Option            | Type     | Default                                                     | Description                        |
| ----------------- | -------- | ----------------------------------------------------------- | ---------------------------------- |
| `nexusUrl`        | `string` | `REDACTED`          | Nexus registry URL                 |
| `publicRegistry`  | `string` | `https://registry.npmjs.org`                                 | Public npm registry URL            |
| `minAgeDays`      | `number` | `30`                                                         | Minimum package age in days        |
| `lockfile`        | `string` | auto-detect                                                  | Path to lockfile                   |
| `outputDir`       | `string` | `.lockwise`                                                  | Output directory for reports       |
| `servePort`       | `number` | `3001`                                                       | Default port for `lockwise serve`  |
| `uiPort`          | `number` | `3000`                                                       | Default port for `lockwise ui`     |

### Example: lockwise.config.ts

```typescript
export default {
  nexusUrl: 'https://nexus.mycompany.com/repository/npm-proxy',
  minAgeDays: 14,
  servePort: 8080,
};
```

### Example: package.json

```json
{
  "lockwise": {
    "nexusUrl": "https://nexus.mycompany.com/repository/npm-proxy",
    "minAgeDays": 14
  }
}
```

### Example: .lockwiserc.json

```json
{
  "nexusUrl": "https://nexus.mycompany.com/repository/npm-proxy",
  "minAgeDays": 14,
  "outputDir": "reports"
}
```

## Architecture

```
packages/
├── core/     — Lock-file parsing, Nexus/OSV checks, version selection, config loader
├── cli/      — CLI commands (analyze, serve, ui, config), formatters, exit codes
└── ui/       — Vue 3 + Vite dashboard (summary cards, package table, filters)
```

**Dependency direction:** `cli` -> `core`, `ui` -> `core`. UI and CLI do not depend on each other.

**Data flow:**

1. `lockwise analyze` reads and parses the lockfile (npm/yarn/pnpm)
2. Checks each package against Nexus registry (HEAD requests for tarballs)
3. Queries OSV.dev for known vulnerabilities
4. Fetches version metadata from public registry
5. Selects best version per semver range (>= minAgeDays old, no vulns)
6. Categorizes packages: success / due (<30d) / mixed / vulnerable / unavailable
7. Generates report JSON and nexus upload list
8. `lockwise serve` exposes the report via REST API (`/api/report`)
9. `lockwise ui` serves the Vue dashboard + API server together

## Development

### Prerequisites

- Node.js >= 20
- npm >= 10

### Setup

```bash
git clone <repo-url>
cd lockwise
npm install
```

### Scripts

| Script              | Description                                        |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | UI dev server (Vite)                               |
| `npm run build:all` | Build core -> cli -> ui (production)               |
| `npm run test`      | Run all tests (Vitest)                             |
| `npm run test:core` | Core tests only                                    |
| `npm run test:cli`  | CLI tests only                                     |
| `npm run test:ui`   | UI tests only                                      |
| `npm run coverage`  | Coverage report                                    |
| `npm run lint`      | ESLint + auto-fix                                  |
| `npm run type-check`| TypeScript type checking                           |
| `npm run final`     | Full check: type-check + lint + test               |

### Testing

Tests use Vitest. TDD workflow: write test first (red), implement (green), refactor.

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run coverage
```

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add project README with commands, config, and architecture"
```

---

## Task 9: Final Verification

**Step 1: Run full quality check**

```bash
cd /Users/dmitriy/Documents/JOB/lockwise && npm run final
```

Expected: type-check passes, lint passes, all tests pass.

**Step 2: Verify npm pack for core**

```bash
npm pack -w packages/core --dry-run 2>&1
```

Expected: only `dist/`, `package.json`, and metadata files listed. No `src/`, no `.test.ts` files.

**Step 3: Verify npm pack for cli**

```bash
npm pack -w packages/cli --dry-run 2>&1
```

Expected: only `dist/`, `package.json`, and metadata files listed.

**Step 4: Verify config command works**

```bash
cd /Users/dmitriy/Documents/JOB/lockwise && npx -w packages/cli lockwise config 2>&1
```

Expected: prints resolved config as JSON with all default values.

**Step 5: Commit and push**

```bash
git push
```
