<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { CATEGORY_LABELS } from '../types';
import type { CategoryKey } from '../types';
import { useReport } from '../composables/useReport';
import { buildUploadEntries } from '../utils/build-upload-entries';
import SummaryCards from '../components/SummaryCards.vue';
import CategoryFilter from '../components/CategoryFilter.vue';
import ToolBar from '../components/ToolBar.vue';
import PackageTable from '../components/PackageTable.vue';

const { report, isLoading, error, fetchReport } = useReport();

const activeCategory = ref<CategoryKey>('all');
const searchQuery = ref('');
const debouncedSearch = ref('');

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

watch(searchQuery, (value) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = value;
  }, 300);
});

onUnmounted(() => {
  clearTimeout(debounceTimer);
});

const categoryPackages = computed(() => {
  if (!report.value) return [];
  if (activeCategory.value === 'all') return [...report.value.packages];
  return report.value.packages.filter((p) => p.category === activeCategory.value);
});

const uploadPackages = computed(() => buildUploadEntries(categoryPackages.value));

const categoryLabel = computed(() => CATEGORY_LABELS[activeCategory.value]);

const filteredPackages = computed(() => {
  if (!debouncedSearch.value.trim()) return categoryPackages.value;
  const query = debouncedSearch.value.toLowerCase();
  return categoryPackages.value.filter((p) => p.name.toLowerCase().includes(query));
});

onMounted(fetchReport);
</script>

<template>
  <div class="dashboard">
    <div v-if="isLoading" class="state-message">Loading report...</div>
    <div v-else-if="error" class="state-message error">Error: {{ error }}</div>
    <template v-else-if="report">
      <SummaryCards :report="report" />
      <CategoryFilter
        :summary="report.summary"
        :active="activeCategory"
        @select="activeCategory = $event"
      />
      <ToolBar
        v-model:search-query="searchQuery"
        :upload-packages="uploadPackages"
        :category-label="categoryLabel"
      />
      <PackageTable :packages="filteredPackages" />
    </template>
  </div>
</template>

<style scoped>
.state-message {
  text-align: center;
  padding: 80px 20px;
  color: var(--color-text-secondary);
  font-size: 1.1rem;
}

.state-message.error {
  color: var(--color-error);
}
</style>
