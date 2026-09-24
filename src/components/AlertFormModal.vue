<script setup>
import { computed, onUnmounted, ref, watch } from 'vue';

import { geocode } from '@/services/api';
import { TARGET_POLLUTANTS } from '@/types';

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: 'create',
    validator: (value) => ['create', 'edit'].includes(value),
  },
  /** @type {import('vue').PropType<import('@/types').Alert | null>} */
  alert: {
    type: Object,
    default: null,
  },
  saving: {
    type: Boolean,
    default: false,
  },
});

/** @type {ReturnType<typeof setTimeout> | null} */
let debounceId = null;
let requestSerial = 0;
let suppressSearch = false;

const emit = defineEmits(['close', 'submit']);

const query = ref('');
const localName = ref('');
const latitude = ref(/** @type {number | null} */ (null));
const longitude = ref(/** @type {number | null} */ (null));
const targetPollutant = ref(TARGET_POLLUTANTS[0]);
const concentrationLimit = ref('');
const coordinatesFromCandidate = ref(false);
/** @type {import('vue').Ref<import('@/types').GeocodeResult[]>} */
const results = ref([]);
const geocodeStatus = ref(
  /** @type {'idle' | 'loading' | 'ready' | 'unavailable' | 'empty' | 'error'} */ (
    'idle'
  ),
);
const searchError = ref('');
const formError = ref('');

const title = computed(() =>
  props.mode === 'edit' ? 'Editar alerta' : 'Novo alerta',
);
const canSubmit = computed(() => {
  const limit = Number(concentrationLimit.value);

  return (
    coordinatesFromCandidate.value &&
    latitude.value != null &&
    longitude.value != null &&
    localName.value.trim().length >= 1 &&
    localName.value.trim().length <= 255 &&
    TARGET_POLLUTANTS.includes(targetPollutant.value) &&
    Number.isFinite(limit) &&
    limit > 0
  );
});

const clearDebounce = () => {
  if (debounceId != null) {
    clearTimeout(debounceId);
    debounceId = null;
  }
};

const resetSearchState = () => {
  results.value = [];
  geocodeStatus.value = 'idle';
  searchError.value = '';
};

const fillFromAlert = (alert) => {
  coordinatesFromCandidate.value = props.mode === 'edit' && alert != null;
  localName.value = alert?.local_name ?? '';
  latitude.value = alert?.latitude ?? null;
  longitude.value = alert?.longitude ?? null;
  targetPollutant.value = alert?.target_pollutant ?? TARGET_POLLUTANTS[0];
  concentrationLimit.value =
    alert?.concentration_limit != null ? String(alert.concentration_limit) : '';
  formError.value = '';
  resetSearchState();
  query.value = alert?.local_name ?? '';
};

/**
 * @param {string} q
 */
const searchPlaces = async (q) => {
  const serial = ++requestSerial;

  geocodeStatus.value = 'loading';
  searchError.value = '';

  try {
    const response = await geocode(q, 5);

    if (serial !== requestSerial) return;

    if (!response.available) {
      results.value = [];
      geocodeStatus.value = 'unavailable';
      return;
    }

    results.value = response.results ?? [];
    geocodeStatus.value = results.value.length === 0 ? 'empty' : 'ready';
  } catch (error) {
    if (serial !== requestSerial) return;

    results.value = [];
    geocodeStatus.value = 'error';
    searchError.value =
      error instanceof Error ? error.message : 'Falha ao buscar locais.';
  }
};

const retrySearch = () => {
  const trimmed = query.value.trim();

  if (!trimmed || trimmed.length > 255) return;

  searchPlaces(trimmed);
};

/**
 * @param {import('@/types').GeocodeResult} candidate
 */
const selectCandidate = (candidate) => {
  const place = [candidate.name, candidate.state, candidate.country]
    .filter(Boolean)
    .join(', ');

  localName.value = place.slice(0, 255);
  suppressSearch = true;
  query.value = place.slice(0, 255);
  latitude.value = candidate.latitude;
  longitude.value = candidate.longitude;
  coordinatesFromCandidate.value = true;
  results.value = [];
  geocodeStatus.value = 'idle';
  searchError.value = '';
};

const onSubmit = () => {
  if (props.saving) return;

  formError.value = '';

  if (!canSubmit.value || latitude.value == null || longitude.value == null) {
    formError.value =
      'Escolha um local na busca para preencher as coordenadas antes de salvar.';
    return;
  }

  const payload = {
    local_name: localName.value.trim(),
    latitude: latitude.value,
    longitude: longitude.value,
    target_pollutant: targetPollutant.value,
    concentration_limit: Number(concentrationLimit.value),
  };

  emit('submit', { mode: props.mode, id: props.alert?.id ?? null, payload });
};

const onQueryChange = (value) => {
  if (suppressSearch) {
    suppressSearch = false;
    return;
  }

  clearDebounce();

  const trimmed = value.trim();
  const stillOriginal =
    props.mode === 'edit' &&
    props.alert != null &&
    trimmed === props.alert.local_name &&
    coordinatesFromCandidate.value;

  if (stillOriginal) return resetSearchState();

  if (
    props.mode === 'edit' &&
    props.alert != null &&
    trimmed !== props.alert.local_name
  ) {
    latitude.value = null;
    longitude.value = null;
    coordinatesFromCandidate.value = false;
    localName.value = '';
  }

  if (!trimmed) {
    if (props.mode === 'create') {
      localName.value = '';
      latitude.value = null;
      longitude.value = null;
      coordinatesFromCandidate.value = false;
    }

    return resetSearchState();
  }

  if (trimmed.length > 255) {
    resetSearchState();
    searchError.value = 'O nome do local deve ter no máximo 255 caracteres.';
    return;
  }

  geocodeStatus.value = 'loading';

  debounceId = setTimeout(() => {
    searchPlaces(trimmed);
  }, 500);
};

