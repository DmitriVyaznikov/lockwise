import { ref, computed } from 'vue';
import type { DiffResult, ReportListItem } from '@lockwise/core';

export type { DiffResult, ReportListItem };

type HistoryState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; reports: ReportListItem[] }
  | { status: 'error'; message: string };

type DiffState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; diff: DiffResult }
  | { status: 'error'; message: string };

const state = ref<HistoryState>({ status: 'idle' });
const diffState = ref<DiffState>({ status: 'idle' });

export function useHistory() {
  async function fetchReports() {
    state.value = { status: 'loading' };
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data: { items: ReportListItem[] } = await response.json();
      state.value = { status: 'loaded', reports: data.items };
    } catch (error) {
      state.value = {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async function fetchDiff(from: string, to: string) {
    diffState.value = { status: 'loading' };
    try {
      const response = await fetch(`/api/reports/diff?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const diff: DiffResult = await response.json();
      diffState.value = { status: 'loaded', diff };
    } catch (error) {
      diffState.value = {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const reports = computed(() =>
    state.value.status === 'loaded' ? state.value.reports : [],
  );

  const isLoading = computed(() => state.value.status === 'loading');

  const error = computed(() =>
    state.value.status === 'error' ? state.value.message : null,
  );

  const diff = computed(() =>
    diffState.value.status === 'loaded' ? diffState.value.diff : null,
  );

  const isDiffLoading = computed(() => diffState.value.status === 'loading');

  const diffError = computed(() =>
    diffState.value.status === 'error' ? diffState.value.message : null,
  );

  return {
    reports,
    isLoading,
    error,
    fetchReports,
    diff,
    isDiffLoading,
    diffError,
    fetchDiff,
  };
}
