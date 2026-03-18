import { describe, it, expect } from 'vitest';
import { encodePackageName } from '../../checkers/encode-package-name.js';

describe('encodePackageName', () => {
  it('should pass through regular package names unchanged', () => {
    expect(encodePackageName('lodash')).toBe('lodash');
  });

  it('should preserve scoped package structure', () => {
    expect(encodePackageName('@types/node')).toBe('@types/node');
  });

  it('should encode special characters in regular names', () => {
    expect(encodePackageName('my package')).toBe('my%20package');
  });

  it('should encode special characters in scoped package names', () => {
    expect(encodePackageName('@my scope/my pkg')).toBe('@my%20scope/my%20pkg');
  });

  it('should handle malformed scoped names without slash', () => {
    expect(encodePackageName('@noslash')).toBe(encodeURIComponent('@noslash'));
  });
});
