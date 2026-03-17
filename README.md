# Lockwise

CLI tool and web dashboard for syncing npm dependencies between a public registry and a private Nexus registry.

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
npm install
npm run build

# Analyze your project's lockfile
npx lockwise analyze

# Open the web dashboard
npx lockwise ui
```

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
  nexusUrl: 'http://your-nexus.com/repository/npm-group',
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
  core/   — lockfile parsing, Nexus/OSV checks, version analysis, shared types
  cli/    — CLI commands (analyze, serve, ui), formatters, exit codes
  ui/     — Vue 3 + Vite web dashboard
```

## Development

```bash
npm run dev              # UI dev server (Vite)
npm run test             # Run all tests (Vitest)
npm run test:core        # Core tests only
npm run test:cli         # CLI tests only
npm run test:ui          # UI tests only
npm run lint             # ESLint + auto-fix
npm run type-check       # TypeScript check
npm run final            # tests + lint + type-check
npm run coverage         # Coverage report
```

## Tech Stack

TypeScript 5.7, Node.js, Vue 3.4, Vite 6, Chart.js, TanStack Table, Express 5, Commander, Vitest

## License

MIT
