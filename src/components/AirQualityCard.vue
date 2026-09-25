<script setup>
import { computed, onUnmounted, ref, watch } from 'vue';

import ButtonStandard from '@/components/ui/ButtonStandard.vue';
import { AIR_QUALITY_SOURCE } from '@/types';

const props = defineProps({
  status: {
    type: String,
    default: 'empty',
    validator: (value) =>
      ['loading', 'error', 'empty', 'ready'].includes(value),
  },
  /** @type {import('vue').PropType<import('@/types').AirQualityResponse | null>} */
  reading: {
    type: Object,
    default: null,
  },
  /** @type {import('vue').PropType<import('@/types').ApiError | null>} */
  error: {
    type: Object,
    default: null,
  },
});

const POLLUTANT_ROWS = [
  { key: 'pm2_5', label: 'PM2.5' },
  { key: 'pm10', label: 'PM10' },
  { key: 'co', label: 'CO' },
  { key: 'no2', label: 'NO2' },
  { key: 'o3', label: 'O3' },
];

const AQI_TONE = {
  1: 'bg-emerald-600 text-white',
  2: 'bg-lime-500 text-lime-950',
  3: 'bg-yellow-400 text-yellow-950',
  4: 'bg-orange-500 text-white',
  5: 'bg-red-600 text-white',
};

const AQI_LABEL = {
  1: 'Bom',
  2: 'Razoável',
  3: 'Moderado',
  4: 'Ruim',
  5: 'Péssimo',
};

const SOURCE_LABEL = {
  [AIR_QUALITY_SOURCE.CACHE]: 'cache',
  [AIR_QUALITY_SOURCE.OPENWEATHER]: 'openweather',
  [AIR_QUALITY_SOURCE.UNAVAILABLE_FALLBACK]: 'indisponível',
};

/** @type {ReturnType<typeof setInterval> | null} */
let countdownId = null;

const emit = defineEmits(['retry']);

const secondsLeft = ref(0);

const isRateLimited = computed(
  () => props.status === 'error' && props.error?.status === 429,
);
const retryDisabled = computed(
  () => isRateLimited.value && secondsLeft.value > 0,
);
const isFallback = computed(
  () =>
    props.status === 'ready' &&
    props.reading?.source === AIR_QUALITY_SOURCE.UNAVAILABLE_FALLBACK,
);
const aqiClass = computed(() => {
  const aqi = props.reading?.aqi;

  if (aqi == null) return 'bg-surface-muted text-muted';

  return AQI_TONE[aqi] ?? 'bg-surface-muted text-ink';
});

const clearCountdown = () => {
  if (countdownId != null) {
    clearInterval(countdownId);
    countdownId = null;
  }
};

/**
 * @param {string | null | undefined} value
 */
const formatFetchedAt = (value) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

/**
 * @param {number | null | undefined} value
 */
const formatConcentration = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';

  return `${Number(value)} µg/m³`;
};

const syncRetryCountdown = () => {
  clearCountdown();

  const wait =
    props.status === 'error' && props.error?.status === 429
      ? props.error.retryAfterSeconds
      : null;

  if (wait == null || wait <= 0) {
    secondsLeft.value = 0;
    return;
  }

  secondsLeft.value = wait;

  countdownId = setInterval(() => {
    secondsLeft.value -= 1;

    if (secondsLeft.value <= 0) {
      secondsLeft.value = 0;
      clearCountdown();
    }
  }, 1000);
};

watch(
  () => [props.status, props.error?.status, props.error?.retryAfterSeconds],
  syncRetryCountdown,
  { immediate: true },
);

onUnmounted(clearCountdown);
</script>

<template>
  <section
    class="panel p-5"
    aria-live="polite"
  >
    <header class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-ink">Qualidade do ar</h2>
        <p class="mt-1 text-sm text-muted">
          O índice AQI (1 a 5) resume a situação geral do ar; abaixo, a
          concentração de cada poluente em µg/m³.
        </p>
      </div>
      <span
        v-if="status === 'ready' && reading"
        class="rounded-ui bg-accent-soft px-3 py-1 text-xs font-medium
          tracking-wide text-ink uppercase"
      >
        {{ SOURCE_LABEL[reading.source] ?? reading.source }}
      </span>
    </header>

    <div
      v-if="status === 'loading'"
      class="mt-5 space-y-3"
      aria-busy="true"
    >
      <div class="h-16 animate-pulse rounded-ui bg-surface-muted" />
      <div
        v-for="row in POLLUTANT_ROWS"
        :key="row.key"
        class="h-10 animate-pulse rounded-ui bg-surface-muted"
      />
    </div>

    <p
      v-else-if="status === 'empty'"
      class="mt-5 rounded-ui bg-surface-muted px-4 py-6 text-sm text-muted"
    >
      Nenhuma consulta de ar ainda. Escolha um alerta para ver a leitura.
    </p>

    <div
      v-else-if="status === 'error'"
      class="mt-5 rounded-ui border border-warning/30 bg-warning-soft px-4 py-4
        text-sm text-warning-ink"
    >
      <p v-if="isRateLimited">
        Muitas consultas em pouco tempo.
        <template v-if="secondsLeft > 0">
          Tente de novo em {{ secondsLeft }} s.
        </template>
        <template v-else>Você já pode tentar de novo.</template>
      </p>
      <p v-else>
        {{ error?.message || 'Não foi possível carregar a qualidade do ar.' }}
      </p>
      <ButtonStandard
        class="mt-3"
        :disabled="retryDisabled"
        :aria-label="
          isRateLimited
            ? 'Tentar consultar qualidade do ar de novo'
            : 'Tentar carregar qualidade do ar de novo'
        "
        @click="emit('retry')"
      >
        Tentar de novo
      </ButtonStandard>
    </div>

    <div
      v-else-if="status === 'ready' && reading"
      class="mt-5"
    >
      <p
        v-if="isFallback"
        class="rounded-ui border border-warning/30 bg-warning-soft px-4 py-3
          text-sm text-warning-ink"
      >
        Indisponível temporário. A leitura não tem índice numérico neste
        momento.
      </p>

      <div
        v-else
        class="flex items-center gap-4"
      >
        <span
          class="flex h-16 w-16 items-center justify-center rounded-ui text-2xl
            font-semibold"
          :class="aqiClass"
        >
          {{ reading.aqi }}
        </span>
        <div>
          <p class="text-sm text-muted">Índice geral (AQI)</p>
          <p class="text-base font-medium text-ink">
            {{ AQI_LABEL[reading.aqi] ?? 'Sem classificação' }}
          </p>
        </div>
      </div>

      <dl class="mt-4 divide-y divide-line">
        <div
          v-for="row in POLLUTANT_ROWS"
          :key="row.key"
          class="flex items-center justify-between py-2 text-sm"
        >
          <dt class="font-medium text-ink">{{ row.label }}</dt>
          <dd class="text-muted">
            {{ formatConcentration(reading.pollutants?.[row.key]) }}
          </dd>
        </div>
      </dl>

      <footer class="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span>Atualizado em {{ formatFetchedAt(reading.fetched_at) }}</span>
        <span
          v-if="reading.stale"
          class="rounded-ui bg-warning-soft px-2 py-1 font-medium
            text-warning-ink"
        >
          Leitura desatualizada
        </span>
      </footer>

      <ButtonStandard
        v-if="isFallback"
        class="mt-4"
        aria-label="Tentar consultar qualidade do ar de novo"
        @click="emit('retry')"
      >
        Tentar de novo
      </ButtonStandard>
    </div>
  </section>
</template>
