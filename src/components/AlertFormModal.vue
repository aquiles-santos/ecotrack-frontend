<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';

import { X } from '@lucide/vue';

import ButtonStandard from '@/components/ui/ButtonStandard.vue';
import ButtonText from '@/components/ui/ButtonText.vue';
import Dropdown from '@/components/ui/Dropdown.vue';
import Modal from '@/components/ui/Modal.vue';
import TextField from '@/components/ui/TextField.vue';
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
const searchInput = ref(/** @type {{ focus: () => void } | null} */ (null));
const pollutantOptions = TARGET_POLLUTANTS.map((pollutant) => ({
  value: pollutant,
  label: pollutant,
}));
/** @type {Element | null} */
let previousFocus = null;

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

const requestClose = () => {
  if (props.saving) return;

  emit('close');
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
  async () => {
    if (!props.open) return;

    fillFromAlert(props.mode === 'edit' ? props.alert : null);
    await nextTick();
    searchInput.value?.focus();
  },
  { immediate: true },
);

/**
 * @param {KeyboardEvent} event
 */
const onEscape = (event) => {
  if (event.key !== 'Escape' || props.saving) return;

  event.preventDefault();
  requestClose();
};

watch(
  () => props.open,
  (open) => {
    window.removeEventListener('keydown', onEscape);

    if (open) {
      previousFocus = document.activeElement;
      window.addEventListener('keydown', onEscape);
      return;
    }

    if (previousFocus instanceof HTMLElement) {
      previousFocus.focus();
    }

    previousFocus = null;
  },
);

watch(query, onQueryChange);

onUnmounted(() => {
  window.removeEventListener('keydown', onEscape);
  clearDebounce();
});
</script>

<template>
  <Modal
    :open="open"
    labelledby="alert-form-title"
    @close="requestClose"
  >
    <form @submit.prevent="onSubmit">
      <header class="flex items-start justify-between gap-3">
        <h2
          id="alert-form-title"
          class="text-lg font-semibold text-ink"
        >
          {{ title }}
        </h2>
        <ButtonText
          tone="neutral"
          :disabled="saving"
          aria-label="Fechar formulário de alerta"
          @click="requestClose"
        >
          <X class="size-4" />
        </ButtonText>
      </header>

      <TextField
        ref="searchInput"
        v-model="query"
        class="mt-4"
        label="Busca de local"
        type="search"
        maxlength="255"
        autocomplete="off"
        aria-label="Busca de local"
        placeholder="Nome da cidade"
        :disabled="saving"
      />

      <div
        v-if="geocodeStatus === 'loading'"
        class="mt-3 space-y-2"
        aria-busy="true"
      >
        <div
          v-for="row in 3"
          :key="row"
          class="h-10 animate-pulse rounded-ui bg-surface-muted"
        />
      </div>

      <p
        v-else-if="geocodeStatus === 'unavailable'"
        class="mt-3 rounded-ui bg-warning-soft px-3 py-3 text-sm
          text-warning-ink"
      >
        Serviço de locais indisponível.
        <ButtonText
          class="ml-1"
          :disabled="saving"
          @click="retrySearch"
        >
          Tentar de novo
        </ButtonText>
      </p>

      <p
        v-else-if="geocodeStatus === 'empty'"
        class="mt-3 rounded-ui bg-surface-muted px-3 py-3 text-sm text-ink"
      >
        Nenhum candidato encontrado para essa busca.
      </p>

      <p
        v-else-if="geocodeStatus === 'error'"
        class="mt-3 rounded-ui bg-danger-soft px-3 py-3 text-sm text-ink"
      >
        {{ searchError }}
        <ButtonText
          class="ml-1"
          :disabled="saving"
          @click="retrySearch"
        >
          Tentar de novo
        </ButtonText>
      </p>

      <ul
        v-else-if="results.length > 0"
        class="mt-3 divide-y divide-line overflow-hidden rounded-ui border
          border-line"
      >
        <li
          v-for="(candidate, index) in results"
          :key="index"
        >
          <button
            type="button"
            class="list-option px-3 py-2 text-sm disabled:text-muted"
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
        class="mt-2 text-sm text-danger"
      >
        {{ searchError }}
      </p>

      <TextField
        class="mt-4"
        label="Nome do local"
        :model-value="localName"
        disabled
      />

      <div class="mt-4 grid grid-cols-2 gap-3">
        <TextField
          label="Latitude"
          :model-value="latitude ?? ''"
          disabled
        />
        <TextField
          label="Longitude"
          :model-value="longitude ?? ''"
          disabled
        />
      </div>

      <Dropdown
        v-model="targetPollutant"
        class="mt-4"
        label="Poluente alvo"
        :options="pollutantOptions"
        :disabled="saving"
      />

      <TextField
        v-model="concentrationLimit"
        class="mt-4"
        label="Limite de concentração"
        type="number"
        min="0"
        step="any"
        :disabled="saving"
      />

      <p
        v-if="formError"
        class="mt-3 text-sm text-danger"
      >
        {{ formError }}
      </p>

      <div class="mt-5 flex justify-end gap-2">
        <ButtonText
          tone="neutral"
          :disabled="saving"
          @click="requestClose"
        >
          Cancelar
        </ButtonText>
        <ButtonStandard
          type="submit"
          :disabled="!canSubmit || saving"
          :aria-label="
            mode === 'edit' ? 'Salvar alterações do alerta' : 'Criar alerta'
          "
        >
          {{ saving ? 'Salvando...' : 'Salvar' }}
        </ButtonStandard>
      </div>
    </form>
  </Modal>
</template>
