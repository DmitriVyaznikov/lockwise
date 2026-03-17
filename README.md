# Lockwise

CLI tool and web dashboard for syncing npm dependencies between a public registry and a private Nexus registry.

## Problem

When using Nexus as a private npm registry, `npm install` fails if any package is missing from Nexus. The workaround is an "optimistic install" against the public registry, then manually figuring out which packages need to be uploaded to Nexus. Lockwise automates this.

## How It Works

1. Switch to the public npm registry and run `npm install` (optimistic install)
2. Run `lockwise analyze` against the generated lock-file
3. Lockwise checks each package's availability on Nexus, scans for vulnerabilities via [OSV.dev](https://osv.dev/), and recommends safe versions
4. Upload the recommended packages to Nexus
5. Switch back to Nexus and install normally

## Features

- **Lock-file parsing** — supports `package-lock.json` (npm v2/v3), `yarn.lock` (classic), `pnpm-lock.yaml`
- **Nexus availability check** — detects which packages are missing from your private registry
- **Vulnerability scanning** — batch checks via OSV.dev API (free, no auth required)
- **Smart version selection** — recommends the best version within semver range:
  - Older than 30 days (configurable)
  - No known vulnerabilities
  - Compatible with your dependency tree
- **Package categorization**:
  | Category | Meaning |
  |---|---|
  | `success` | Safe to upload — old enough, no vulnerabilities |
  | `due1month` | Too fresh — wait before uploading |
  | `mixed` | Has vulnerabilities but fresher versions exist |
  | `maybeVulnerable` | All versions in range have vulnerabilities |
- **Web dashboard** — visual report with filtering, package details, and history (coming soon)
- **CI-friendly** — exit codes and JSON output for pipeline integration (coming soon)

## Project Structure

```
packages/
  core/    — lock-file parsing, Nexus/OSV checks, version analysis
  cli/     — CLI commands and terminal output (coming soon)
  ui/      — Vue 3 + Vite dashboard (coming soon)
```

## Setup

```bash
npm install
```

## Usage (programmatic)

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
console.log(report.nexusUpload.join(' '));
```

## Development

```bash
npm test              # run all tests
npm run test:core     # core tests only
npm run type-check    # TypeScript check
npm run build:core    # build core package
```

## Tech Stack

TypeScript, Vitest, axios, semver, yaml, @yarnpkg/lockfile

## License

MIT
