<script setup lang="ts">
import {
  useVueTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  FlexRender,
} from '@tanstack/vue-table';
import type { SortingState } from '@tanstack/vue-table';
import { RouterLink } from 'vue-router';
import { ref } from 'vue';
import type { PackageResult } from '@lockwise/core';

const props = defineProps<{
  packages: PackageResult[];
}>();

function cvssClass(score: number | null): string {
  if (score === null) return 'cvss-none';
  if (score >= 7) return 'cvss-high';
  if (score >= 4) return 'cvss-medium';
  return 'cvss-low';
}

const sorting = ref<SortingState>([]);

const columnHelper = createColumnHelper<PackageResult>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('currentVersion', {
    header: 'Current',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('recommendedVersion', {
    header: 'Recommended',
    cell: (info) => info.getValue() ?? '—',
  }),
  columnHelper.accessor('category', {
    header: 'Category',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor((row) => {
    if (row.vulnerabilities.length === 0) return null;
    return Math.max(...row.vulnerabilities.map((v) => v.cvssScore));
  }, {
    id: 'cvss',
    header: 'CVSS',
    cell: (info) => {
      const val = info.getValue();
      return val !== null ? val.toFixed(1) : '—';
    },
  }),
  columnHelper.accessor('nexusAvailable', {
    header: 'Nexus',
    cell: (info) => (info.getValue() ? 'Yes' : 'No'),
  }),
];

const table = useVueTable({
  get data() {
    return props.packages;
  },
  columns,
  state: {
    get sorting() {
      return sorting.value;
    },
  },
  onSortingChange: (updater) => {
    sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater;
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
});
</script>

<template>
  <div class="table-wrapper">
    <table class="pkg-table">
      <thead>
        <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
          <th
            v-for="header in headerGroup.headers"
            :key="header.id"
            role="columnheader"
            :class="{ sortable: header.column.getCanSort() }"
            :aria-sort="header.column.getIsSorted() === 'asc' ? 'ascending' : header.column.getIsSorted() === 'desc' ? 'descending' : 'none'"
            @click="header.column.getToggleSortingHandler()?.($event)"
          >
            <div class="th-content">
              <FlexRender
                :render="header.column.columnDef.header"
                :props="header.getContext()"
              />
              <span v-if="header.column.getIsSorted()" class="sort-indicator">
                {{ header.column.getIsSorted() === 'asc' ? '↑' : '↓' }}
              </span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in table.getRowModel().rows" :key="row.id">
          <td v-for="cell in row.getVisibleCells()" :key="cell.id">
            <RouterLink
              v-if="cell.column.id === 'name'"
              :to="`/package/${cell.getValue()}`"
              class="pkg-link"
            >
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </RouterLink>
            <span
              v-else-if="cell.column.id === 'category'"
              class="category-badge"
              :data-category="cell.getValue()"
            >
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </span>
            <span
              v-else-if="cell.column.id === 'nexusAvailable'"
              :class="cell.getValue() ? 'nexus-yes' : 'nexus-no'"
            >
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </span>
            <span
              v-else-if="cell.column.id === 'cvss'"
              :class="cvssClass(cell.getValue() as number | null)"
            >
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </span>
            <template v-else>
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </template>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="packages.length === 0" class="empty">No packages to display.</p>
  </div>
</template>


<style scoped>
.table-wrapper {
  overflow-x: auto;
}

.pkg-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.pkg-table th,
.pkg-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.pkg-table thead th {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: sticky;
  top: 0;
}

.pkg-table tbody tr:hover {
  background: var(--color-surface-hover);
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.th-content {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sort-indicator {
  font-size: 0.75rem;
}

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

.nexus-yes { color: var(--color-success); }
.nexus-no { color: var(--color-error); }

.cvss-high { color: var(--color-error); font-weight: 700; }
.cvss-medium { color: var(--color-warning); }
.cvss-low { color: var(--color-text-secondary); }
.cvss-none { color: var(--color-text-secondary); opacity: 0.5; }

.pkg-link {
  color: var(--color-info);
  text-decoration: none;
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.pkg-link:hover {
  text-decoration: underline;
}

.empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 40px;
}
</style>
