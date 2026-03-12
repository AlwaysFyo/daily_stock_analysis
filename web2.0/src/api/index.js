/**
 * API Module Index
 * Initialize axios interceptors and export all API modules
 */

import { analysisApi, DuplicateTaskError } from './analysis.js';
import { apiConfig } from './config.js';
import { historyApi } from './history.js';
import { stocksApi } from './stocks.js';

// Initialize axios defaults
axios.defaults.baseURL = apiConfig.baseURL;
axios.defaults.timeout = apiConfig.timeout;
axios.defaults.withCredentials = apiConfig.withCredentials;
axios.defaults.headers.common['Content-Type'] = apiConfig.headers['Content-Type'];

// Add response interceptor for error handling
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
            const path = window.location.pathname + window.location.search;
            if (!path.startsWith('/login')) {
                const redirect = encodeURIComponent(path);
                window.location.assign(`/login?redirect=${redirect}`);
            }
        }
        return Promise.reject(error);
    }
);

export {
    analysisApi,
    DuplicateTaskError,
    historyApi,
    stocksApi
};

