<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { CategoryKey } from '../types';
import { useReport } from '../composables/useReport';
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

const filteredPackages = computed(() => {
  if (!report.value) return [];
  let packages = report.value.packages;

  if (activeCategory.value !== 'all') {
    packages = packages.filter((p) => p.category === activeCategory.value);
  }

  if (debouncedSearch.value.trim()) {
    const query = debouncedSearch.value.toLowerCase();
    packages = packages.filter((p) => p.name.toLowerCase().includes(query));
  }

  return packages;
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
        :nexus-upload="report.nexusUpload"
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
