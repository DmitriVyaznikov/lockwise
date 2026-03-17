import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LockwiseReport } from '@lockwise/core';
import { useReport } from './useReport';

const mockReport: LockwiseReport = {
  meta: { lockfileType: 'npm', analyzedAt: '2026-03-17T10:00:00.000Z', totalPackages: 3 },
  packages: [],
  summary: { success: 3, due1month: 0, mixed: 0, maybeVulnerable: 0, unavailable: 0 },
  nexusUpload: [],
};

describe('useReport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const { state } = useReport();
    state.value = { status: 'idle' };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should start with idle state', () => {
    const { report, isLoading, error } = useReport();
    expect(report.value).toBeNull();
    expect(isLoading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it('should set loading state when fetching', async () => {
    const fetchPromise = new Promise<Response>(() => {});
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(fetchPromise));

    const { isLoading, fetchReport } = useReport();
    fetchReport();

    await vi.waitFor(() => {
      expect(isLoading.value).toBe(true);
    });
  });

  it('should load report on successful fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockReport),
    }));

    const { report, isLoading, error, fetchReport } = useReport();
    await fetchReport();

    expect(report.value).toEqual(mockReport);
    expect(isLoading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it('should set error state on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const { report, error, fetchReport } = useReport();
    await fetchReport();

    expect(report.value).toBeNull();
    expect(error.value).toBe('HTTP 500');
  });

  it('should set error state on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { report, error, fetchReport } = useReport();
    await fetchReport();

    expect(report.value).toBeNull();
    expect(error.value).toBe('Network error');
  });

  it('should share state across multiple useReport calls', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockReport),
    }));

    const first = useReport();
    const second = useReport();

    await first.fetchReport();

    expect(second.report.value).toEqual(mockReport);
    expect(second.isLoading.value).toBe(false);
  });

  it('should stringify non-Error thrown values', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('string error'));

    const { error, fetchReport } = useReport();
    await fetchReport();

    expect(error.value).toBe('string error');
  });
});
