/**
 * Vue Router Configuration
 */

const { createRouter, createWebHistory } = VueRouter;

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
        meta: { title: '投资组合', icon: 'bi-wallet2' }
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
    next();
});

export default router;
