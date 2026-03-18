# @lockwise/cli

CLI for syncing npm dependencies between a public registry and a private Nexus registry.

## How It Works (main concept)

1. Switch to the public npm registry and run `npm install` (optimistic install)
2. Run `lockwise analyze` against the generated lockfile
3. Lockwise checks each package's availability on Nexus, scans for vulnerabilities via [OSV.dev](https://osv.dev/), and recommends safe versions
4. Upload the recommended packages to Nexus
5. Switch back to Nexus and install normally

### Steps: 

## Install

```bash
npm install -g @lockwise/cli
```

## Quick Start

```bash
# Analyze your project's lockfile
lockwise analyze --nexus-url http://your-nexus/repository/npm-group

# Open the web dashboard
lockwise ui

# Print resolved config
lockwise config
```

## Commands

### `lockwise analyze`

Parses the lockfile, checks each package against Nexus and public registries, queries OSV.dev for vulnerabilities, and generates a categorized report.

```
Options:
  -l, --lockfile <path>   Path to lockfile (auto-detects npm/yarn/pnpm)
  -n, --nexus-url <url>   Nexus registry URL
  -o, --output <path>     Output report path
  --json                  Output raw JSON
```

Exit codes: `0` — all good, `1` — issues found.

### `lockwise ui`

Starts the web dashboard with the built-in API server.

```
Options:
  -p, --port <number>   Server port (default: 3000)
```

### `lockwise serve`

Starts the API server only (without UI).

```
Options:
  -p, --port <number>   Server port (default: 3001)
```

### `lockwise config`

Prints the resolved configuration as JSON.

## Configuration

Lockwise uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig). Create any of these:

- `lockwise.config.ts` / `.lockwiserc.json` / `.lockwiserc.yaml`
- `package.json` → `"lockwise"` field

```json
{
  "nexusUrl": "https://nexus.mycompany.com/repository/npm-proxy",
  "minAgeDays": 14
}
```

CLI flags and environment variables override config file values.

## Links

- [GitHub](https://github.com/DmitriVyaznikov/lockwise)
- [Core package](https://www.npmjs.com/package/@lockwise/core)

## License

MIT
