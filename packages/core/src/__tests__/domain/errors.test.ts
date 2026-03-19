import { describe, it, expect } from 'vitest';
import {
  parseError, nexusError, osvError, registryError, validationError,
  formatError,
} from '../../domain/errors.js';

describe('LockwiseError', () => {
  it('should create parse error', () => {
    const e = parseError('npm', 'Invalid JSON');
    expect(e.type).toBe('parse');
    expect(e.format).toBe('npm');
  });

  it('should create nexus error', () => {
    const e = nexusError('http://nexus/pkg', 500);
    expect(e.type).toBe('nexus');
    expect(e.status).toBe(500);
  });

  it('should create osv error', () => {
    const e = osvError(3, new Error('timeout'));
    expect(e.type).toBe('osv');
    expect(e.batch).toBe(3);
  });

  it('should create registry error', () => {
    const e = registryError('express', new Error('404'));
    expect(e.type).toBe('registry');
  });

  it('should create validation error', () => {
    const e = validationError('nexusUrl', 'not-url');
    expect(e.type).toBe('validation');
  });

  it('should format error to readable string', () => {
    const e = parseError('yarn', 'Bad syntax');
    expect(formatError(e)).toContain('yarn');
    expect(formatError(e)).toContain('Bad syntax');
  });
});
