/**
 * Main Application Entry Point
 * Vue 3 + Bootstrap 5 + Vue Router 4
 */

const { createApp, computed } = Vue;

// Import components
import Navbar from './components/layout/Navbar.js';

// Import router
import router from './router/index.js';

// Import API (initializes axios interceptors)
import './api/index.js';

// Import store
import appStore from './stores/appStore.js';

// Initialize smart scrollbar manager
import { getScrollbarManager } from './utils/scrollbarManager.js';

// Create App Component
const App = {
    name: 'App',

    components: {
        Navbar,
    },

    setup() {
        const toasts = computed(() => appStore.state.toasts);
        const getToastIcon = (type) => {
            const icons = {
                success: 'bi-check-circle-fill',
                error: 'bi-x-circle-fill',
                warning: 'bi-exclamation-triangle-fill',
                info: 'bi-info-circle-fill',
            };
            return icons[type] || icons.info;
        };

        return {
            toasts,
            getToastIcon,
            removeToast: (id) => appStore.removeToast(id),
        };
    },

    template: `
        <div id="app-container">
            <!-- Navigation -->
            <Navbar />

            <!-- Main Content -->
            <main class="main-content">
                <router-view v-slot="{ Component }">
                    <transition name="fade" mode="out-in">
                        <component :is="Component" />
                    </transition>
                </router-view>
            </main>

            <!-- Toast Container -->
            <div class="toast-container">
                <transition-group name="toast">
                    <div
                        v-for="toast in toasts"
                        :key="toast.id"
                        class="toast-item"
                        :class="'toast-' + toast.type"
                    >
                        <i :class="['bi', getToastIcon(toast.type)]"></i>
                        <span class="toast-message">{{ toast.message }}</span>
                        <button class="toast-close" @click="removeToast(toast.id)">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                </transition-group>
            </div>
        </div>
    `
};

// Create and mount the application
const app = createApp(App);

// Use router
app.use(router);

// Wait for router to be ready before mounting
router.isReady().then(() => {
    app.mount('#app');
    
    // Initialize scrollbar manager after app is mounted
    getScrollbarManager().init();
    
    console.log('Daily Stock Analysis Web 2.0 initialized');
});
