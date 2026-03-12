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
