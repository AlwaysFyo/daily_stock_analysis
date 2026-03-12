/**
 * Stocks API Module
 */

import { endpoints } from './config.js';

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
 * Stocks API methods
 */
export const stocksApi = {
    /**
     * Extract stock codes from image
     * @param {File} file - Image file
     * @returns {Promise<Object>} Extracted codes
     */
    async extractFromImage(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(endpoints.stocks.extractFromImage, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 60000, // Vision API can be slow
        });

        return toCamelCase(response.data);
    },

    /**
     * Get stock quote
     * @param {string} stockCode - Stock code
     * @returns {Promise<Object>} Stock quote
     */
    async getQuote(stockCode) {
        const response = await axios.get(endpoints.stocks.quote(stockCode));
        return toCamelCase(response.data);
    },

    /**
     * Get stock history
     * @param {string} stockCode - Stock code
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} Stock history
     */
    async getHistory(stockCode, params = {}) {
        const queryParams = {
            period: params.period || 'daily',
            days: params.days || 30,
        };

        const response = await axios.get(endpoints.stocks.history(stockCode), { params: queryParams });
        return toCamelCase(response.data);
    },
};
