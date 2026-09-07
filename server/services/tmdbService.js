const axios = require('axios');

const TMDB_TIMEOUT_MS = parseInt(process.env.TMDB_TIMEOUT_MS, 10) || 8000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const RETRYABLE_NETWORK_CODES = new Set([
  'ECONNABORTED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ECONNRESET',
  'ERR_NETWORK',
]);

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  timeout: TMDB_TIMEOUT_MS,
  headers: {
    Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}`,
    accept: 'application/json',
  },
});

// Axios response interceptor for retrying transient failures with exponential backoff
tmdb.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Do not retry if config is missing or retries already exceeded
    if (!config) {
      return Promise.reject(error);
    }

    config.__retryCount = config.__retryCount || 0;

    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    const isNetworkError = RETRYABLE_NETWORK_CODES.has(error.code);
    const isRetryableStatus = error.response && RETRYABLE_STATUS_CODES.has(error.response.status);

    const isRetryable = isTimeout || isNetworkError || isRetryableStatus;

    if (isRetryable && config.__retryCount < MAX_RETRIES) {
      config.__retryCount += 1;
      const delayMs = Math.min(1000 * Math.pow(2, config.__retryCount - 1), 3000);
      console.warn(
        `[TMDB Service] Transient error (${error.code || error.response?.status}). Retrying request to "${config.url}" (attempt ${config.__retryCount}/${MAX_RETRIES}) after ${delayMs}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return tmdb(config);
    }

    // Enhance error message for consumer clarity
    if (isTimeout) {
      error.message = `TMDB request timed out after ${TMDB_TIMEOUT_MS}ms: ${config.url || ''}`;
      error.isTimeout = true;
    } else if (!error.response) {
      error.message = `TMDB service unreachable (${error.code || 'Network Error'}): ${config.url || ''}`;
      error.isNetworkError = true;
    }

    return Promise.reject(error);
  }
);

module.exports = tmdb;