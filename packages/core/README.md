# @lockwise/core

Core analysis engine for syncing npm dependencies between a public registry and a private Nexus registry.

## Install

```bash
npm install @lockwise/core
```

## Usage

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

## Features

- **Lockfile parsing** — `package-lock.json` (npm v2/v3), `yarn.lock` (classic), `pnpm-lock.yaml`
- **Nexus availability check** — detects packages missing from your private registry
- **Vulnerability scanning** — batch checks via OSV.dev API
- **Smart version selection** — recommends the best version within semver range (>= 30 days old, no known vulns)
- **Config loader** — cosmiconfig-based configuration from files, env vars, or defaults

## Configuration

```typescript
import { loadConfig } from '@lockwise/core';

const config = await loadConfig(); // searches for lockwise.config.ts, .lockwiserc.json, etc.
```

| Option | Type | Default |
|---|---|---|
| `nexusUrl` | `string` | `http://nexus.action-media.ru/repository/npm-group` |
| `publicRegistry` | `string` | `https://registry.npmjs.org` |
| `minAgeDays` | `number` | `30` |
| `outputDir` | `string` | `.lockwise` |
| `servePort` | `number` | `3001` |
| `uiPort` | `number` | `3000` |

## Links

- [GitHub](https://github.com/DmitriVyaznikov/lockwise)
- [CLI package](https://www.npmjs.com/package/@lockwise/cli)

## License

MIT
