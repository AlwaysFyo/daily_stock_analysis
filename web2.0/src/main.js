/**
 * Main Application Entry Point
 * Vue 3 + Bootstrap 5 + Vue Router 4
 */

const { createApp } = Vue;

// Import components
import Navbar from './components/layout/Navbar.js';

// Import router
import router from './router/index.js';

// Import API (initializes axios interceptors)
import './api/index.js';

// Initialize smart scrollbar manager
import { getScrollbarManager } from './utils/scrollbarManager.js';

// Create App Component
const App = {
    name: 'App',

    components: {
        Navbar,
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
