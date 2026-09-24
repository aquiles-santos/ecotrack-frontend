<script setup>
import { ref, watch } from 'vue';

import AlertFormModal from '@/components/AlertFormModal.vue';
import AlertTable from '@/components/AlertTable.vue';
import {
  createAlert,
  deleteAlert,
  listAlerts,
  updateAlert,
} from '@/services/api';

const PAGE_SIZE = 50;

/** @type {import('vue').Ref<import('@/types').Alert[]>} */
const alerts = ref([]);
const status = ref(
  /** @type {'loading' | 'error' | 'empty' | 'ready'} */ ('loading'),
);
const errorMessage = ref('');
const actionError = ref('');
const skip = ref(0);
const criticality = ref('all');
const modalOpen = ref(false);
const modalMode = ref(/** @type {'create' | 'edit'} */ ('create'));
/** @type {import('vue').Ref<import('@/types').Alert | null>} */
const editingAlert = ref(null);
const saving = ref(false);

const loadAlerts = async () => {
  status.value = 'loading';
  errorMessage.value = '';

  try {
    /** @type {import('@/types').AlertListParams} */
    const params = { skip: skip.value, limit: PAGE_SIZE };

    if (criticality.value !== 'all') {
      params.criticality = criticality.value;
    }

    const items = await listAlerts(params);

    alerts.value = items;

    if (items.length === 0 && skip.value > 0) {
      skip.value = Math.max(0, skip.value - PAGE_SIZE);
      return;
    }

    status.value = items.length === 0 ? 'empty' : 'ready';
  } catch (error) {
    status.value = 'error';
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Não foi possível carregar os alertas.';
  }
};

const openCreate = () => {
  actionError.value = '';
  modalMode.value = 'create';
  editingAlert.value = null;
  modalOpen.value = true;
};

/**
 * @param {import('@/types').Alert} alert
 */
const openEdit = (alert) => {
  actionError.value = '';
  modalMode.value = 'edit';
  editingAlert.value = alert;
  modalOpen.value = true;
};

const closeModal = () => {
  if (saving.value) return;

  modalOpen.value = false;
};

/**
 * @param {{ mode: 'create' | 'edit', id: string | null, payload: import('@/types').AlertCreate }} event
 */
const onSubmit = async (event) => {
  actionError.value = '';
  saving.value = true;

  try {
    if (event.mode === 'create') {
      await createAlert(event.payload);
    } else if (event.id) {
      await updateAlert(event.id, event.payload);
    }

    modalOpen.value = false;

    await loadAlerts();
  } catch (error) {
    actionError.value =
      error instanceof Error
        ? error.message
        : 'Não foi possível salvar o alerta.';
  } finally {
    saving.value = false;
  }
};

/**
 * @param {import('@/types').Alert} alert
 */
const onDelete = async (alert) => {
  actionError.value = '';

  try {
    await deleteAlert(alert.id);

    await loadAlerts();
  } catch (error) {
    actionError.value =
      error instanceof Error
        ? error.message
        : 'Não foi possível excluir o alerta.';
  }
};

/**
 * @param {string} value
 */
const onCriticality = (value) => {
  skip.value = 0;
  criticality.value = value;
};

watch([skip, criticality], loadAlerts, { immediate: true });
</script>

<template>
  <div class="space-y-6">
    <header
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 class="text-2xl font-semibold text-emerald-950">Alertas</h1>
        <p class="mt-1 text-sm text-emerald-800">
          Cadastro com GET, POST, PUT e DELETE em /alerts. Coordenadas só pelo
          geocode.
        </p>
      </div>
      <button
        type="button"
        class="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium
          text-white"
        @click="openCreate"
      >
        Novo alerta
      </button>
    </header>

    <p
      v-if="actionError"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm
        text-red-900"
    >
      {{ actionError }}
    </p>

    <AlertTable
      :alerts="alerts"
      :status="status"
      :error-message="errorMessage"
      :skip="skip"
      :limit="PAGE_SIZE"
      :criticality="criticality"
      @update:criticality="onCriticality"
      @update:skip="skip = $event"
      @edit="openEdit"
      @delete="onDelete"
    />

    <AlertFormModal
      :open="modalOpen"
      :mode="modalMode"
      :alert="editingAlert"
      :saving="saving"
      @close="closeModal"
      @submit="onSubmit"
    />
  </div>
</template>
