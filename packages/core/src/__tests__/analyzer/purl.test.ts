import { describe, it, expect } from 'vitest';
import { buildPurl } from '../../analyzer/purl.js';

describe('buildPurl', () => {
  it('should build PURL for regular package', () => {
    expect(buildPurl('axios', '1.7.2')).toBe('pkg:npm/axios@1.7.2');
  });

  it('should percent-encode @ in scoped package names', () => {
    expect(buildPurl('@types/node', '22.5.0')).toBe('pkg:npm/%40types/node@22.5.0');
  });

  it('should handle deeply scoped packages', () => {
    expect(buildPurl('@angular/core', '17.0.0')).toBe('pkg:npm/%40angular/core@17.0.0');
  });
});