watch(
  () => [props.open, props.mode, props.alert?.id],
  () => {
    if (!props.open) return;

    fillFromAlert(props.mode === 'edit' ? props.alert : null);
  },
  { immediate: true },
);

watch(query, onQueryChange);

onUnmounted(clearDebounce);
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-40 flex items-center justify-center bg-emerald-950/40
      p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="alert-form-title"
  >
    <form
      class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white
        p-5 shadow-lg"
      @submit.prevent="onSubmit"
    >
      <header class="flex items-start justify-between gap-3">
        <h2
          id="alert-form-title"
          class="text-lg font-semibold text-emerald-950"
        >
          {{ title }}
        </h2>
        <button
          type="button"
          class="rounded-lg px-2 py-1 text-sm text-stone-600
            disabled:cursor-not-allowed disabled:text-stone-400"
          :disabled="saving"
          @click="emit('close')"
        >
          Fechar
        </button>
      </header>

      <label class="mt-4 block text-sm font-medium text-emerald-950">
        Busca de local
        <input
          v-model="query"
          type="search"
          maxlength="255"
          autocomplete="off"
          class="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2
            disabled:cursor-not-allowed disabled:bg-stone-50"
          placeholder="Nome da cidade"
          :disabled="saving"
        />
      </label>

      <div
        v-if="geocodeStatus === 'loading'"
        class="mt-3 space-y-2"
        aria-busy="true"
      >
        <div
          v-for="row in 3"
          :key="row"
          class="h-10 animate-pulse rounded-lg bg-emerald-50"
        />
      </div>

      <p
        v-else-if="geocodeStatus === 'unavailable'"
        class="mt-3 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-950"
      >
        Serviço de locais indisponível.
        <button
          type="button"
          class="ml-1 underline disabled:cursor-not-allowed"
          :disabled="saving"
          @click="retrySearch"
        >
          Tentar de novo
        </button>
      </p>

      <p
        v-else-if="geocodeStatus === 'empty'"
        class="mt-3 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-900"
      >
        Nenhum candidato
      </p>

      <p
        v-else-if="geocodeStatus === 'error'"
        class="mt-3 rounded-lg bg-red-50 px-3 py-3 text-sm text-red-900"
      >
        {{ searchError }}
        <button
          type="button"
          class="ml-1 underline disabled:cursor-not-allowed"
          :disabled="saving"
          @click="retrySearch"
        >
          Tentar de novo
        </button>
      </p>

      <ul
        v-else-if="results.length > 0"
        class="mt-3 divide-y divide-emerald-100 rounded-lg border
          border-emerald-200"
      >
        <li
          v-for="(candidate, index) in results"
          :key="index"
        >
          <button
            type="button"
            class="w-full px-3 py-2 text-left text-sm hover:bg-emerald-50
              disabled:cursor-not-allowed disabled:text-stone-400"
            :disabled="saving"
            @click="selectCandidate(candidate)"
          >
            {{ candidate.name }}
            <template v-if="candidate.state">, {{ candidate.state }}</template>
            ,
            {{ candidate.country }}
          </button>
        </li>
      </ul>

      <p
        v-if="searchError && geocodeStatus !== 'error'"
        class="mt-2 text-sm text-red-700"
      >
        {{ searchError }}
      </p>

      <label class="mt-4 block text-sm font-medium text-emerald-950">
        Nome do local
        <input
          :value="localName"
          type="text"
          readonly
          class="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3
            py-2 text-stone-700"
        />
      </label>

      <div class="mt-4 grid grid-cols-2 gap-3">
        <label class="block text-sm font-medium text-emerald-950">
          Latitude
          <input
            :value="latitude ?? ''"
            type="text"
            readonly
            class="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50
              px-3 py-2 text-stone-700"
          />
        </label>
        <label class="block text-sm font-medium text-emerald-950">
          Longitude
          <input
            :value="longitude ?? ''"
            type="text"
            readonly
            class="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50
              px-3 py-2 text-stone-700"
          />
        </label>
      </div>

      <label class="mt-4 block text-sm font-medium text-emerald-950">
        Poluente alvo
        <select
          v-model="targetPollutant"
          class="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2
            disabled:cursor-not-allowed disabled:bg-stone-50"
          :disabled="saving"
        >
          <option
            v-for="pollutant in TARGET_POLLUTANTS"
            :key="pollutant"
            :value="pollutant"
          >
            {{ pollutant }}
          </option>
        </select>
      </label>

      <label class="mt-4 block text-sm font-medium text-emerald-950">
        Limite de concentração
        <input
          v-model="concentrationLimit"
          type="number"
          min="0"
          step="any"
          class="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2
            disabled:cursor-not-allowed disabled:bg-stone-50"
          :disabled="saving"
        />
      </label>

      <p
        v-if="formError"
        class="mt-3 text-sm text-red-700"
      >
        {{ formError }}
      </p>

      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg px-3 py-2 text-sm text-stone-700
            disabled:cursor-not-allowed disabled:text-stone-400"
          :disabled="saving"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium
            text-white disabled:cursor-not-allowed disabled:bg-stone-300"
          :disabled="!canSubmit || saving"
        >
          Salvar
        </button>
      </div>
    </form>
  </div>
</template>
