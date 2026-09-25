<script setup>
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';

import { useTheme } from '@/composables/useTheme';
import { AIR_QUALITY_SOURCE } from '@/types';

const props = defineProps({
  /** @type {import('vue').PropType<import('@/types').AirQualityResponse | null>} */
  reading: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const POLLUTANT_BARS = [
  { key: 'pm2_5', label: 'PM2.5' },
  { key: 'pm10', label: 'PM10' },
  { key: 'co', label: 'CO' },
  { key: 'no2', label: 'NO2' },
  { key: 'o3', label: 'O3' },
];

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const { theme } = useTheme();

const chartToken = (name) => {
  theme.value;

  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
};

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => {
          const value = context.parsed.y;

          if (value == null) return '';

          return `${context.label}: ${value} µg/m³`;
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: chartToken('--chart-label') },
      grid: { color: chartToken('--chart-grid') },
    },
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'µg/m³',
        color: chartToken('--chart-label'),
      },
      ticks: { color: chartToken('--chart-label') },
      grid: { color: chartToken('--chart-grid') },
    },
  },
}));

const isFallback = computed(
  () => props.reading?.source === AIR_QUALITY_SOURCE.UNAVAILABLE_FALLBACK,
);
const series = computed(() =>
  POLLUTANT_BARS.map((bar) => {
    const raw = props.reading?.pollutants?.[bar.key];

    if (raw == null || Number.isNaN(Number(raw))) return null;

    return Number(raw);
  }),
);
const hasNumericData = computed(() =>
  series.value.some((value) => value != null),
);
const shouldMountChart = computed(
  () => props.reading != null && !isFallback.value && hasNumericData.value,
);
const chartData = computed(() => ({
  labels: POLLUTANT_BARS.map((bar) => bar.label),
  datasets: [
    {
      label: 'µg/m³',
      data: series.value,
      skipNull: true,
      backgroundColor: [1, 2, 3, 4, 5].map((index) =>
        chartToken(`--chart-${index}`),
      ),
    },
  ],
}));
const placeholderMessage = computed(() => {
  if (!props.reading) {
    return 'O gráfico aparece depois de uma consulta de qualidade do ar.';
  }

  if (isFallback.value) {
    return 'Gráfico indisponível enquanto a leitura está em fallback.';
  }

  return 'Não há concentrações numéricas para montar o gráfico.';
});
</script>

<template>
  <section class="panel p-5">
    <h2 class="text-lg font-semibold text-ink">Poluentes</h2>
    <p class="mt-1 text-sm text-muted">
      Barras a partir da consulta à API EcoTrack. Valores nulos ficam em lacuna.
    </p>
    <div
      v-if="loading"
      class="mt-4 h-72 animate-pulse rounded-ui bg-surface-muted"
      aria-busy="true"
      aria-label="Carregando gráfico de poluentes"
    />
    <div
      v-else-if="shouldMountChart"
      class="mt-4 h-72"
    >
      <Bar
        :data="chartData"
        :options="chartOptions"
      />
    </div>
    <p
      v-else
      class="mt-5 rounded-ui bg-surface-muted px-4 py-6 text-sm text-muted"
    >
      {{ placeholderMessage }}
    </p>
  </section>
</template>
