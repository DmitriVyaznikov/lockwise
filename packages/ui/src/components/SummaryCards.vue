<script setup lang="ts">
import type { LockwiseReport } from '@lockwise/core';

const props = defineProps<{
  report: LockwiseReport;
}>();

const cards = [
  { key: 'total', label: 'Total', color: 'var(--color-info)' },
  { key: 'success', label: 'Success', color: 'var(--color-success)' },
  { key: 'due1month', label: 'Due (<30d)', color: 'var(--color-warning)' },
  { key: 'mixed', label: 'Mixed', color: 'var(--color-mixed)' },
  { key: 'maybeVulnerable', label: 'Vulnerable', color: 'var(--color-error)' },
] as const;

function getCount(key: string): number {
  if (key === 'total') return props.report.meta.totalPackages;
  return props.report.summary[key as keyof typeof props.report.summary] ?? 0;
}
</script>

<template>
  <div class="summary-cards">
    <div
      v-for="card in cards"
      :key="card.key"
      class="card"
      :style="{ '--card-color': card.color }"
    >
      <span class="card-count">{{ getCount(card.key) }}</span>
      <span class="card-label">{{ card.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--card-color);
  border-radius: var(--radius);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-count {
  font-size: 2rem;
  font-weight: 700;
  color: var(--card-color);
  font-family: var(--font-mono);
}

.card-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
