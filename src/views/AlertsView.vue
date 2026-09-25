<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AlertFormModal from '@/components/AlertFormModal.vue';
import AlertTable from '@/components/AlertTable.vue';
import ButtonStandard from '@/components/ui/ButtonStandard.vue';
import { useToast } from '@/composables/useToast';
import {
  ApiError,
  createAlert,
  deleteAlert,
  listAlerts,
  updateAlert,
} from '@/services/api';

const PAGE_SIZE = 10;
const { success, fromApiError } = useToast();
const route = useRoute();
const router = useRouter();

/** @type {import('vue').Ref<import('@/types').Alert[]>} */
const alerts = ref([]);
const totalPages = ref(0);
const status = ref(
  /** @type {'loading' | 'error' | 'empty' | 'ready'} */ ('loading'),
);
const errorMessage = ref('');
const criticality = ref('all');
const modalOpen = ref(false);
const modalMode = ref(/** @type {'create' | 'edit'} */ ('create'));
/** @type {import('vue').Ref<import('@/types').Alert | null>} */
const editingAlert = ref(null);
const saving = ref(false);
const deleting = ref(false);
const refreshing = ref(false);

const MIN_REFRESH_MS = 280;

/**
 * @param {import('vue-router').LocationQuery} query
 */
const pageFromQuery = (query) => {
  const raw = Array.isArray(query.page) ? query.page[0] : query.page;
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 1) return 1;

  return parsed;
};

const page = computed(() => pageFromQuery(route.query));

/**
 * @param {number} nextPage
 */
const goToPage = (nextPage) => {
  const safe = Math.max(1, nextPage);
  const query = { ...route.query };

  if (safe === 1) {
    delete query.page;
  } else {
    query.page = String(safe);
  }

  router.replace({ query });
};

const loadAlerts = async () => {
  const isRefresh = status.value === 'ready' || status.value === 'empty';

  if (isRefresh) {
    refreshing.value = true;
  } else {
    status.value = 'loading';
  }

  errorMessage.value = '';
  const startedAt = Date.now();

  try {
    /** @type {import('@/types').AlertListParams} */
    const params = {
      skip: (page.value - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    };

    if (criticality.value !== 'all') {
      params.criticality = criticality.value;
    }

    const result = await listAlerts(params);

    alerts.value = result.items;
    totalPages.value = result.total_pages;

    if (result.items.length === 0 && page.value > 1) {
      goToPage(page.value - 1);
      return;
    }

    status.value = result.items.length === 0 ? 'empty' : 'ready';
  } catch (error) {
    status.value = 'error';
    errorMessage.value =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível carregar os alertas.';
  } finally {
    if (refreshing.value) {
      const wait = MIN_REFRESH_MS - (Date.now() - startedAt);

      if (wait > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, wait);
        });
      }

      refreshing.value = false;
    }
  }
};

const openCreate = () => {
  modalMode.value = 'create';
  editingAlert.value = null;
  modalOpen.value = true;
};

/**
 * @param {import('@/types').Alert} alert
 */
const openEdit = (alert) => {
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
  saving.value = true;

  try {
    if (event.mode === 'create') {
      await createAlert(event.payload);
      success('Alerta criado.');
    } else if (event.id) {
      await updateAlert(event.id, event.payload);
      success('Alerta atualizado.');
    }

    modalOpen.value = false;

    await loadAlerts();
  } catch (error) {
    fromApiError(error);
  } finally {
    saving.value = false;
  }
};

/**
 * @param {import('@/types').Alert} alert
 */
const onDelete = async (alert) => {
  if (deleting.value) return;

  deleting.value = true;

  try {
    await deleteAlert(alert.id);
    success('Alerta excluído.');

    await loadAlerts();
  } catch (error) {
    fromApiError(error);
  } finally {
    deleting.value = false;
  }
};

/**
 * @param {string} value
 */
const onCriticality = (value) => {
  criticality.value = value;

  if (page.value !== 1) goToPage(1);
};

watch([page, criticality], loadAlerts, { immediate: true });
</script>

<template>
  <div class="space-y-6">
    <header
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-ink">Alertas</h1>
        <p class="mt-1 text-sm text-muted">
          Controle e personalização de seus alertas ambientais geolocalizados.
        </p>
      </div>
      <ButtonStandard
        aria-label="Criar novo alerta"
        @click="openCreate"
      >
        Novo alerta
      </ButtonStandard>
    </header>

    <AlertTable
      :alerts="alerts"
      :status="status"
      :error-message="errorMessage"
      :page="page"
      :limit="PAGE_SIZE"
      :total-pages="totalPages"
      :criticality="criticality"
      :refreshing="refreshing"
      :busy="saving || deleting || refreshing"
      @update:criticality="onCriticality"
      @update:page="goToPage"
      @edit="openEdit"
      @delete="onDelete"
      @retry="loadAlerts"
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
