import { reactive } from 'vue';

const TOAST_DURATION_MS = 5_000;

/** @typedef {'success' | 'error' | 'warning'} ToastKind */

/**
 * @typedef {Object} Toast
 * @property {number} id
 * @property {ToastKind} kind
 * @property {string} message
 * @property {ReturnType<typeof setTimeout> | null} timeoutId
 */

/** @type {Toast[]} */
const toasts = reactive([]);

let nextId = 1;

/**
 * Shared toast queue. State lives at module scope so any view can push
 * and App.vue can render once. Timeouts are cleared on dismiss so a
 * Retry-After countdown never outlives the toast.
 */
export const useToast = () => {
  /**
   * @param {number} id
   */
  const dismiss = (id) => {
    const index = toasts.findIndex((toast) => toast.id === id);

    if (index === -1) return;

    const [toast] = toasts.splice(index, 1);

    if (toast.timeoutId != null) {
      clearTimeout(toast.timeoutId);
    }
  };

  /**
   * @param {ToastKind} kind
   * @param {string} message
   * @param {number} [durationMs]
   * @returns {number}
   */
  const push = (kind, message, durationMs = TOAST_DURATION_MS) => {
    const id = nextId;
    nextId += 1;

    /** @type {Toast} */
    const toast = { id, kind, message, timeoutId: null };

    toasts.push(toast);

    if (durationMs > 0) {
      toast.timeoutId = setTimeout(() => dismiss(id), durationMs);
    }

    return id;
  };

  /**
   * @param {string} message
   */
  const success = (message) => push('success', message);

  /**
   * @param {string} message
   */
  const error = (message) => push('error', message);

  /**
   * @param {string} message
   */
  const warning = (message) => push('warning', message);

  /**
   * @param {unknown} err
   */
  const fromApiError = (err) => {
    const status =
      err && typeof err === 'object' && 'status' in err ? err.status : null;
    const retryAfterSeconds =
      err && typeof err === 'object' && 'retryAfterSeconds' in err
        ? err.retryAfterSeconds
        : null;
    const message =
      err instanceof Error ? err.message : 'Não foi possível concluir a ação.';

    if (status === 429) {
      if (typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0) {
        warning(`Muitas consultas. Tente de novo em ${retryAfterSeconds} s.`);
        return;
      }

      warning(message);
      return;
    }

    error(message);
  };

  const clear = () => {
    [...toasts].forEach((toast) => dismiss(toast.id));
  };

  return {
    toasts,
    success,
    error,
    warning,
    fromApiError,
    dismiss,
    clear,
  };
};
