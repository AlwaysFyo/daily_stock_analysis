/**
 * Analysis API Module
 */

import { API_BASE_URL, endpoints } from './config.js';

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
 * Analysis API methods
 */
export const analysisApi = {
    /**
     * Trigger stock analysis (sync mode)
     * @param {Object} data - Analysis request data
     * @returns {Promise<Object>} Analysis result
     */
    async analyze(data) {
        const requestData = {
            stock_code: data.stockCode,
            report_type: data.reportType || 'detailed',
            force_refresh: data.forceRefresh || false,
            async_mode: data.asyncMode || false,
        };

        const response = await axios.post(endpoints.analysis.analyze, requestData);
        return toCamelCase(response.data);
    },

    /**
     * Trigger stock analysis (async mode)
     * @param {Object} data - Analysis request data
     * @returns {Promise<Object>} Task accepted response
     */
    async analyzeAsync(data) {
        const requestData = {
            stock_code: data.stockCode,
            report_type: data.reportType || 'detailed',
            force_refresh: data.forceRefresh || false,
            async_mode: true,
        };

        const response = await axios.post(endpoints.analysis.analyze, requestData, {
            validateStatus: (status) => status === 200 || status === 202 || status === 409,
        });

        // Handle 409 duplicate task error
        if (response.status === 409) {
            const errorData = toCamelCase(response.data);
            throw new DuplicateTaskError(
                errorData.stockCode,
                errorData.existingTaskId,
                errorData.message
            );
        }

        return toCamelCase(response.data);
    },

    /**
     * Get task status
     * @param {string} taskId - Task ID
     * @returns {Promise<Object>} Task status
     */
    async getStatus(taskId) {
        const response = await axios.get(endpoints.analysis.status(taskId));
        return toCamelCase(response.data);
    },

    /**
     * Get task list
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} Task list response
     */
    async getTasks(params = {}) {
        const response = await axios.get(endpoints.analysis.tasks, { params });
        return toCamelCase(response.data);
    },

    /**
     * Get SSE task stream URL
     * @returns {string} Stream URL
     */
    getTaskStreamUrl() {
        return `${API_BASE_URL}${endpoints.analysis.taskStream}`;
    },
};

/**
 * Duplicate task error class
 */
export class DuplicateTaskError extends Error {
    constructor(stockCode, existingTaskId, message) {
        super(message || `Stock ${stockCode} is being analyzed`);
        this.name = 'DuplicateTaskError';
        this.stockCode = stockCode;
        this.existingTaskId = existingTaskId;
    }
}
