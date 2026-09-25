export const APP_NAME = 'EcoTrack';

/** Display version for the footer. Keep in sync with package.json. */
export const APP_VERSION = '0.1.0';

export const SUPPORT_EMAIL = 'contato@aquilessantos.dev';

/** @typedef {'PM2.5' | 'PM10' | 'CO' | 'NO2' | 'O3'} TargetPollutant */

export const TARGET_POLLUTANTS = Object.freeze(
  /** @type {const} */ (['PM2.5', 'PM10', 'CO', 'NO2', 'O3']),
);

/** @typedef {'within_limit' | 'above_limit'} Criticality */

export const CRITICALITY = Object.freeze({
  WITHIN_LIMIT: 'within_limit',
  ABOVE_LIMIT: 'above_limit',
});

/** @typedef {'cache' | 'openweather' | 'unavailable_fallback'} AirQualitySource */

export const AIR_QUALITY_SOURCE = Object.freeze({
  CACHE: 'cache',
  OPENWEATHER: 'openweather',
  UNAVAILABLE_FALLBACK: 'unavailable_fallback',
});

/**
 * Pollutant concentrations in µg/m³. Any field may be null.
 *
 * @typedef {Object} Pollutants
 * @property {number | null} [pm2_5]
 * @property {number | null} [pm10]
 * @property {number | null} [co]
 * @property {number | null} [no2]
 * @property {number | null} [o3]
 */

/**
 * Cached reading attached to an alert. Null until `/air-quality` is called
 * for those coordinates (TTL 10 min on the API).
 *
 * @typedef {Object} LatestReading
 * @property {Pollutants} pollutants
 * @property {number} aqi Integer 1–5
 * @property {string} fetched_at ISO-8601 timestamp
 */

/**
 * Alert as returned by GET/POST/PUT `/alerts`.
 *
 * @typedef {Object} Alert
 * @property {string} id UUID
 * @property {string} local_name
 * @property {number} latitude
 * @property {number} longitude
 * @property {TargetPollutant} target_pollutant
 * @property {number} concentration_limit
 * @property {string} created_at ISO-8601 timestamp
 * @property {string} updated_at ISO-8601 timestamp
 * @property {LatestReading | null} latest_reading
 * @property {Criticality | null} criticality
 */

/**
 * POST `/alerts` body. Coordinates must come from geocode, not free text.
 *
 * @typedef {Object} AlertCreate
 * @property {string} local_name
 * @property {number} latitude
 * @property {number} longitude
 * @property {TargetPollutant} target_pollutant
 * @property {number} concentration_limit
 */

/**
 * PUT `/alerts/{id}` body. Omitted fields are left unchanged.
 *
 * @typedef {Object} AlertUpdate
 * @property {string} [local_name]
 * @property {number} [latitude]
 * @property {number} [longitude]
 * @property {TargetPollutant} [target_pollutant]
 * @property {number} [concentration_limit]
 */

/**
 * Query params for GET `/alerts`.
 *
 * @typedef {Object} AlertListParams
 * @property {number} [skip] Default 0
 * @property {number} [limit] Default 50, max 100
 * @property {Criticality} [criticality]
 */

/**
 * GET `/alerts` page. `items` is empty when `skip` is past `total`.
 *
 * @typedef {Object} AlertListResponse
 * @property {Alert[]} items
 * @property {number} page 1-based, from `skip // limit + 1`
 * @property {number} limit
 * @property {number} total
 * @property {number} total_pages
 * @property {boolean} has_more
 */

/**
 * GET `/air-quality` response. `aqi` is null when `source` is
 * `unavailable_fallback`. `stale` is true when serving expired cache.
 *
 * @typedef {Object} AirQualityResponse
 * @property {number} lat
 * @property {number} lon
 * @property {Pollutants} pollutants
 * @property {number | null} aqi Integer 1–5, or null on fallback
 * @property {AirQualitySource} source
 * @property {string} fetched_at ISO-8601 timestamp
 * @property {boolean} stale
 */

/**
 * One entry from GET `/pollutants`. Keys match `Pollutants`.
 *
 * @typedef {Object} PollutantMeaning
 * @property {string} name
 * @property {string} description
 */

/**
 * @typedef {Object} PollutantGlossary
 * @property {PollutantMeaning} pm2_5
 * @property {PollutantMeaning} pm10
 * @property {PollutantMeaning} co
 * @property {PollutantMeaning} no2
 * @property {PollutantMeaning} o3
 */

/**
 * One candidate from GET `/geocode`.
 *
 * @typedef {Object} GeocodeResult
 * @property {string} name
 * @property {string | null} state
 * @property {string} country
 * @property {number} latitude
 * @property {number} longitude
 */

/**
 * GET `/geocode` response. `available=false` means the geocoder is down;
 * `available=true` with empty `results` means no matches.
 *
 * @typedef {Object} GeocodeResponse
 * @property {string} query
 * @property {boolean} available
 * @property {GeocodeResult[]} results
 */

/**
 * Normalized HTTP error from the EcoTrack API client.
 *
 * @typedef {Object} ApiError
 * @property {string} message
 * @property {number | null} status HTTP status, or null on network/timeout
 * @property {unknown} [detail] FastAPI `detail` (string or 422 list)
 * @property {number | null} [retryAfterSeconds] From `Retry-After` on 429
 */
