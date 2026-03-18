/**
 * Build a Package URL (PURL) for an npm package.
 *
 * Per the PURL spec, the `@` in scoped package namespaces must be percent-encoded.
 * Example: `@types/node@22.5.0` → `pkg:npm/%40types/node@22.5.0`
 *
 * Note: OSV API accepts both encoded and unencoded forms, but we encode
 * for spec compliance and consistency.
 */
export function buildPurl(packageName: string, version: string): string {
  const encoded = packageName.startsWith('@')
    ? `%40${packageName.slice(1)}`
    : packageName;
  return `pkg:npm/${encoded}@${version}`;
}
