import { describe, it, expect } from 'vitest';
import { formatUploadList } from '../../formatters/upload-list.js';

describe('formatUploadList', () => {
  it('should return success message when no packages to upload', () => {
    const result = formatUploadList([]);
    expect(result).toContain('All packages are available');
  });

  it('should list all URLs when packages need uploading', () => {
    const urls = [
      'http://nexus/repository/npm/-/lodash-4.17.21.tgz',
      'http://nexus/repository/npm/-/axios-1.6.2.tgz',
    ];
    const result = formatUploadList(urls);
    expect(result).toContain('lodash-4.17.21.tgz');
    expect(result).toContain('axios-1.6.2.tgz');
  });

  it('should include header with count', () => {
    const urls = ['http://nexus/a.tgz', 'http://nexus/b.tgz'];
    const result = formatUploadList(urls);
    expect(result).toContain('2');
  });
});
