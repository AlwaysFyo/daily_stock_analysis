/**
 * History API Module
 */

import { endpoints } from './config.js';

// Get axios from global scope (loaded via CDN)
const axios = window.axios;

/**
 * Convert snake_case to camelCase
 */
function toCamelCase(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => toCamelCase(item));
    }

    return Object.keys(obj).reduce((acc, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        acc[camelKey] = toCamelCase(obj[key]);
        return acc;
    }, {});
}

/**
 * History API methods
 */
export const historyApi = {
    /**
     * Get history list
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} History list response
     */
    async getList(params = {}) {
        const queryParams = {
            stock_code: params.stockCode,
            start_date: params.startDate,
            end_date: params.endDate,
            page: params.page || 1,
            limit: params.limit || 20,
        };

        const response = await axios.get(endpoints.history.list, { params: queryParams });
        return toCamelCase(response.data);
    },

    /**
     * Get history detail
     * @param {string} queryId - Query ID
     * @returns {Promise<Object>} History detail
     */
    async getDetail(queryId) {
        const response = await axios.get(endpoints.history.detail(queryId));
        return toCamelCase(response.data);
    },

    /**
     * Get history news
     * @param {string} queryId - Query ID
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} News list
     */
    async getNews(queryId, params = {}) {
        const response = await axios.get(endpoints.history.news(queryId), { params });
        return toCamelCase(response.data);
    },
};
