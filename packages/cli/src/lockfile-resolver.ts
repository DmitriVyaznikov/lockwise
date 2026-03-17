import fs from 'node:fs';
import path from 'node:path';

const LOCKFILE_NAMES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'] as const;

export function resolveLockfile(explicitPath: string | undefined): string {
  if (explicitPath) {
    if (!fs.existsSync(explicitPath)) {
      throw new Error(`Lockfile not found: ${explicitPath}`);
    }
    return path.resolve(explicitPath);
  }

  const cwd = process.cwd();
  for (const name of LOCKFILE_NAMES) {
    const fullPath = path.join(cwd, name);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  throw new Error('No lockfile found. Looked for: package-lock.json, yarn.lock, pnpm-lock.yaml');
}
