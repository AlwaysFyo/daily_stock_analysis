/**
 * Backtest API Module - 回测功能 API
 */

const axios = window.axios;

function toCamelCase(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(toCamelCase);
    }
    const result = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = toCamelCase(obj[key]);
        }
    }
    return result;
}

export const backtestApi = {
    run: async (params = {}) => {
        const requestData = {};
        if (params.code) requestData.code = params.code;
        if (params.force) requestData.force = params.force;
        if (params.evalWindowDays) requestData.eval_window_days = params.evalWindowDays;
        if (params.minAgeDays != null) requestData.min_age_days = params.minAgeDays;
        if (params.limit) requestData.limit = params.limit;

        const response = await axios.post('/api/v1/backtest/run', requestData);
        return toCamelCase(response.data);
    },

    getResults: async (params = {}) => {
        const { code, evalWindowDays, page = 1, limit = 20 } = params;
        const queryParams = { page, limit };
        if (code) queryParams.code = code;
        if (evalWindowDays) queryParams.eval_window_days = evalWindowDays;

        const response = await axios.get('/api/v1/backtest/results', { params: queryParams });
        const data = toCamelCase(response.data);
        return {
            total: data.total,
            page: data.page,
            limit: data.limit,
            items: (data.items || []).map(item => toCamelCase(item)),
        };
    },

    getOverallPerformance: async (evalWindowDays) => {
        try {
            const params = {};
            if (evalWindowDays) params.eval_window_days = evalWindowDays;
            const response = await axios.get('/api/v1/backtest/performance', { params });
            return toCamelCase(response.data);
        } catch (err) {
            if (err && err.response && err.response.status === 404) return null;
            throw err;
        }
    },

    getStockPerformance: async (code, evalWindowDays) => {
        try {
            const params = {};
            if (evalWindowDays) params.eval_window_days = evalWindowDays;
            const response = await axios.get(`/api/v1/backtest/performance/${encodeURIComponent(code)}`, { params });
            return toCamelCase(response.data);
        } catch (err) {
            if (err && err.response && err.response.status === 404) return null;
            throw err;
        }
    },
};
