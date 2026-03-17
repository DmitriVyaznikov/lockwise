<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  searchQuery: string;
  nexusUpload: string[];
}>();

const emit = defineEmits<{
  'update:searchQuery': [value: string];
}>();

const copied = ref(false);

async function copyUploadList() {
  try {
    const text = props.nexusUpload.join(' ');
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    console.error('[ToolBar] Failed to copy to clipboard');
  }
}
</script>

<template>
  <div class="toolbar">
    <input
      class="search-input"
      type="text"
      placeholder="Search packages..."
      :value="searchQuery"
      @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
    />
    <button
      v-if="nexusUpload.length > 0"
      class="copy-btn"
      :class="{ copied }"
      @click="copyUploadList"
    >
      {{ copied ? 'Copied!' : `Copy upload list (${nexusUpload.length})` }}
    </button>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
  max-width: 400px;
  padding: 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.9rem;
}

.search-input::placeholder {
  color: var(--color-text-secondary);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-info);
}

.copy-btn {
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.85rem;
  transition: all 0.15s ease;
}

.copy-btn:hover {
  border-color: var(--color-info);
  color: var(--color-info);
}

.copy-btn.copied {
  border-color: var(--color-success);
  color: var(--color-success);
}
</style>
