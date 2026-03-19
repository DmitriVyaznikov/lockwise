# Lockwise

[![npm @lockwise/core](https://img.shields.io/npm/v/@lockwise/core?label=%40lockwise%2Fcore)](https://www.npmjs.com/package/@lockwise/core)
[![npm @lockwise/cli](https://img.shields.io/npm/v/@lockwise/cli?label=%40lockwise%2Fcli)](https://www.npmjs.com/package/@lockwise/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/DmitriVyaznikov/lockwise/blob/main/LICENSE)

CLI tool and web dashboard for syncing npm dependencies between a public registry and a private Nexus registry.

**GitHub:** https://github.com/DmitriVyaznikov/lockwise
**npm:** [@lockwise/core](https://www.npmjs.com/package/@lockwise/core) | [@lockwise/cli](https://www.npmjs.com/package/@lockwise/cli)

## Problem

When using Nexus as a private npm registry, `npm install` fails if any package is missing from Nexus. The workaround is an "optimistic install" against the public registry, then manually figuring out which packages need to be uploaded to Nexus. Lockwise automates this.

## How It Works

1. Switch to the public npm registry and run `npm install` (optimistic install)
2. Run `lockwise analyze` against the generated lockfile
3. Lockwise checks each package's availability on Nexus, scans for vulnerabilities via [OSV.dev](https://osv.dev/), and recommends safe versions
4. Upload the recommended packages to Nexus
5. Switch back to Nexus and install normally

## Quick Start

```bash
# Install globally
npm install -g @lockwise/cli

# Analyze your project's lockfile
lockwise analyze --nexus-url http://your-nexus.example.com/repository/npm-group

# Open the web dashboard
lockwise ui
```

Or use a config file (see [Configuration](#configuration)).

## Configuration

Lockwise uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) for configuration. It searches for config in the following locations:

- `lockwise.config.ts` / `lockwise.config.js` / `lockwise.config.cjs` / `lockwise.config.mjs`
- `.lockwiserc` / `.lockwiserc.json` / `.lockwiserc.yaml` / `.lockwiserc.yml`
- `.lockwiserc.js` / `.lockwiserc.cjs` / `.lockwiserc.mjs`
- `package.json` — `"lockwise"` field

CLI flags and environment variables override config file values.

### Example: lockwise.config.ts

```typescript
export default {
  nexusUrl: 'https://nexus.mycompany.com/repository/npm-proxy',
  minAgeDays: 14,
  servePort: 8080,
};
```

### Example: .lockwiserc.json

```json
{
  "nexusUrl": "https://nexus.mycompany.com/repository/npm-proxy",
  "minAgeDays": 14,
  "outputDir": "reports"
}
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `nexusUrl` | `string` | `http://nexus.action-media.ru/repository/npm-group` | Nexus registry URL |
| `publicRegistry` | `string` | `https://registry.npmjs.org` | Public npm registry URL |
| `minAgeDays` | `number` | `30` | Minimum package age in days |
| `lockfile` | `string` | auto-detect | Path to lockfile |
| `outputDir` | `string` | `.lockwise` | Output directory for reports |
| `servePort` | `number` | `3001` | Default port for `lockwise serve` |
| `uiPort` | `number` | `3000` | Default port for `lockwise ui` |

Environment variables (`LOCKWISE_NEXUS_URL`, `LOCKWISE_PUBLIC_REGISTRY`, `LOCKWISE_MIN_AGE_DAYS`, `LOCKWISE_OUTPUT_DIR`) are also supported. Create a `.env` file — Lockwise loads it automatically.

## CLI Commands

### `lockwise analyze`

Parses the lockfile, checks each package against Nexus and public registries, queries OSV.dev for vulnerabilities, and generates a categorized report.

```bash
lockwise analyze [options]

Options:
  -l, --lockfile <path>   Path to lockfile (auto-detects npm/yarn/pnpm if omitted)
  -n, --nexus-url <url>   Nexus registry URL
  -o, --output <path>     Output report path
  --json                  Output raw JSON instead of formatted table
```

Reports are saved to `.lockwise/reports/` with a timestamp filename plus a `latest.json` symlink.

**Exit codes:**
- `0` — all packages are up-to-date and available in Nexus
- `1` — some packages need attention (due for update, missing from Nexus, or vulnerable)

### `lockwise ui`

Starts the web dashboard with the built-in API server.

```bash
lockwise ui [options]

Options:
  -p, --port <number>   Server port (default: 3000)
```

Open `http://localhost:3000` to view:

- **Dashboard** — sortable package table with category, CVSS score, and Nexus availability
- **Package Detail** — version timeline, vulnerability list, and consumer (dependent) info
- **History** — trend chart across analysis runs, side-by-side diff between any two reports

### `lockwise serve`

Starts the API server only (without the UI static files).

```bash
lockwise serve [options]

Options:
  -p, --port <number>   Server port (default: 3001)
```

### `lockwise config`

Prints the resolved configuration as JSON. Useful for debugging config file loading.

```bash
lockwise config
```

## Features

- **Lockfile parsing** — supports `package-lock.json` (npm v2/v3), `yarn.lock` (classic), `pnpm-lock.yaml`
- **Nexus availability check** — detects which packages are missing from your private registry
- **Vulnerability scanning** — batch checks via OSV.dev API (free, no auth required)
- **Smart version selection** — recommends the best version within semver range: older than 30 days (configurable), no known vulnerabilities, compatible with your dependency tree
- **Web dashboard** — sortable tables, package detail pages, history comparison with trend charts
- **CI-friendly** — exit codes and JSON output for pipeline integration

## Package Categories

| Category | Meaning |
|---|---|
| `success` | Safe to upload — old enough, no vulnerabilities |
| `due1month` | Too fresh — published within the last 30 days |
| `mixed` | Has vulnerabilities but fresher versions exist |
| `maybeVulnerable` | All versions in range have vulnerabilities |
| `unavailable` | Not found in the Nexus registry |

## Programmatic Usage

```typescript
import { detectAndParse, analyze, DEFAULT_CONFIG } from '@lockwise/core';
import fs from 'fs';

const lockfileContent = fs.readFileSync('package-lock.json', 'utf-8');
const parsed = detectAndParse(lockfileContent);

const report = await analyze(parsed, {
  ...DEFAULT_CONFIG,
  nexusUrl: 'http://your-nexus/repository/npm-group',
});

console.log(`Total: ${report.meta.totalPackages}`);
console.log(`Need upload: ${report.nexusUpload.length}`);
```

## API Endpoints

The `serve` and `ui` commands expose:

| Endpoint | Description |
|---|---|
| `GET /api/report` | Latest analysis report |
| `GET /api/reports` | List of all saved reports (history) |
| `GET /api/reports/:filename` | Specific report by filename |
| `GET /api/reports/diff?from=&to=` | Diff between two reports |

## Project Structure

```
packages/
  core/   — lockfile parsing, Nexus/OSV checks, version analysis, config loader
  cli/    — CLI commands (analyze, serve, ui, config), formatters, exit codes
  ui/     — Vue 3 + Vite web dashboard
```

## Development

```bash
git clone https://github.com/DmitriVyaznikov/lockwise.git
cd lockwise
npm install

npm run build:all         # Build core -> cli -> ui
npm run dev               # UI dev server (Vite)
npm run test              # Run all tests (Vitest)
npm run test:core         # Core tests only
npm run test:cli          # CLI tests only
npm run test:ui           # UI tests only
npm run lint              # ESLint + auto-fix
npm run type-check        # TypeScript check
npm run final             # tests + lint + type-check
npm run coverage          # Coverage report
```

### Local usage without publishing

The project uses npm workspaces, so packages resolve each other locally. After building, you can run the CLI directly from the monorepo root:

```bash
npm run build:all
npx lockwise analyze
```

To use the CLI in another project via `npm link`:

```bash
# In the lockwise monorepo
cd packages/cli
npm link

# In your target project
npm link @lockwise/cli
lockwise analyze --nexus-url http://your-nexus/repository/npm-group
```

Changes to TypeScript source require a rebuild (`npm run build:all`) to take effect.

## Tech Stack

TypeScript 5.7, Node.js, Vue 3.4, Vite 6, Chart.js, TanStack Table, Express 5, Commander, Vitest

## License

MIT
