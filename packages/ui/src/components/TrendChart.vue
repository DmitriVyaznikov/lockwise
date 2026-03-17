<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ReportListItem } from '../composables/useHistory';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

const props = defineProps<{
  reports: ReportListItem[];
}>();

const chartData = computed(() => {
  const sorted = [...props.reports].reverse();

  const labels = sorted.map((r) =>
    new Date(r.meta.analyzedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  );

  return {
    labels,
    datasets: [
      {
        label: 'Success',
        data: sorted.map((r) => r.summary.success),
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: '#22c55e',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'Due (<30d)',
        data: sorted.map((r) => r.summary.due1month),
        backgroundColor: 'rgba(234, 179, 8, 0.2)',
        borderColor: '#eab308',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'Mixed',
        data: sorted.map((r) => r.summary.mixed),
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        borderColor: '#a855f7',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'Vulnerable',
        data: sorted.map((r) => r.summary.maybeVulnerable),
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: '#ef4444',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#94a3b8',
        usePointStyle: true,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#f1f5f9',
      bodyColor: '#f1f5f9',
      borderColor: '#334155',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(51, 65, 85, 0.5)',
      },
      ticks: {
        color: '#94a3b8',
      },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      grid: {
        color: 'rgba(51, 65, 85, 0.5)',
      },
      ticks: {
        color: '#94a3b8',
        stepSize: 1,
      },
    },
  },
};
</script>

<template>
  <div class="trend-chart">
    <div v-if="reports.length < 2" class="empty-state">
      Need at least 2 reports to show a trend chart.
    </div>
    <div v-else class="chart-container">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<style scoped>
.trend-chart {
  margin-bottom: 32px;
}

.chart-container {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 20px;
  height: 300px;
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
