<script setup lang="ts">
import type { LockwiseReport } from '@lockwise/core';
import type { CategoryKey } from '../types';

const props = defineProps<{
  summary: LockwiseReport['summary'];
  active: CategoryKey;
}>();

const emit = defineEmits<{
  select: [category: CategoryKey];
}>();

const chips: { key: CategoryKey; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: 'var(--color-info)' },
  { key: 'success', label: 'Success', color: 'var(--color-success)' },
  { key: 'due1month', label: 'Due (<30d)', color: 'var(--color-warning)' },
  { key: 'mixed', label: 'Mixed', color: 'var(--color-mixed)' },
  { key: 'maybeVulnerable', label: 'Vulnerable', color: 'var(--color-error)' },
  { key: 'unavailable', label: 'Unavailable', color: 'var(--color-text-secondary)' },
];

function getCount(key: CategoryKey): number | undefined {
  if (key === 'all') return undefined;
  return props.summary[key];
}
</script>

<template>
  <div class="category-filter">
    <button
      v-for="chip in chips"
      :key="chip.key"
      class="chip"
      :class="{ active: active === chip.key }"
      :style="{ '--chip-color': chip.color }"
      @click="emit('select', chip.key)"
    >
      {{ chip.label }}
      <span v-if="getCount(chip.key) !== undefined" class="chip-count">
        {{ getCount(chip.key) }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.category-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.chip {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  transition: all 0.15s ease;
}

.chip:hover {
  border-color: var(--chip-color);
  color: var(--chip-color);
}

.chip.active {
  background: var(--chip-color);
  border-color: var(--chip-color);
  color: var(--color-bg);
  font-weight: 600;
}

.chip-count {
  margin-left: 4px;
  opacity: 0.7;
}
</style>
