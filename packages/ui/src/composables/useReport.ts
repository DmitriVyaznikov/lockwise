import { ref, computed } from 'vue';
import type { LockwiseReport } from '@lockwise/core';

type ReportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; report: LockwiseReport }
  | { status: 'error'; message: string };

const state = ref<ReportState>({ status: 'idle' });

export function useReport() {
  async function fetchReport() {
    state.value = { status: 'loading' };
    try {
      const response = await fetch('/api/report');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const report: LockwiseReport = await response.json();
      state.value = { status: 'loaded', report };
    } catch (error) {
      state.value = {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const report = computed(() =>
    state.value.status === 'loaded' ? state.value.report : null,
  );

  const isLoading = computed(() => state.value.status === 'loading');

  const error = computed(() =>
    state.value.status === 'error' ? state.value.message : null,
  );

  return { state, report, isLoading, error, fetchReport };
}
