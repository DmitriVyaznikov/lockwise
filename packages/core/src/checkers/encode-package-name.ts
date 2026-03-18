export function encodePackageName(name: string): string {
  if (!name.startsWith('@')) {
    return encodeURIComponent(name);
  }

  const slashIndex = name.indexOf('/');
  if (slashIndex === -1) {
    return encodeURIComponent(name);
  }

  const scope = name.slice(1, slashIndex);
  const pkg = name.slice(slashIndex + 1);
  return `@${encodeURIComponent(scope)}/${encodeURIComponent(pkg)}`;
}
