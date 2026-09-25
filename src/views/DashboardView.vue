<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import AirQualityCard from '@/components/AirQualityCard.vue';
import PollutantChart from '@/components/PollutantChart.vue';
import ButtonText from '@/components/ui/ButtonText.vue';
import Dropdown from '@/components/ui/Dropdown.vue';
import { useToast } from '@/composables/useToast';
import {
  ApiError,
  getAirQuality,
  getPollutants,
  listAlerts,
} from '@/services/api';

const { fromApiError } = useToast();

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

const POLLUTANT_ORDER = ['pm2_5', 'pm10', 'o3', 'no2', 'co'];

/** @type {import('vue').Ref<import('@/types').PollutantGlossary | null>} */
const glossary = ref(null);
const glossaryStatus = ref(
  /** @type {'loading' | 'ready' | 'error'} */ ('loading'),
);
const glossaryError = ref('');

const glossaryItems = computed(() => {
  if (!glossary.value) return [];

  return POLLUTANT_ORDER.map((key) => ({
    key,
    ...glossary.value[key],
  }));
});

const selectedAlert = computed(
  () => alerts.value.find((item) => item.id === selectedId.value) ?? null,
);

const alertOptions = computed(() =>
  alerts.value.map((alert) => ({
    value: alert.id,
    label: `${alert.local_name} · ${alert.target_pollutant}`,
  })),
);

const clearAirState = () => {
  cardStatus.value = 'empty';
  reading.value = null;
  airError.value = null;
};

/**
 * @param {import('@/types').Alert[]} items
 */
const applyAlertList = (items) => {
  alerts.value = items;

  if (items.length === 0) {
    selectedId.value = '';
    alertsStatus.value = 'empty';
    clearAirState();
    return;
  }

  alertsStatus.value = 'ready';

  const stillSelected = items.some((item) => item.id === selectedId.value);

  if (!stillSelected) {
    selectedId.value = '';
    clearAirState();
  }
};

const loadGlossary = async () => {
  glossaryStatus.value = 'loading';
  glossaryError.value = '';

  try {
    glossary.value = await getPollutants();
    glossaryStatus.value = 'ready';
  } catch (error) {
    glossaryStatus.value = 'error';
    glossary.value = null;
    glossaryError.value =
      error instanceof Error
        ? error.message
        : 'Não foi possível carregar o significado dos poluentes.';
    fromApiError(
      error instanceof ApiError
        ? error
        : new ApiError({ message: glossaryError.value }),
    );
  }
};

const loadAlerts = async () => {
  alertsStatus.value = 'loading';
  alertsError.value = '';

  try {
    const { items } = await listAlerts({
      skip: 0,
      limit: DASHBOARD_ALERT_LIMIT,
    });

    applyAlertList(items);
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
      const { items } = await listAlerts({
        skip: 0,
        limit: DASHBOARD_ALERT_LIMIT,
      });

      if (serial !== airRequestSerial) return;

      applyAlertList(items);
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
        : new ApiError({
            message: 'Não foi possível consultar a qualidade do ar.',
          });
    fromApiError(airError.value);
  }
};

watch(selectedId, (id, previous) => {
  if (id === previous) return;

  if (!id) {
    airRequestSerial += 1;
    clearAirState();
    return;
  }

  fetchAirQuality();
});

onMounted(() => {
  loadAlerts();
  loadGlossary();
});
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-3xl font-semibold tracking-tight text-ink">Dashboard</h1>
      <p class="mt-1 text-sm text-muted">
        Escolha um alerta para consultar a qualidade do ar na hora.
      </p>
    </header>

    <div
      v-if="alertsStatus === 'loading'"
      class="space-y-3"
      aria-busy="true"
      aria-label="Carregando alertas do dashboard"
    >
      <div class="h-20 animate-pulse rounded-ui bg-surface" />
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="h-72 animate-pulse rounded-ui bg-surface" />
        <div class="h-72 animate-pulse rounded-ui bg-surface" />
      </div>
    </div>

    <p
      v-else-if="alertsStatus === 'error'"
      class="rounded-ui border border-danger/30 bg-danger-soft px-4 py-4 text-sm
        text-ink"
      role="alert"
    >
      {{ alertsError }}
      <ButtonText
        class="ml-2"
        aria-label="Tentar carregar os alertas de novo"
        @click="loadAlerts"
      >
        Tentar de novo
      </ButtonText>
    </p>

    <section
      v-else-if="alertsStatus === 'empty'"
      class="panel px-5 py-8 text-center"
    >
      <p class="text-ink">Nenhum alerta cadastrado.</p>
      <p class="mt-2 text-sm text-muted">
        Cadastre um local em
        <RouterLink
          to="/alerts"
          class="font-medium text-accent underline"
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
      <Dropdown
        v-model="selectedId"
        class="sm:max-w-md"
        label="Alerta"
        placeholder="Selecione um alerta"
        :options="alertOptions"
      />

      <p
        v-if="selectedAlert"
        class="text-sm text-muted"
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
        <PollutantChart
          :reading="cardStatus === 'ready' ? reading : null"
          :loading="cardStatus === 'loading'"
        />
      </div>

      <section
        class="panel p-5"
        aria-labelledby="pollutant-meanings-title"
      >
        <h2
          id="pollutant-meanings-title"
          class="text-lg font-semibold text-ink"
        >
          O que cada poluente significa
        </h2>
        <p class="mt-1 text-sm text-muted">
          Origem e impacto na saúde de cada poluente exibido acima (PM2.5, PM10,
          CO, NO₂ e O₃).
        </p>

        <p
          class="mt-3 rounded-ui border border-line bg-surface-muted px-4 py-3
            text-sm text-muted"
        >
          A referência da OMS é o limite recomendado pela Organização Mundial da
          Saúde (µg/m³) para exposição mais segura. Os valores nos cards são a
          leitura do momento; as metas da OMS usam médias (24 h, 8 h ou ano). Um
          valor pontual acima do teto diário não equivale a violar o limite
          anual, e vice-versa.
        </p>

        <div
          v-if="glossaryStatus === 'loading'"
          class="mt-4 grid gap-4 sm:grid-cols-2"
          aria-busy="true"
          aria-label="Carregando significado dos poluentes"
        >
          <div
            v-for="key in POLLUTANT_ORDER"
            :key="key"
            class="h-24 animate-pulse rounded-ui bg-surface-muted"
          />
        </div>

        <p
          v-else-if="glossaryStatus === 'error'"
          class="mt-4 rounded-ui border border-danger/30 bg-danger-soft px-4
            py-4 text-sm text-ink"
          role="alert"
        >
          {{ glossaryError }}
          <ButtonText
            class="ml-2"
            aria-label="Tentar carregar o significado dos poluentes de novo"
            @click="loadGlossary"
          >
            Tentar de novo
          </ButtonText>
        </p>

        <ul
          v-else
          class="mt-4 grid gap-4 sm:grid-cols-2"
        >
          <li
            v-for="item in glossaryItems"
            :key="item.key"
            class="rounded-ui bg-surface-muted px-4 py-3"
          >
            <h3 class="text-sm font-semibold text-ink">
              {{ item.name }}
            </h3>
            <p class="mt-1 text-sm text-muted">
              {{ item.description }}
            </p>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
