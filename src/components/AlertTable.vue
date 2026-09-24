<script setup>
import { ref } from 'vue'

import { CRITICALITY } from '@/types'

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: CRITICALITY.WITHIN_LIMIT, label: 'Dentro do limite' },
  { value: CRITICALITY.ABOVE_LIMIT, label: 'Acima do limite' },
]

const CRITICALITY_LABEL = {
  [CRITICALITY.WITHIN_LIMIT]: 'Dentro do limite',
  [CRITICALITY.ABOVE_LIMIT]: 'Acima do limite',
}

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
  skip: {
    type: Number,
    default: 0,
  },
  limit: {
    type: Number,
    default: 50,
  },
  criticality: {
    type: String,
    default: 'all',
  },
})

const emit = defineEmits([
  'update:criticality',
  'update:skip',
  'edit',
  'delete',
])

/** @type {import('vue').Ref<import('@/types').Alert | null>} */
const pendingDelete = ref(null)

const canGoBack = () => props.skip > 0
const canGoForward = () => props.alerts.length >= props.limit

/**
 * @param {string} value
 */
function onFilter(value) {
  emit('update:criticality', value)
}

function goBack() {
  if (!canGoBack()) return
  emit('update:skip', Math.max(0, props.skip - props.limit))
}

function goForward() {
  if (!canGoForward()) return
  emit('update:skip', props.skip + props.limit)
}

/**
 * @param {import('@/types').Alert} alert
 */
function askDelete(alert) {
  pendingDelete.value = alert
}

function cancelDelete() {
  pendingDelete.value = null
}

function confirmDelete() {
  if (!pendingDelete.value) return
  emit('delete', pendingDelete.value)
  pendingDelete.value = null
}

/**
 * @param {number} latitude
 * @param {number} longitude
 */
function formatCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null) return '—'
  return `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`
}

/**
 * @param {import('@/types').Alert} alert
 */
function formatLatestReading(alert) {
  const reading = alert.latest_reading
  if (!reading) return 'sem leitura'
  const fetched = reading.fetched_at
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(reading.fetched_at))
    : null
  const aqi = reading.aqi != null ? `AQI ${reading.aqi}` : null
  return [aqi, fetched].filter(Boolean).join(' · ') || 'sem leitura'
}
</script>

<template>
  <section class="rounded-2xl border border-emerald-200 bg-white shadow-sm">
    <header
      class="flex flex-col gap-3 border-b border-emerald-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <h2 class="text-lg font-semibold text-emerald-950">Alertas</h2>
      <div
        class="flex flex-wrap gap-2"
        role="group"
        aria-label="Filtrar criticidade"
      >
        <button
          v-for="filter in FILTERS"
          :key="filter.value"
          type="button"
          class="rounded-full px-3 py-1 text-sm"
          :class="
            criticality === filter.value
              ? 'bg-emerald-800 text-white'
              : 'bg-emerald-50 text-emerald-900'
          "
          :aria-pressed="criticality === filter.value"
          @click="onFilter(filter.value)"
        >
          {{ filter.label }}
        </button>
      </div>
    </header>

    <div v-if="status === 'loading'" class="space-y-2 p-5" aria-busy="true">
      <div
        v-for="row in 4"
        :key="row"
        class="h-12 animate-pulse rounded-lg bg-emerald-50"
      />
    </div>

    <p
      v-else-if="status === 'error'"
      class="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900"
    >
      {{ errorMessage || 'Não foi possível carregar os alertas.' }}
    </p>

    <p
      v-else-if="alerts.length === 0"
      class="m-5 rounded-xl bg-emerald-50 px-4 py-6 text-sm text-emerald-800"
    >
      Nenhum alerta
    </p>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="bg-emerald-50 text-emerald-900">
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
            class="border-t border-emerald-100"
          >
            <td class="px-4 py-3 text-emerald-950">{{ alert.local_name }}</td>
            <td class="px-4 py-3 text-stone-700">
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
            <td class="px-4 py-3 text-stone-700">
              {{ formatLatestReading(alert) }}
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-2">
                <button
                  type="button"
                  class="rounded-lg px-2 py-1 text-emerald-800 underline"
                  @click="emit('edit', alert)"
                >
                  Editar
                </button>
                <button
                  type="button"
                  class="rounded-lg px-2 py-1 text-red-700 underline"
                  @click="askDelete(alert)"
                >
                  Excluir
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer
      v-if="status !== 'loading' && status !== 'error'"
      class="flex items-center justify-between border-t border-emerald-100 px-5 py-3 text-sm"
    >
      <span class="text-stone-600">A partir de {{ skip }}</span>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-lg border border-emerald-200 px-3 py-1 disabled:cursor-not-allowed disabled:text-stone-400"
          :disabled="!canGoBack()"
          @click="goBack"
        >
          Anterior
        </button>
        <button
          type="button"
          class="rounded-lg border border-emerald-200 px-3 py-1 disabled:cursor-not-allowed disabled:text-stone-400"
          :disabled="!canGoForward()"
          @click="goForward"
        >
          Próxima
        </button>
      </div>
    </footer>

    <div
      v-if="pendingDelete"
      class="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-alert-title"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
        <h3
          id="delete-alert-title"
          class="text-lg font-semibold text-emerald-950"
        >
          Excluir alerta
        </h3>
        <p class="mt-2 text-sm text-stone-700">
          Excluir o alerta de {{ pendingDelete.local_name }}? Essa ação não pode
          ser desfeita.
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-2 text-sm text-stone-700"
            @click="cancelDelete"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white"
            @click="confirmDelete"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
