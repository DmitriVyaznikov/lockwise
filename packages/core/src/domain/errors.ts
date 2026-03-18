export type LockwiseError =
  | { readonly type: 'parse'; readonly format: string; readonly message: string }
  | { readonly type: 'nexus'; readonly url: string; readonly status: number }
  | { readonly type: 'osv'; readonly batch: number; readonly cause: Error }
  | { readonly type: 'registry'; readonly packageName: string; readonly cause: Error }
  | { readonly type: 'validation'; readonly field: string; readonly value: unknown };

export function parseError(format: string, message: string): LockwiseError {
  return { type: 'parse', format, message };
}

export function nexusError(url: string, status: number): LockwiseError {
  return { type: 'nexus', url, status };
}

export function osvError(batch: number, cause: Error): LockwiseError {
  return { type: 'osv', batch, cause };
}

export function registryError(packageName: string, cause: Error): LockwiseError {
  return { type: 'registry', packageName, cause };
}

export function validationError(field: string, value: unknown): LockwiseError {
  return { type: 'validation', field, value };
}

export function formatError(error: LockwiseError): string {
  switch (error.type) {
    case 'parse':
      return `[Parse:${error.format}] ${error.message}`;
    case 'nexus':
      return `[Nexus] ${error.url} returned ${error.status}`;
    case 'osv':
      return `[OSV] Batch ${error.batch} failed: ${error.cause.message}`;
    case 'registry':
      return `[Registry] ${error.packageName}: ${error.cause.message}`;
    case 'validation':
      return `[Validation] Invalid ${error.field}: ${String(error.value)}`;
    default: {
      const _exhaustive: never = error;
      throw new Error(`Unhandled error type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
