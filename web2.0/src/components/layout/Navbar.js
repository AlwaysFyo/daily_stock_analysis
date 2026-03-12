/**
 * Navbar Component
 */

const { computed, ref, onMounted } = Vue;

export default {
    name: 'Navbar',

    setup() {
        const route = VueRouter.useRoute();
        const router = VueRouter.useRouter();

        // Daily status: 'not_run', 'running', 'completed', 'failed'
        const dailyStatus = ref('completed');
        const lastRunTime = ref('03:05');

        // Theme state: 'light' or 'dark'
        const currentTheme = ref('light');

        // Initialize theme from localStorage or system preference
        onMounted(() => {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                currentTheme.value = savedTheme;
            } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                currentTheme.value = 'dark';
            }
            applyTheme(currentTheme.value);
        });

        // Apply theme to document
        const applyTheme = (theme) => {
            if (theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        };

        // Toggle theme between light and dark
        const toggleTheme = () => {
            const newTheme = currentTheme.value === 'light' ? 'dark' : 'light';
            currentTheme.value = newTheme;
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        };

        // Get theme icon based on current theme
        const getThemeIcon = () => {
            return currentTheme.value === 'light' ? 'bi-moon' : 'bi-sun';
        };

        // Get theme label based on current theme
        const getThemeLabel = () => {
            return currentTheme.value === 'light' ? '暗黑' : '浅色';
        };

        const navItems = [
            { path: '/', name: 'Overview', label: '概览', icon: 'bi-grid' },
            { path: '/watchlist', name: 'Watchlist', label: '模型策略', icon: 'bi-view-list' },
            { path: '/tasks', name: 'Tasks', label: '任务中心', icon: 'bi-activity' },
            { path: '/settings', name: 'Settings', label: '设置', icon: 'bi-gear' },
        ];

        const isActive = (path) => {
            return route.path === path;
        };

        const navigateTo = (path) => {
            router.push(path).catch(() => {});
        };

        const getDailyStatusClass = (status) => {
            const classes = {
                not_run: 'status-not-run',
                running: 'status-running',
                completed: 'status-completed',
                failed: 'status-failed',
            };
            return classes[status] || 'status-not-run';
        };

        const getDailyStatusIcon = (status) => {
            const icons = {
                not_run: 'bi bi-circle me-1 status-icon-not-run',
                running: 'bi bi-arrow-repeat spin me-1 status-icon-running',
                completed: 'bi bi-check-circle-fill me-1 status-icon-completed',
                failed: 'bi bi-x-circle-fill me-1 status-icon-failed',
            };
            return icons[status] || 'bi bi-circle me-1 status-icon-not-run';
        };

        const getDailyStatusText = (status) => {
            const texts = {
                not_run: '未运行',
                running: '运行中',
                completed: `已完成 ${lastRunTime.value}`,
                failed: '运行失败',
            };
            return texts[status] || '未运行';
        };

        return {
            navItems,
            dailyStatus,
            isActive,
            navigateTo,
            getDailyStatusClass,
            getDailyStatusIcon,
            getDailyStatusText,
            currentTheme,
            toggleTheme,
            getThemeIcon,
            getThemeLabel,
        };
    },

    template: `
        <nav class="navbar navbar-expand-lg">
            <div class="container-fluid">
                <!-- Logo -->
                <a class="navbar-brand" href="#" @click.prevent="navigateTo('/')">
                    <i class="bi bi-stars"></i>
                    <div>
                        <div>Daily Stock Analysis</div>
                    </div>
                </a>

                <!-- Mobile Toggle -->
                <button
                    class="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                >
                    <span class="navbar-toggler-icon"></span>
                </button>

                <!-- Navigation Items -->
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav mx-auto">
                        <li v-for="item in navItems" :key="item.path" class="nav-item">
                            <a
                                href="#"
                                class="nav-link"
                                :class="{ active: isActive(item.path) }"
                                @click.prevent="navigateTo(item.path)"
                            >
                                <i :class="item.icon"></i>
                                <span>{{ item.label }}</span>
                            </a>
                        </li>
                    </ul>

                    <!-- Right Side -->
                    <div class="d-flex align-items-center gap-3">
                        <span class="status-badge">
                            <i :class="getDailyStatusIcon(dailyStatus)"></i>
                            今日状态：{{ getDailyStatusText(dailyStatus) }}
                        </span>
                        <button class="btn btn-outline-primary btn-sm" @click="toggleTheme">
                            <i class="bi" :class="getThemeIcon()"></i>
                            {{ getThemeLabel() }}
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    `
};
