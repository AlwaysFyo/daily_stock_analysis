/**
 * Stocks API Module
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
            timeout: 60000,
        });

        return toCamelCase(response.data);
    },

    /**
     * Parse import data from CSV/Excel/clipboard text
     * @param {string|File} data - Text string or File object
     * @returns {Promise<Object>} Parsed stock codes
     */
    async parseImport(data) {
        if (data instanceof File) {
            const formData = new FormData();
            formData.append('file', data);
            const response = await axios.post(endpoints.stocks.parseImport, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return toCamelCase(response.data);
        } else {
            const response = await axios.post(endpoints.stocks.parseImport, { text: data });
            return toCamelCase(response.data);
        }
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

    /**
     * Get watchlist stocks
     * @returns {Promise<Object>} Watchlist with items and total
     */
    async getWatchlist() {
        const response = await axios.get(endpoints.stocks.watchlist);
        return toCamelCase(response.data);
    },

    /**
     * Get holding stocks
     * @returns {Promise<Object>} Holdings with items and total
     */
    async getHoldings() {
        const response = await axios.get(endpoints.stocks.holding);
        return toCamelCase(response.data);
    },

    /**
     * Add stock to watchlist
     * @param {string} code - Stock code
     * @param {string} stockType - Stock type (stock/etf/index)
     * @returns {Promise<Object>} Add result
     */
    async addToWatchlist(code, stockType = 'stock') {
        const response = await axios.post(endpoints.stocks.watchlistAdd, {
            code,
            status: 'watchlist',
            stock_type: stockType,
        });
        return toCamelCase(response.data);
    },

    /**
     * Add stock to holdings
     * @param {string} code - Stock code
     * @param {string} stockType - Stock type (stock/etf/index)
     * @returns {Promise<Object>} Add result
     */
    async addToHoldings(code, stockType = 'stock') {
        const response = await axios.post(endpoints.stocks.holdingAdd, {
            code,
            status: 'holding',
            stock_type: stockType,
        });
        return toCamelCase(response.data);
    },

    /**
     * Remove stock from list
     * @param {string} stockCode - Stock code
     * @returns {Promise<Object>} Remove result
     */
    async removeStock(stockCode) {
        const response = await axios.delete(endpoints.stocks.stock(stockCode));
        return toCamelCase(response.data);
    },

    /**
     * Update stock status (switch between watchlist/holding)
     * @param {string} stockCode - Stock code
     * @param {string} status - New status ('watchlist' or 'holding')
     * @returns {Promise<Object>} Update result
     */
    async updateStockStatus(stockCode, status) {
        const response = await axios.put(endpoints.stocks.stockStatus(stockCode), {
            status,
        });
        return toCamelCase(response.data);
    },

    /**
     * Get top decisions (highest score stocks from watchlist + holdings)
     * @param {number} limit - Number of stocks to return (default 3)
     * @returns {Promise<Object>} Top decisions with items and total
     */
    async getTopDecisions(limit = 3) {
        const response = await axios.get(endpoints.stocks.topDecisions, {
            params: { limit },
        });
        return toCamelCase(response.data);
    },
};
