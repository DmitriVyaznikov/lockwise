<script setup lang="ts">
defineProps<{
  category: string;
}>();
</script>

<template>
  <span class="category-badge" :data-category="category">
    <slot>{{ category }}</slot>
  </span>
</template>

<style scoped>
.category-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.category-badge[data-category='success'] {
  background: color-mix(in srgb, var(--color-success) 20%, transparent);
  color: var(--color-success);
}
.category-badge[data-category='due1month'] {
  background: color-mix(in srgb, var(--color-warning) 20%, transparent);
  color: var(--color-warning);
}
.category-badge[data-category='mixed'] {
  background: color-mix(in srgb, var(--color-mixed) 20%, transparent);
  color: var(--color-mixed);
}
.category-badge[data-category='maybeVulnerable'] {
  background: color-mix(in srgb, var(--color-error) 20%, transparent);
  color: var(--color-error);
}
.category-badge[data-category='unavailable'] {
  background: color-mix(in srgb, var(--color-text-secondary) 20%, transparent);
  color: var(--color-text-secondary);
}
</style>
