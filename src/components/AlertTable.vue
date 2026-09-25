<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue';

import { Pencil, Trash2 } from '@lucide/vue';

import ButtonOutline from '@/components/ui/ButtonOutline.vue';
import ButtonStandard from '@/components/ui/ButtonStandard.vue';
import ButtonText from '@/components/ui/ButtonText.vue';
import Modal from '@/components/ui/Modal.vue';
import Pagination from '@/components/ui/Pagination.vue';
import { CRITICALITY } from '@/types';

const props = defineProps({
  /** @type {import('vue').PropType<import('@/types').Alert[]>} */
  alerts: {
    type: Array,
    default: () => [],
  },
  status: {
    type: String,
    default: 'empty',
    validator: (value) =>
      ['loading', 'error', 'empty', 'ready'].includes(value),
  },
  errorMessage: {
    type: String,
    default: '',
  },
  page: {
    type: Number,
    default: 1,
  },
  limit: {
    type: Number,
    default: 10,
  },
  totalPages: {
    type: Number,
    default: 0,
  },
  criticality: {
    type: String,
    default: 'all',
  },
  busy: {
    type: Boolean,
    default: false,
  },
  refreshing: {
    type: Boolean,
    default: false,
  },
});

const SKELETON_ROWS = 4;

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: CRITICALITY.WITHIN_LIMIT, label: 'Dentro do limite' },
  { value: CRITICALITY.ABOVE_LIMIT, label: 'Acima do limite' },
];

const CRITICALITY_LABEL = {
  [CRITICALITY.WITHIN_LIMIT]: 'Dentro do limite',
  [CRITICALITY.ABOVE_LIMIT]: 'Acima do limite',
};

const emit = defineEmits([
  'update:criticality',
  'update:page',
  'edit',
  'delete',
  'retry',
]);

/** @type {import('vue').Ref<import('@/types').Alert | null>} */
const pendingDelete = ref(null);
const cancelDeleteButton = ref(
  /** @type {{ focus: () => void } | null} */ (null),
);
/** @type {Element | null} */
let previousFocus = null;

const emptyCopy = () =>
  props.criticality === 'all'
    ? 'Nenhum alerta cadastrado.'
    : 'Nenhum alerta neste filtro.';

/**
 * @param {string} value
 */
const onFilter = (value) => {
  emit('update:criticality', value);
};

/**
 * @param {import('@/types').Alert} alert
 */
const askDelete = (alert) => {
  if (props.busy) return;

  previousFocus = document.activeElement;
  pendingDelete.value = alert;
};

const cancelDelete = () => {
  pendingDelete.value = null;

  if (previousFocus instanceof HTMLElement) {
    previousFocus.focus();
  }

  previousFocus = null;
};

const confirmDelete = () => {
  if (!pendingDelete.value || props.busy) return;

  emit('delete', pendingDelete.value);
  cancelDelete();
};

/**
 * @param {KeyboardEvent} event
 */
const onDeleteKeydown = (event) => {
  if (event.key !== 'Escape' || !pendingDelete.value) return;

  event.preventDefault();
  cancelDelete();
};

watch(pendingDelete, async (alert) => {
  window.removeEventListener('keydown', onDeleteKeydown);

  if (!alert) return;

  window.addEventListener('keydown', onDeleteKeydown);
  await nextTick();
  cancelDeleteButton.value?.focus();
});

onUnmounted(() => {
  window.removeEventListener('keydown', onDeleteKeydown);
  pendingDelete.value = null;
});

/**
 * @param {number} latitude
 * @param {number} longitude
 */
const formatCoordinates = (latitude, longitude) => {
  if (latitude == null || longitude == null) return '—';

  return `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`;
};

/**
 * @param {import('@/types').Alert} alert
 */
const formatLatestReading = (alert) => {
  const reading = alert.latest_reading;

  if (!reading) return 'sem leitura';

  const fetched = reading.fetched_at
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(reading.fetched_at))
    : null;

  const aqi = reading.aqi != null ? `AQI ${reading.aqi}` : null;

  return [aqi, fetched].filter(Boolean).join(' · ') || 'sem leitura';
};
</script>

