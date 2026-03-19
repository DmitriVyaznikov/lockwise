<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useReport } from '../composables/useReport';
import type { PackageResult } from '@lockwise/core';
import CategoryBadge from '../components/CategoryBadge.vue';

const route = useRoute();
const router = useRouter();
const { report, isLoading, error } = useReport();

const packageName = computed(() => route.params.name as string);

const pkg = computed<PackageResult | null>(() => {
  if (!report.value) return null;
  return report.value.packages.find((p) => p.name === packageName.value) ?? null;
});

function cvssColor(score: number): string {
  if (score >= 9) return 'var(--color-error)';
  if (score >= 7) return 'var(--color-error)';
  if (score >= 4) return 'var(--color-warning)';
  return 'var(--color-success)';
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const SAFE_VULN_ID_RE = /^[A-Za-z0-9_\-.]+$/;

function osvUrl(id: string): string | null {
  if (!SAFE_VULN_ID_RE.test(id)) return null;
  return `https://osv.dev/vulnerability/${id}`;
}

function goBack() {
  router.push('/');
}
</script>

<template>
  <div class="detail-page">
    <div v-if="isLoading" class="state-message">Loading report...</div>
    <div v-else-if="error" class="state-message error">Error: {{ error }}</div>
    <div v-else-if="!pkg" class="state-message">
      Package "{{ packageName }}" not found in report.
      <button class="back-btn" @click="goBack">Back to Dashboard</button>
    </div>
    <template v-else>
      <!-- Header Section -->
      <section class="detail-header">
        <button class="back-btn" @click="goBack">Back</button>
        <div class="header-info">
          <h2 class="pkg-name">{{ pkg.name }}</h2>
          <div class="header-meta">
            <span class="meta-item">
              <span class="meta-label">Current:</span>
              <code>{{ pkg.currentVersion }}</code>
            </span>
            <span v-if="pkg.recommendedVersion" class="meta-item">
              <span class="meta-label">Recommended:</span>
              <code>{{ pkg.recommendedVersion }}</code>
            </span>
            <span v-if="pkg.range" class="meta-item">
              <span class="meta-label">Range:</span>
              <code>{{ pkg.range }}</code>
            </span>
            <CategoryBadge :category="pkg.category" />
            <span :class="pkg.isInNexus ? 'nexus-yes' : 'nexus-no'">
              Nexus: {{ pkg.isInNexus ? 'Available' : 'Unavailable' }}
            </span>
          </div>
        </div>
      </section>

      <!-- Versions Timeline -->
      <section class="detail-section">
        <h3>Available Versions</h3>
        <div v-if="!pkg.availableVersions || pkg.availableVersions.length === 0" class="empty-state">
          No version data available from public registry.
        </div>
        <div v-else class="table-wrapper">
          <table class="detail-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Published</th>
                <th>In Nexus</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="v in [...pkg.availableVersions].reverse()"
                :key="v.version"
                :class="{
                  'row-current': v.version === pkg.currentVersion,
                  'row-recommended': v.version === pkg.recommendedVersion,
                }"
              >
                <td>
                  <code>{{ v.version }}</code>
                  <span v-if="v.version === pkg.currentVersion" class="version-tag current-tag">current</span>
                  <span v-if="v.version === pkg.recommendedVersion" class="version-tag recommended-tag">recommended</span>
                </td>
                <td>{{ formatDate(v.publishedAt) }}</td>
                <td>
                  <span :class="v.isInNexus ? 'nexus-yes' : 'nexus-no'">
                    {{ v.isInNexus ? 'Yes' : 'No' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Vulnerabilities -->
      <section class="detail-section">
        <h3>Vulnerabilities</h3>
        <div v-if="pkg.vulnerabilities.length === 0" class="empty-state">
          No known vulnerabilities.
        </div>
        <div v-else class="table-wrapper">
          <table class="detail-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Summary</th>
                <th>CVSS</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="vuln in pkg.vulnerabilities" :key="vuln.id">
                <td>
                  <a
                    v-if="osvUrl(vuln.id)"
                    :href="osvUrl(vuln.id)!"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="vuln-link"
                  >
                    {{ vuln.id }}
                  </a>
                  <span v-else>{{ vuln.id }}</span>
                </td>
                <td>{{ vuln.summary }}</td>
                <td>
                  <span
                    class="cvss-score"
                    :style="{ color: cvssColor(vuln.cvssScore) }"
                  >
                    {{ vuln.cvssScore.toFixed(1) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Consumers -->
      <section class="detail-section">
        <h3>Consumers</h3>
        <div v-if="!pkg.consumers || pkg.consumers.length === 0" class="empty-state">
          Direct dependency only.
        </div>
        <div v-else class="table-wrapper">
          <table class="detail-table">
            <thead>
              <tr>
                <th>Dependent</th>
                <th>Range</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="consumer in pkg.consumers" :key="consumer.name + consumer.range">
                <td>
                  <code>{{ consumer.name || '(root project)' }}</code>
                </td>
                <td>
                  <code>{{ consumer.range }}</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.detail-page {
  max-width: 1000px;
}

.state-message {
  text-align: center;
  padding: 80px 20px;
  color: var(--color-text-secondary);
  font-size: 1.1rem;
}

.state-message.error {
  color: var(--color-error);
}

.back-btn {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.back-btn:hover {
  border-color: var(--color-info);
  color: var(--color-info);
}

.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
}

.header-info {
  flex: 1;
}

.pkg-name {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: var(--font-mono);
  margin-bottom: 8px;
}

.header-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.meta-item {
  font-size: 0.9rem;
}

.meta-label {
  color: var(--color-text-secondary);
  margin-right: 4px;
}

.meta-item code {
  font-family: var(--font-mono);
  background: var(--color-surface);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85rem;
}

.detail-section {
  margin-bottom: 32px;
}

.detail-section h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--color-text);
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

.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.detail-table th,
.detail-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.detail-table thead th {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-table tbody tr:hover {
  background: var(--color-surface-hover);
}

.detail-table code {
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.row-current {
  background: color-mix(in srgb, var(--color-info) 8%, transparent);
}

.row-recommended {
  background: color-mix(in srgb, var(--color-success) 8%, transparent);
}

.version-tag {
  display: inline-block;
  font-size: 0.7rem;
  padding: 1px 6px;
  border-radius: 3px;
  margin-left: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.current-tag {
  background: color-mix(in srgb, var(--color-info) 20%, transparent);
  color: var(--color-info);
}

.recommended-tag {
  background: color-mix(in srgb, var(--color-success) 20%, transparent);
  color: var(--color-success);
}

.nexus-yes { color: var(--color-success); }
.nexus-no { color: var(--color-error); }

.vuln-link {
  color: var(--color-info);
  text-decoration: none;
}

.vuln-link:hover {
  text-decoration: underline;
}

.cvss-score {
  font-weight: 700;
  font-family: var(--font-mono);
}
</style>
