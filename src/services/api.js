import axios from 'axios'

const REQUEST_TIMEOUT_MS = 10_000

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
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.retryAfterSeconds = retryAfterSeconds
  }
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
  },
})

http.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error)),
)

/**
 * @param {Record<string, unknown> | null | undefined} obj
 * @returns {Record<string, unknown> | undefined}
 */
function omitUndefined(obj) {
  if (obj == null) return undefined
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  )
}

/**
 * FastAPI may send `Retry-After` as seconds. HTTP-date is accepted as fallback.
 *
 * @param {string | number | undefined | null} header
 * @returns {number | null}
 */
function parseRetryAfter(header) {
  if (header == null || header === '') return null
  const raw = String(header).trim()
  const asSeconds = Number(raw)
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.ceil(asSeconds)
  }
  const asDate = Date.parse(raw)
  if (Number.isNaN(asDate)) return null
  return Math.max(0, Math.ceil((asDate - Date.now()) / 1000))
}

/**
 * @param {unknown} data
 * @returns {unknown}
 */
function extractDetail(data) {
  if (data == null) return null
  if (typeof data === 'object' && data !== null && 'detail' in data) {
    return data.detail
  }
  return data
}

/**
 * @param {unknown} detail
 * @param {string} fallback
 * @returns {string}
 */
function detailToMessage(detail, fallback) {
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          return String(item.msg)
        }
        return JSON.stringify(item)
      })
      .join('; ')
  }
  return fallback
}

/**
 * @param {unknown} error
 * @returns {ApiError}
 */
export function normalizeApiError(error) {
  if (error instanceof ApiError) return error

  const axiosError = axios.isAxiosError(error) ? error : null
  const status = axiosError?.response?.status ?? null
  const detail = extractDetail(axiosError?.response?.data)
  const retryAfterSeconds =
    status === 429
      ? parseRetryAfter(axiosError?.response?.headers?.['retry-after'])
      : null

  if (status === 422) {
    return new ApiError({
      message: detailToMessage(detail, 'Validation error'),
      status,
      detail,
    })
  }
  if (status === 404) {
    return new ApiError({
      message: detailToMessage(detail, 'Not found'),
      status,
      detail,
    })
  }
  if (status === 429) {
    return new ApiError({
      message: detailToMessage(detail, 'Too many requests'),
      status,
      detail,
      retryAfterSeconds,
    })
  }
  if (status === 500) {
    return new ApiError({
      message: detailToMessage(detail, 'Internal server error'),
      status,
      detail,
    })
  }
  if (status != null) {
    return new ApiError({
      message: detailToMessage(detail, `Request failed with status ${status}`),
      status,
      detail,
    })
  }

  const isTimeout =
    axiosError?.code === 'ECONNABORTED' ||
    axiosError?.code === 'ETIMEDOUT' ||
    axiosError?.message?.toLowerCase().includes('timeout')

  return new ApiError({
    message: isTimeout ? 'Request timed out' : 'Network error',
    status: null,
    detail: axiosError?.message ?? String(error),
  })
}

/**
 * @param {import('@/types').AlertListParams} [params]
 * @returns {Promise<import('@/types').Alert[]>}
 */
export async function listAlerts(params = {}) {
  const response = await http.get('/alerts', {
    params: omitUndefined(params),
  })
  return response.data
}

/**
 * @param {import('@/types').AlertCreate} payload
 * @returns {Promise<import('@/types').Alert>}
 */
export async function createAlert(payload) {
  const response = await http.post('/alerts', payload)
  return response.data
}

/**
 * @param {string} id UUID
 * @param {import('@/types').AlertUpdate} payload
 * @returns {Promise<import('@/types').Alert>}
 */
export async function updateAlert(id, payload) {
  const response = await http.put(`/alerts/${id}`, omitUndefined(payload))
  return response.data
}

/**
 * DELETE `/alerts/{id}` returns 204 with no body.
 *
 * @param {string} id UUID
 * @returns {Promise<void>}
 */
export async function deleteAlert(id) {
  await http.delete(`/alerts/${id}`)
}

/**
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<import('@/types').AirQualityResponse>}
 */
export async function getAirQuality(lat, lon) {
  const response = await http.get('/air-quality', {
    params: { lat, lon },
  })
  return response.data
}

/**
 * @param {string} q Location name (1–255)
 * @param {number} [limit] 1–5, default 5
 * @returns {Promise<import('@/types').GeocodeResponse>}
 */
export async function geocode(q, limit = 5) {
  const response = await http.get('/geocode', {
    params: { q, limit },
  })
  return response.data
}