<template>
  <section class="panel">
    <header
      class="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row
        sm:items-center sm:justify-between"
    >
      <h2 class="text-lg font-semibold text-ink">Alertas</h2>
      <div
        class="flex flex-wrap gap-2"
        role="group"
        aria-label="Filtrar criticidade"
      >
        <ButtonOutline
          v-for="filter in FILTERS"
          :key="filter.value"
          size="sm"
          class="rounded-ui"
          :pressed="criticality === filter.value"
          :aria-pressed="criticality === filter.value"
          :disabled="busy"
          @click="onFilter(filter.value)"
        >
          {{ filter.label }}
        </ButtonOutline>
      </div>
    </header>

    <div
      v-if="status === 'loading'"
      class="space-y-2 p-5"
      aria-busy="true"
    >
      <div
        v-for="row in 4"
        :key="row"
        class="h-12 animate-pulse rounded-ui bg-surface-muted"
      />
    </div>

    <div
      v-else-if="status === 'error'"
      class="m-5 rounded-ui border border-danger/30 bg-danger-soft px-4 py-4
        text-sm text-ink"
      role="alert"
    >
      <p>{{ errorMessage || 'Não foi possível carregar os alertas.' }}</p>
      <ButtonStandard
        class="mt-3"
        @click="emit('retry')"
      >
        Tentar de novo
      </ButtonStandard>
    </div>

    <div
      v-else-if="refreshing"
      class="space-y-2 p-5"
      aria-busy="true"
      aria-label="Atualizando alertas"
    >
      <div
        v-for="row in SKELETON_ROWS"
        :key="row"
        class="h-12 animate-pulse rounded-ui bg-surface-muted"
      />
    </div>

    <p
      v-else-if="alerts.length === 0"
      class="m-5 rounded-ui bg-surface-muted px-4 py-6 text-sm text-muted"
    >
      {{ emptyCopy() }}
    </p>

    <div
      v-else
      class="overflow-x-auto"
    >
      <table class="min-w-full text-left text-sm">
        <thead class="bg-surface-muted text-muted">
          <tr>
            <th class="px-4 py-3 font-medium">Local</th>
            <th class="px-4 py-3 font-medium">Coordenadas</th>
            <th class="px-4 py-3 font-medium">Poluente alvo</th>
            <th class="px-4 py-3 font-medium">Limite</th>
            <th class="px-4 py-3 font-medium">Criticidade</th>
            <th class="px-4 py-3 font-medium">Última leitura</th>
            <th class="px-4 py-3 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="alert in alerts"
            :key="alert.id"
            class="border-t border-line transition-colors
              duration-[var(--motion-fast)] ease-[var(--ease-standard)]
              hover:bg-surface-muted"
          >
            <td class="px-4 py-3 text-ink">{{ alert.local_name }}</td>
            <td class="px-4 py-3 text-muted">
              {{ formatCoordinates(alert.latitude, alert.longitude) }}
            </td>
            <td class="px-4 py-3">{{ alert.target_pollutant }}</td>
            <td class="px-4 py-3">{{ alert.concentration_limit }}</td>
            <td class="px-4 py-3">
              {{
                alert.criticality
                  ? CRITICALITY_LABEL[alert.criticality]
                  : 'Sem leitura'
              }}
            </td>
            <td class="px-4 py-3 text-muted">
              {{ formatLatestReading(alert) }}
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-1">
                <ButtonText
                  size="icon"
                  :disabled="busy"
                  :aria-label="`Editar alerta ${alert.local_name}`"
                  :title="`Editar ${alert.local_name}`"
                  @click="emit('edit', alert)"
                >
                  <Pencil
                    :size="16"
                    aria-hidden="true"
                  />
                </ButtonText>
                <ButtonText
                  size="icon"
                  tone="danger"
                  :disabled="busy"
                  :aria-label="`Excluir alerta ${alert.local_name}`"
                  :title="`Excluir ${alert.local_name}`"
                  @click="askDelete(alert)"
                >
                  <Trash2
                    :size="16"
                    aria-hidden="true"
                  />
                </ButtonText>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer
      v-if="status === 'ready' && !refreshing"
      class="border-t border-line px-5 py-3"
    >
      <Pagination
        :page="page"
        :page-size="limit"
        :item-count="alerts.length"
        :total-pages="totalPages"
        :disabled="busy"
        @update:page="emit('update:page', $event)"
      />
    </footer>

    <Modal
      :open="pendingDelete != null"
      labelledby="delete-alert-title"
      describedby="delete-alert-description"
      @close="cancelDelete"
    >
      <h3
        id="delete-alert-title"
        class="text-lg font-semibold text-ink"
      >
        Excluir alerta
      </h3>
      <p
        id="delete-alert-description"
        class="mt-2 text-sm text-muted"
      >
        Excluir o alerta de {{ pendingDelete?.local_name }}? Essa ação não pode
        ser desfeita.
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <ButtonText
          ref="cancelDeleteButton"
          tone="neutral"
          @click="cancelDelete"
        >
          Cancelar
        </ButtonText>
        <ButtonStandard
          tone="danger"
          :disabled="busy"
          :aria-label="`Confirmar exclusão de ${pendingDelete?.local_name}`"
          @click="confirmDelete"
        >
          Excluir
        </ButtonStandard>
      </div>
    </Modal>
  </section>
</template>
