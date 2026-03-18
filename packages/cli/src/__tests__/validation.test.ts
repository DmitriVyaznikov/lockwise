import { describe, it, expect } from 'vitest';
import { validatePort, isValidHttpUrl } from '../validation.js';

describe('validatePort', () => {
  it('should accept port 1', () => {
    expect(validatePort('1')).toBe(1);
  });

  it('should accept port 3000', () => {
    expect(validatePort('3000')).toBe(3000);
  });

  it('should accept port 65535', () => {
    expect(validatePort('65535')).toBe(65535);
  });

  it('should reject port 0', () => {
    expect(() => validatePort('0')).toThrow();
  });

  it('should reject negative port', () => {
    expect(() => validatePort('-1')).toThrow();
  });

  it('should reject port above 65535', () => {
    expect(() => validatePort('65536')).toThrow();
  });

  it('should reject NaN', () => {
    expect(() => validatePort('abc')).toThrow();
  });

  it('should reject float', () => {
    expect(() => validatePort('3.14')).toThrow();
  });
});

describe('isValidHttpUrl', () => {
  it('should accept http URL', () => {
    expect(isValidHttpUrl('http://example.com')).toBe(true);
  });

  it('should accept https URL', () => {
    expect(isValidHttpUrl('https://example.com/path')).toBe(true);
  });

  it('should reject ftp URL', () => {
    expect(isValidHttpUrl('ftp://example.com')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidHttpUrl('')).toBe(false);
  });

  it('should reject garbage string', () => {
    expect(isValidHttpUrl('not-a-url')).toBe(false);
  });
});
