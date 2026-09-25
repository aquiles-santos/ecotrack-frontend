import axios from 'axios';

const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_API_BASE_URL = '/api/v1';

export class ApiError extends Error {
  /**
   * @param {object} params
   * @param {string} params.message
   * @param {number | null} [params.status]
   * @param {unknown} [params.detail]
   * @param {number | null} [params.retryAfterSeconds]
   */
  constructor({
    message,
    status = null,
    detail = null,
    retryAfterSeconds = null,
  }) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Empty `VITE_API_BASE_URL` makes Axios hit the Vite origin (`/alerts`),
 * which is a SPA route and returns 404.
 *
 * Defined before `axios.create` because const arrows are not hoisted.
 *
 * @returns {string}
 */
const resolveApiBaseUrl = () => {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;

  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/$/, '');
  }

  return DEFAULT_API_BASE_URL;
};

/**
 * @param {Record<string, unknown> | null | undefined} obj
 * @returns {Record<string, unknown> | undefined}
 */
const omitUndefined = (obj) => {
  if (obj == null) return undefined;

  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  );
};

/**
 * FastAPI may send `Retry-After` as seconds. HTTP-date is accepted as fallback.
 *
 * @param {string | number | undefined | null} header
 * @returns {number | null}
 */
const parseRetryAfter = (header) => {
  if (header == null || header === '') return null;

  const raw = String(header).trim();
  const asSeconds = Number(raw);

  if (Number.isFinite(asSeconds) && asSeconds >= 0) return Math.ceil(asSeconds);

  const asDate = Date.parse(raw);

  if (Number.isNaN(asDate)) return null;

  return Math.max(0, Math.ceil((asDate - Date.now()) / 1000));
};

/**
 * @param {unknown} data
 * @returns {unknown}
 */
const extractDetail = (data) => {
  if (data == null) return null;

  if (typeof data === 'object' && data !== null && 'detail' in data) {
    return data.detail;
  }

  return data;
};

/**
 * @param {unknown} detail
 * @param {string} fallback
 * @returns {string}
 */
const detailToMessage = (detail, fallback) => {
  if (typeof detail === 'string' && detail.trim()) return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          return String(item.msg);
        }

        return JSON.stringify(item);
      })
      .join('; ');
  }

  return fallback;
};

/**
 * @param {unknown} error
 * @returns {ApiError}
 */
export const normalizeApiError = (error) => {
  if (error instanceof ApiError) return error;

  const axiosError = axios.isAxiosError(error) ? error : null;
  const status = axiosError?.response?.status ?? null;
  const detail = extractDetail(axiosError?.response?.data);
  const retryAfterSeconds =
    status === 429
      ? parseRetryAfter(axiosError?.response?.headers?.['retry-after'])
      : null;

  if (status === 422) {
    return new ApiError({
      message: detailToMessage(detail, 'Erro de validação'),
      status,
      detail,
    });
  }

  if (status === 404) {
    return new ApiError({
      message: detailToMessage(detail, 'Não encontrado'),
      status,
      detail,
    });
  }

  if (status === 429) {
    return new ApiError({
      message: detailToMessage(detail, 'Muitas consultas em pouco tempo'),
      status,
      detail,
      retryAfterSeconds,
    });
  }

  if (status === 500) {
    return new ApiError({
      message: detailToMessage(detail, 'Erro interno do servidor'),
      status,
      detail,
    });
  }

  if (status != null) {
    return new ApiError({
      message: detailToMessage(
        detail,
        `A requisição falhou (status ${status})`,
      ),
      status,
      detail,
    });
  }

  const isTimeout =
    axiosError?.code === 'ECONNABORTED' ||
    axiosError?.code === 'ETIMEDOUT' ||
    axiosError?.message?.toLowerCase().includes('timeout');

  return new ApiError({
    message: isTimeout ? 'A requisição excedeu o tempo limite' : 'Erro de rede',
    status: null,
    detail: axiosError?.message ?? String(error),
  });
};

const http = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
  },
});

http.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error)),
);

/**
 * @param {import('@/types').AlertListParams} [params]
 * @returns {Promise<import('@/types').AlertListResponse>}
 */
export const listAlerts = async (params = {}) => {
  const response = await http.get('/alerts', {
    params: omitUndefined(params),
  });

  return response.data;
};

/**
 * @param {import('@/types').AlertCreate} payload
 * @returns {Promise<import('@/types').Alert>}
 */
export const createAlert = async (payload) => {
  const response = await http.post('/alerts', payload);

  return response.data;
};

/**
 * @param {string} id UUID
 * @param {import('@/types').AlertUpdate} payload
 * @returns {Promise<import('@/types').Alert>}
 */
export const updateAlert = async (id, payload) => {
  const response = await http.put(`/alerts/${id}`, omitUndefined(payload));

  return response.data;
};

/**
 * DELETE `/alerts/{id}` returns 204 with no body.
 *
 * @param {string} id UUID
 * @returns {Promise<void>}
 */
export const deleteAlert = async (id) => {
  await http.delete(`/alerts/${id}`);
};

/**
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<import('@/types').AirQualityResponse>}
 */
export const getAirQuality = async (lat, lon) => {
  const response = await http.get('/air-quality', {
    params: { lat, lon },
  });

  return response.data;
};

/**
 * Static glossary. Keys match `pollutants` on GET `/air-quality`.
 *
 * @returns {Promise<import('@/types').PollutantGlossary>}
 */
export const getPollutants = async () => {
  const response = await http.get('/pollutants');

  return response.data;
};

/**
 * @param {string} q Location name (1–255)
 * @param {number} [limit] 1–5, default 5
 * @returns {Promise<import('@/types').GeocodeResponse>}
 */
export const geocode = async (q, limit = 5) => {
  const response = await http.get('/geocode', {
    params: { q, limit },
  });

  return response.data;
};
