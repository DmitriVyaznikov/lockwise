import { describe, it, expect } from 'vitest';
import { formatUploadList } from '../../formatters/upload-list.js';

describe('formatUploadList', () => {
  it('should return success message when no packages to upload', () => {
    const result = formatUploadList([]);
    expect(result).toContain('All packages are available');
  });

  it('should output space-separated name@version entries', () => {
    const packages = ['lodash@4.17.21', 'axios@1.6.2'];
    const result = formatUploadList(packages);
    expect(result).toContain('lodash@4.17.21 axios@1.6.2');
  });

  it('should include header with count', () => {
    const packages = ['a@1.0.0', 'b@2.0.0'];
    const result = formatUploadList(packages);
    expect(result).toContain('2');
  });
});
