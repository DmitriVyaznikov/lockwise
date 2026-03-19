import { describe, it, expect } from 'vitest';
import { formatTable } from '../../formatters/table.js';
import type { PackageResult } from '@lockwise/core';

const mockPackages: PackageResult[] = [
  {
    name: 'lodash',
    currentVersion: '4.17.21',
    recommendedVersion: '4.17.21',
    category: 'success',
    vulnerabilities: [],
    isInNexus: true,
    maxCvss: 0,
    availableVersions: [],
    consumers: [],
    range: '^4.17.0',
  },
  {
    name: 'axios',
    currentVersion: '1.6.0',
    recommendedVersion: '1.6.2',
    category: 'mixed',
    vulnerabilities: [{ id: 'GHSA-abc', summary: 'XSS', cvssScore: 7.5 }],
    isInNexus: false,
    maxCvss: 7.5,
    availableVersions: [],
    consumers: [],
    range: '^1.6.0',
  },
  {
    name: 'new-pkg',
    currentVersion: '0.1.0',
    recommendedVersion: null,
    category: 'due1month',
    vulnerabilities: [],
    isInNexus: false,
    maxCvss: 0,
    availableVersions: [],
    consumers: [],
    range: '^0.1.0',
  },
  {
    name: 'mid-vuln',
    currentVersion: '2.0.0',
    recommendedVersion: '2.0.1',
    category: 'maybeVulnerable',
    vulnerabilities: [{ id: 'GHSA-mid', summary: 'SSRF', cvssScore: 5.5 }],
    isInNexus: true,
    maxCvss: 5.5,
    availableVersions: [],
    consumers: [],
    range: '^2.0.0',
  },
  {
    name: 'low-vuln',
    currentVersion: '1.0.0',
    recommendedVersion: '1.0.1',
    category: 'maybeVulnerable',
    vulnerabilities: [{ id: 'GHSA-low', summary: 'Info leak', cvssScore: 2.0 }],
    isInNexus: true,
    maxCvss: 2.0,
    availableVersions: [],
    consumers: [],
    range: '^1.0.0',
  },
];

describe('formatTable', () => {
  it('should include all package names', () => {
    const result = formatTable(mockPackages);
    expect(result).toContain('lodash');
    expect(result).toContain('axios');
    expect(result).toContain('new-pkg');
  });

  it('should include version information', () => {
    const result = formatTable(mockPackages);
    expect(result).toContain('4.17.21');
    expect(result).toContain('1.6.2');
  });

  it('should include category labels', () => {
    const result = formatTable(mockPackages);
    expect(result).toContain('success');
    expect(result).toContain('mixed');
    expect(result).toContain('due1month');
  });

  it('should show CVSS score for vulnerable packages', () => {
    const result = formatTable(mockPackages);
    expect(result).toContain('7.5');
  });

  it('should show nexus status', () => {
    const result = formatTable(mockPackages);
    expect(result).toMatch(/yes|✓/i);
    expect(result).toMatch(/no|✗/i);
  });

  it('should return empty table message when no packages', () => {
    const result = formatTable([]);
    expect(result).toContain('No packages');
  });

  it('should filter packages by category when filter is provided', () => {
    const result = formatTable(mockPackages, 'success');
    expect(result).toContain('lodash');
    expect(result).not.toContain('axios');
  });

  it('should color medium CVSS scores in yellow range', () => {
    const result = formatTable(mockPackages);
    expect(result).toContain('5.5');
  });

  it('should color low CVSS scores as dim', () => {
    const result = formatTable(mockPackages);
    expect(result).toContain('2.0');
  });
});
