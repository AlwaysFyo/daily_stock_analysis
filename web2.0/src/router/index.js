/**
 * Vue Router Configuration
 */

const { createRouter, createWebHistory } = VueRouter;

// Feature flags cache
let featureFlags = {
    enablePortfolioFeature: true
};

// Fetch feature flags from backend
async function fetchFeatureFlags() {
    try {
        const response = await axios.get('/api/v1/system/config');
        if (response.data && response.data.items) {
            const portfolioItem = response.data.items.find(
                item => item.key === 'ENABLE_PORTFOLIO_FEATURE'
            );
            if (portfolioItem) {
                const rawValue = portfolioItem.value;
                if (rawValue !== undefined && rawValue !== '') {
                    featureFlags.enablePortfolioFeature = rawValue === 'true';
                } else if (portfolioItem.schema && portfolioItem.schema.default_value) {
                    featureFlags.enablePortfolioFeature = portfolioItem.schema.default_value === 'true';
                }
            }
        }
    } catch (error) {
        console.warn('Failed to fetch feature flags:', error);
    }
}

// Route definitions
const routes = [
    {
        path: '/',
        name: 'Overview',
        component: () => import('../components/pages/OverviewPage.js'),
        meta: { title: '概览', icon: 'bi-grid' }
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('../components/pages/LoginPage.js'),
        meta: { title: '登录', public: true }
    },
    {
        path: '/chat',
        name: 'Chat',
        component: () => import('../components/pages/ChatPage.js'),
        meta: { title: 'Agent对话', icon: 'bi-chat-dots' }
    },
    {
        path: '/watchlist',
        name: 'Watchlist',
        component: () => import('../components/pages/WatchlistPage.js'),
        meta: { title: '自选/持仓', icon: 'bi-graph-up' }
    },
    {
        path: '/tasks',
        name: 'Tasks',
        component: () => import('../components/pages/TasksPage.js'),
        meta: { title: '任务中心', icon: 'bi-activity' }
    },
    {
        path: '/settings',
        name: 'Settings',
        component: () => import('../components/pages/SettingsPage.js'),
        meta: { title: '设置', icon: 'bi-gear' }
    },
    {
        path: '/portfolio',
        name: 'Portfolio',
        component: () => import('../components/pages/PortfolioPage.js'),
        meta: { title: '投资组合', icon: 'bi-wallet2', feature: 'portfolio' }
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('../components/pages/NotFoundPage.js'),
        meta: { title: '页面未找到' }
    }
];

// Create router instance
// Use hash mode for static file deployment compatibility
const router = createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
    scrollBehavior() {
        return { top: 0 };
    }
});

// Navigation guard
router.beforeEach((to, from, next) => {
    // Update page title
    document.title = to.meta.title
        ? `${to.meta.title} - Daily Stock Analysis`
        : 'Daily Stock Analysis';

    // Check feature flags
    if (to.meta.feature === 'portfolio' && !featureFlags.enablePortfolioFeature) {
        next({ path: '/' });
        return;
    }

    next();
});

// Initialize feature flags on app start
fetchFeatureFlags();

export { featureFlags, fetchFeatureFlags };
export default router;
