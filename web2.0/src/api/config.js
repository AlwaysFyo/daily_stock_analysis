/**
 * API Configuration
 */

// API Base URL - use relative path for same-origin requests
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000'
    : '';

// Axios instance configuration
const apiConfig = {
    baseURL: API_BASE_URL,
    timeout: 30000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
};

// API Endpoints
const endpoints = {
    // Analysis
    analysis: {
        analyze: '/api/v1/analysis/analyze',
        tasks: '/api/v1/analysis/tasks',
        taskStream: '/api/v1/analysis/tasks/stream',
        status: (taskId) => `/api/v1/analysis/status/${taskId}`,
    },
    // History
    history: {
        list: '/api/v1/history',
        detail: (queryId) => `/api/v1/history/${queryId}`,
        news: (queryId) => `/api/v1/history/${queryId}/news`,
    },
    // Stocks
    stocks: {
        extractFromImage: '/api/v1/stocks/extract-from-image',
        quote: (code) => `/api/v1/stocks/${code}/quote`,
        history: (code) => `/api/v1/stocks/${code}/history`,
    },
    // Auth
    auth: {
        login: '/api/v1/auth/login',
        logout: '/api/v1/auth/logout',
        status: '/api/v1/auth/status',
    },
    // System
    system: {
        config: '/api/v1/system/config',
    },
    // Health
    health: '/api/health',
};

export { API_BASE_URL, apiConfig, endpoints };
