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

import { AIR_QUALITY_SOURCE } from '@/types';

const props = defineProps({
  /** @type {import('vue').PropType<import('@/types').AirQualityResponse | null>} */
  reading: {
    type: Object,
    default: null,
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

const chartOptions = {
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
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'µg/m³',
      },
    },
  },
};

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
      backgroundColor: ['#047857', '#0f766e', '#0369a1', '#4338ca', '#a16207'],
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
  <section class="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
    <h2 class="text-lg font-semibold text-emerald-950">Poluentes</h2>
    <p class="mt-1 text-sm text-emerald-800">
      Barras a partir da consulta à API EcoTrack. Valores nulos ficam em lacuna.
    </p>
    <div
      v-if="shouldMountChart"
      class="mt-4 h-72"
    >
      <Bar
        :data="chartData"
        :options="chartOptions"
      />
    </div>
    <p
      v-else
      class="mt-4 rounded-xl bg-emerald-50 px-4 py-6 text-sm text-emerald-800"
    >
      {{ placeholderMessage }}
    </p>
  </section>
</template>
