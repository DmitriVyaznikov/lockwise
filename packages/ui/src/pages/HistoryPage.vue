<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useHistory } from '../composables/useHistory';
import DiffView from '../components/DiffView.vue';
import TrendChart from '../components/TrendChart.vue';

const {
  reports,
  isLoading,
  error,
  fetchReports,
  diff,
  isDiffLoading,
  diffError,
  fetchDiff,
} = useHistory();

const selectedFrom = ref<string | null>(null);
const selectedTo = ref<string | null>(null);

const canCompare = computed(() => {
  return selectedFrom.value !== null
    && selectedTo.value !== null
    && selectedFrom.value !== selectedTo.value;
});

function toggleSelection(filename: string) {
  if (selectedFrom.value === filename) {
    selectedFrom.value = null;
    return;
  }
  if (selectedTo.value === filename) {
    selectedTo.value = null;
    return;
  }
  if (selectedFrom.value === null) {
    selectedFrom.value = filename;
  } else if (selectedTo.value === null) {
    selectedTo.value = filename;
  } else {
    selectedFrom.value = selectedTo.value;
    selectedTo.value = filename;
  }
}

function isSelected(filename: string): boolean {
  return selectedFrom.value === filename || selectedTo.value === filename;
}

function selectionLabel(filename: string): string | null {
  if (selectedFrom.value === filename) return 'FROM';
  if (selectedTo.value === filename) return 'TO';
  return null;
}

async function compare() {
  if (!selectedFrom.value || !selectedTo.value) return;
  await fetchDiff(selectedFrom.value, selectedTo.value);
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

onMounted(fetchReports);
</script>

<template>
  <div class="history-page">
    <h2>Analysis History</h2>

    <div v-if="isLoading" class="state-message">Loading reports...</div>
    <div v-else-if="error" class="state-message error">Error: {{ error }}</div>
    <template v-else>
      <!-- Trend Chart -->
      <section class="history-section">
        <h3>Category Trend</h3>
        <TrendChart :reports="reports" />
      </section>

      <!-- Run List Table -->
      <section class="history-section">
        <div class="table-header">
          <h3>Reports</h3>
          <button
            class="compare-btn"
            :disabled="!canCompare"
            @click="compare"
          >
            Compare Selected
          </button>
        </div>
        <div v-if="reports.length === 0" class="empty-state">
          No reports found. Run "lockwise analyze" to generate reports.
        </div>
        <div v-else class="table-wrapper">
          <table class="history-table">
            <thead>
              <tr>
                <th class="col-select">Select</th>
                <th>Date</th>
                <th>Lockfile</th>
                <th>Total</th>
                <th>Success</th>
                <th>Due</th>
                <th>Mixed</th>
                <th>Vulnerable</th>
                <th>Unavailable</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in reports"
                :key="item.filename"
                :class="{ 'row-selected': isSelected(item.filename) }"
                @click="toggleSelection(item.filename)"
              >
                <td class="col-select">
                  <span v-if="selectionLabel(item.filename)" class="selection-badge">
                    {{ selectionLabel(item.filename) }}
                  </span>
                  <span v-else class="selection-circle" />
                </td>
                <td>{{ formatDate(item.meta.analyzedAt) }}</td>
                <td>{{ item.meta.lockfileType }}</td>
                <td>{{ item.meta.totalPackages }}</td>
                <td class="count-success">{{ item.summary.success }}</td>
                <td class="count-due">{{ item.summary.due1month }}</td>
                <td class="count-mixed">{{ item.summary.mixed }}</td>
                <td class="count-vuln">{{ item.summary.maybeVulnerable }}</td>
                <td class="count-unavailable">{{ item.summary.unavailable }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Diff View -->
      <section v-if="isDiffLoading" class="history-section">
        <div class="state-message">Computing diff...</div>
      </section>
      <section v-else-if="diffError" class="history-section">
        <div class="state-message error">Diff error: {{ diffError }}</div>
      </section>
      <section v-else-if="diff" class="history-section">
        <h3>Comparison Result</h3>
        <DiffView :diff="diff" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.history-page h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 24px;
}

.state-message {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-secondary);
  font-size: 1rem;
}

.state-message.error {
  color: var(--color-error);
}

.history-section {
  margin-bottom: 32px;
}

.history-section h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.compare-btn {
  padding: 8px 20px;
  border: 1px solid var(--color-info);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--color-info) 15%, transparent);
  color: var(--color-info);
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.15s ease;
}

.compare-btn:hover:not(:disabled) {
  background: var(--color-info);
  color: var(--color-bg);
}

.compare-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
}

.table-wrapper {
  overflow-x: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.history-table th,
.history-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.history-table thead th {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.history-table tbody tr {
  cursor: pointer;
  transition: background 0.1s ease;
}

.history-table tbody tr:hover {
  background: var(--color-surface-hover);
}

.row-selected {
  background: color-mix(in srgb, var(--color-info) 10%, transparent) !important;
}

.col-select {
  width: 60px;
  text-align: center;
}

.selection-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  background: var(--color-info);
  color: var(--color-bg);
  letter-spacing: 0.05em;
}

.selection-circle {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
}

.count-success { color: var(--color-success); }
.count-due { color: var(--color-warning); }
.count-mixed { color: var(--color-mixed); }
.count-vuln { color: var(--color-error); }
.count-unavailable { color: var(--color-text-secondary); }
</style>
