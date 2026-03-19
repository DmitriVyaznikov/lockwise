<script setup lang="ts">
import type { DiffResult } from '@lockwise/core';
import CategoryBadge from './CategoryBadge.vue';

defineProps<{
  diff: DiffResult;
}>();
</script>

<template>
  <div class="diff-view">
    <!-- Added Packages -->
    <section v-if="diff.added.length > 0" class="diff-section">
      <h4 class="diff-heading added-heading">
        Added ({{ diff.added.length }})
      </h4>
      <div class="table-wrapper">
        <table class="diff-table">
          <thead>
            <tr>
              <th>Package</th>
              <th>Version</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pkg in diff.added" :key="pkg.name" class="row-added">
              <td><code>{{ pkg.name }}</code></td>
              <td><code>{{ pkg.currentVersion }}</code></td>
              <td>
                <CategoryBadge :category="pkg.category" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Removed Packages -->
    <section v-if="diff.removed.length > 0" class="diff-section">
      <h4 class="diff-heading removed-heading">
        Removed ({{ diff.removed.length }})
      </h4>
      <div class="table-wrapper">
        <table class="diff-table">
          <thead>
            <tr>
              <th>Package</th>
              <th>Version</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pkg in diff.removed" :key="pkg.name" class="row-removed">
              <td><code>{{ pkg.name }}</code></td>
              <td><code>{{ pkg.currentVersion }}</code></td>
              <td>
                <CategoryBadge :category="pkg.category" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Changed Category -->
    <section v-if="diff.changed.length > 0" class="diff-section">
      <h4 class="diff-heading changed-heading">
        Changed ({{ diff.changed.length }})
      </h4>
      <div class="table-wrapper">
        <table class="diff-table">
          <thead>
            <tr>
              <th>Package</th>
              <th>Was</th>
              <th>Now</th>
              <th>Version Change</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in diff.changed" :key="item.name" class="row-changed">
              <td><code>{{ item.name }}</code></td>
              <td>
                <CategoryBadge :category="item.from.category" />
              </td>
              <td>
                <CategoryBadge :category="item.to.category" />
              </td>
              <td>
                <code v-if="item.from.version !== item.to.version">
                  {{ item.from.version }} -> {{ item.to.version }}
                </code>
                <span v-else class="no-change">same version</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- No Changes -->
    <div
      v-if="diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0"
      class="empty-state"
    >
      No differences between these two reports.
    </div>
  </div>
</template>

<style scoped>
.diff-view {
  margin-top: 24px;
}

.diff-section {
  margin-bottom: 24px;
}

.diff-heading {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 8px;
  padding: 6px 12px;
  border-radius: var(--radius);
}

.added-heading {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
}

.removed-heading {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.changed-heading {
  color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 10%, transparent);
}

.table-wrapper {
  overflow-x: auto;
}

.diff-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.diff-table th,
.diff-table td {
  padding: 8px 14px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.diff-table thead th {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.diff-table code {
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.row-added {
  background: color-mix(in srgb, var(--color-success) 5%, transparent);
}

.row-removed {
  background: color-mix(in srgb, var(--color-error) 5%, transparent);
}

.row-changed {
  background: color-mix(in srgb, var(--color-warning) 5%, transparent);
}

.no-change {
  color: var(--color-text-secondary);
  font-style: italic;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
}
</style>
