<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import AirQualityCard from '@/components/AirQualityCard.vue';
import PollutantChart from '@/components/PollutantChart.vue';
import { ApiError, getAirQuality, listAlerts } from '@/services/api';

const DASHBOARD_ALERT_LIMIT = 100;

/** @type {import('vue').Ref<import('@/types').Alert[]>} */
const alerts = ref([]);
const alertsStatus = ref(
  /** @type {'loading' | 'empty' | 'ready' | 'error'} */ ('loading'),
);
const alertsError = ref('');
const selectedId = ref('');
const cardStatus = ref(
  /** @type {'loading' | 'error' | 'empty' | 'ready'} */ ('empty'),
);
/** @type {import('vue').Ref<import('@/types').AirQualityResponse | null>} */
const reading = ref(null);
/** @type {import('vue').Ref<import('@/types').ApiError | null>} */
const airError = ref(null);
let airRequestSerial = 0;

const selectedAlert = computed(
  () => alerts.value.find((item) => item.id === selectedId.value) ?? null,
);

const clearAirState = () => {
  cardStatus.value = 'empty';
  reading.value = null;
  airError.value = null;
};

/**
 * @param {import('@/types').Alert[]} items
 * @param {boolean} [resetSelection]
 */
const applyAlertList = (items, resetSelection = false) => {
  alerts.value = items;

  if (items.length === 0) {
    selectedId.value = '';
    alertsStatus.value = 'empty';
    clearAirState();
    return;
  }

  alertsStatus.value = 'ready';
  const stillSelected = items.some((item) => item.id === selectedId.value);

  if (resetSelection || !stillSelected) {
    selectedId.value = items[0].id;
  }
};

/**
 * @param {boolean} [resetSelection]
 */
const loadAlerts = async (resetSelection = false) => {
  alertsStatus.value = 'loading';
  alertsError.value = '';

  try {
    const items = await listAlerts({ skip: 0, limit: DASHBOARD_ALERT_LIMIT });

    applyAlertList(items, resetSelection);
  } catch (error) {
    alertsStatus.value = 'error';
    alertsError.value =
      error instanceof Error
        ? error.message
        : 'Não foi possível listar os alertas.';
  }
};

const fetchAirQuality = async () => {
  const alert = selectedAlert.value;

  if (!alert) {
    clearAirState();
    return;
  }

  const serial = ++airRequestSerial;

  cardStatus.value = 'loading';
  airError.value = null;

  try {
    const result = await getAirQuality(alert.latitude, alert.longitude);

    if (serial !== airRequestSerial) return;

    reading.value = result;
    cardStatus.value = 'ready';

    try {
      const items = await listAlerts({
        skip: 0,
        limit: DASHBOARD_ALERT_LIMIT,
      });

      if (serial !== airRequestSerial) return;

      applyAlertList(items, false);
    } catch {
      // The reading already landed; listing cache/criticality can stay stale.
    }
  } catch (error) {
    if (serial !== airRequestSerial) return;

    cardStatus.value = 'error';
    reading.value = null;
    airError.value =
      error instanceof ApiError
        ? error
        : {
            message: 'Não foi possível consultar a qualidade do ar.',
            status: null,
          };
  }
};

watch(selectedId, (id, previous) => {
  if (id === previous) return;

  airRequestSerial += 1;
  clearAirState();
});

onMounted(() => {
  loadAlerts(true);
});
</script>

<template>
  <div class="space-y-6">
    <header
      class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <h1 class="text-2xl font-semibold text-emerald-950">Dashboard</h1>
        <p class="mt-1 text-sm text-emerald-800">
          Escolha um alerta e consulte a qualidade do ar sob demanda.
        </p>
      </div>
      <button
        type="button"
        class="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium
          text-white disabled:cursor-not-allowed disabled:bg-stone-300"
        :disabled="!selectedAlert || cardStatus === 'loading'"
        @click="fetchAirQuality"
      >
        Consultar qualidade do ar
      </button>
    </header>

    <div
      v-if="alertsStatus === 'loading'"
      class="h-20 animate-pulse rounded-2xl bg-white"
      aria-busy="true"
    />

    <p
      v-else-if="alertsStatus === 'error'"
      class="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm
        text-red-900"
    >
      {{ alertsError }}
      <button
        type="button"
        class="ml-2 underline"
        @click="loadAlerts(true)"
      >
        Tentar de novo
      </button>
    </p>

    <section
      v-else-if="alertsStatus === 'empty'"
      class="rounded-2xl border border-emerald-200 bg-white px-5 py-8
        text-center shadow-sm"
    >
      <p class="text-emerald-950">Nenhum alerta cadastrado.</p>
      <p class="mt-2 text-sm text-emerald-800">
        Cadastre um local em
        <RouterLink
          to="/alerts"
          class="font-medium underline"
        >
          Alertas
        </RouterLink>
        para consultar a qualidade do ar.
      </p>
    </section>

    <div
      v-else
      class="space-y-6"
    >
      <label class="block text-sm font-medium text-emerald-950">
        Alerta
        <select
          v-model="selectedId"
          class="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3
            py-2 sm:max-w-md"
        >
          <option
            v-for="alert in alerts"
            :key="alert.id"
            :value="alert.id"
          >
            {{ alert.local_name }} · {{ alert.target_pollutant }}
          </option>
        </select>
      </label>

      <p
        v-if="selectedAlert"
        class="text-sm text-stone-600"
      >
        Coordenadas {{ selectedAlert.latitude }}, {{ selectedAlert.longitude }}.
        Criticidade: {{ selectedAlert.criticality ?? 'sem leitura ainda' }}.
      </p>

      <div class="grid gap-6 lg:grid-cols-2">
        <AirQualityCard
          :status="cardStatus"
          :reading="reading"
          :error="airError"
          @retry="fetchAirQuality"
        />
        <PollutantChart :reading="cardStatus === 'ready' ? reading : null" />
      </div>
    </div>
  </div>
</template>
