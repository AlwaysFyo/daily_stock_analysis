/**
 * Global Application Store using Vue 3 Composition API
 */

const { reactive, readonly, computed } = Vue;

// Create reactive state
const state = reactive({
    // Navigation
    currentRoute: '/',

    // Loading states
    isLoading: false,
    loadingMessage: '',

    // Error states
    error: null,

    // Toast notifications
    toasts: [],

    // Tasks
    activeTasks: [],

    // Market data
    marketIndices: {
        shanghai: { name: '上证指数', value: '+0.42%', up: true },
        shenzhen: { name: '深证成指', value: '-0.18%', up: false },
        chuangye: { name: '创业板', value: '+0.96%', up: true },
    },
    marketOverview: {
        upCount: '2580',
        downCount: '2140',
        limitUpCount: '64',
        limitDownCount: '7',
        volume: '8900 亿',
    },

    // Alerts
    alerts: {
        risk: [
            '乖离率>5% 标记 2 只',
            '跌破 MA20 1 只',
        ],
        opportunity: [
            '多头排列 3 只',
            '放量突破 1 只',
        ],
        sentiment: [
            '负面新闻 1 只',
        ],
    },

    // User preferences
    userPreferences: {
        theme: 'light',
        language: 'zh-CN',
    },
});

// Getters
const getters = {
    hasActiveTasks: computed(() => state.activeTasks.length > 0),
    pendingTasksCount: computed(() => state.activeTasks.filter(t => t.status === 'pending').length),
    processingTasksCount: computed(() => state.activeTasks.filter(t => t.status === 'processing').length),
};

// Actions
const actions = {
    setLoading(loading, message = '') {
        state.isLoading = loading;
        state.loadingMessage = message;
    },

    setError(error) {
        state.error = error;
    },

    clearError() {
        state.error = null;
    },

    addTask(task) {
        const exists = state.activeTasks.find(t => t.taskId === task.taskId);
        if (!exists) {
            state.activeTasks.push(task);
        }
    },

    updateTask(updatedTask) {
        const index = state.activeTasks.findIndex(t => t.taskId === updatedTask.taskId);
        if (index >= 0) {
            state.activeTasks[index] = { ...state.activeTasks[index], ...updatedTask };
        }
    },

    removeTask(taskId) {
        const index = state.activeTasks.findIndex(t => t.taskId === taskId);
        if (index >= 0) {
            state.activeTasks.splice(index, 1);
        }
    },

    setCurrentRoute(route) {
        state.currentRoute = route;
    },

    updateMarketIndices(indices) {
        state.marketIndices = { ...state.marketIndices, ...indices };
    },

    updateMarketOverview(overview) {
        state.marketOverview = { ...state.marketOverview, ...overview };
    },

    updateAlerts(alerts) {
        state.alerts = { ...state.alerts, ...alerts };
    },

    showToast(message, type = 'info', duration = 3000) {
        const id = Date.now() + Math.random();
        const toast = { id, message, type };
        state.toasts.push(toast);
        setTimeout(() => {
            this.removeToast(id);
        }, duration);
    },

    removeToast(id) {
        const index = state.toasts.findIndex(t => t.id === id);
        if (index >= 0) {
            state.toasts.splice(index, 1);
        }
    },
};

// Create store
const appStore = {
    state: readonly(state),
    ...getters,
    ...actions,
};

export default appStore;
