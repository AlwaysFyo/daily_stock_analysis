/**
 * Login Page Component - 登录页面
 */

const { ref, computed, onMounted } = Vue;

export default {
    name: 'LoginPage',

    setup() {
        const password = ref('');
        const passwordConfirm = ref('');
        const isLoading = ref(false);
        const error = ref('');
        const authStatus = ref(null);
        const showPasswordSetup = ref(false);

        const isPasswordSet = computed(() => authStatus.value?.passwordSet ?? false);
        const isAuthEnabled = computed(() => authStatus.value?.authEnabled ?? false);

        const checkAuthStatus = async () => {
            try {
                const response = await axios.get('/api/v1/auth/status');
                authStatus.value = response.data;

                if (!response.data.authEnabled) {
                    window.location.assign('/#/');
                }
            } catch (err) {
                console.error('Failed to check auth status:', err);
                error.value = '无法连接到服务器';
            }
        };

        const handleLogin = async () => {
            if (!password.value.trim()) {
                error.value = '请输入密码';
                return;
            }

            if (!isPasswordSet.value && password.value !== passwordConfirm.value) {
                error.value = '两次输入的密码不一致';
                return;
            }

            if (!isPasswordSet.value && password.value.length < 6) {
                error.value = '密码至少需要6个字符';
                return;
            }

            isLoading.value = true;
            error.value = '';

            try {
                const payload = { password: password.value };
                if (!isPasswordSet.value) {
                    payload.passwordConfirm = passwordConfirm.value;
                }

                const response = await axios.post('/api/v1/auth/login', payload);

                if (response.data.loggedIn) {
                    const redirect = new URLSearchParams(window.location.search).get('redirect');
                    if (redirect) {
                        window.location.assign(redirect);
                    } else {
                        window.location.assign('/#/');
                    }
                }
            } catch (err) {
                const data = err.response?.data;
                if (data?.message) {
                    error.value = data.message;
                } else if (err.response?.status === 429) {
                    error.value = '尝试次数过多，请稍后再试';
                } else if (err.response?.status === 401) {
                    error.value = '密码错误';
                } else {
                    error.value = '登录失败，请重试';
                }
            } finally {
                isLoading.value = false;
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !isLoading.value) {
                handleLogin();
            }
        };

        onMounted(() => {
            checkAuthStatus();
        });

        return {
            password,
            passwordConfirm,
            isLoading,
            error,
            authStatus,
            showPasswordSetup,
            isPasswordSet,
            isAuthEnabled,
            handleLogin,
            handleKeyDown,
        };
    },

    template: `
        <div class="login-container">
            <div class="login-card">
                <div class="login-header">
                    <div class="login-logo">
                        <i class="bi bi-graph-up-arrow"></i>
                    </div>
                    <h1 class="login-title">Daily Stock Analysis</h1>
                    <p class="login-subtitle">A股自选股智能分析系统</p>
                </div>

                <div class="login-form" v-if="isAuthEnabled">
                    <div class="form-group mb-3">
                        <label class="form-label" for="password">
                            {{ isPasswordSet ? '管理员密码' : '设置管理员密码' }}
                        </label>
                        <input
                            id="password"
                            type="password"
                            class="form-control form-control-lg"
                            v-model="password"
                            @keydown="handleKeyDown"
                            :disabled="isLoading"
                            :placeholder="isPasswordSet ? '请输入密码' : '请设置密码（至少6位）'"
                            autocomplete="current-password"
                        >
                    </div>

                    <div class="form-group mb-3" v-if="!isPasswordSet">
                        <label class="form-label" for="passwordConfirm">确认密码</label>
                        <input
                            id="passwordConfirm"
                            type="password"
                            class="form-control form-control-lg"
                            v-model="passwordConfirm"
                            @keydown="handleKeyDown"
                            :disabled="isLoading"
                            placeholder="请再次输入密码"
                            autocomplete="new-password"
                        >
                        <div class="form-text mt-2">
                            <i class="bi bi-info-circle me-1"></i>
                            首次登录需要设置管理员密码
                        </div>
                    </div>

                    <div v-if="error" class="alert alert-danger" role="alert">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        {{ error }}
                    </div>

                    <button
                        class="btn btn-dark btn-lg w-100"
                        @click="handleLogin"
                        :disabled="isLoading"
                    >
                        <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                        <span v-if="isLoading">{{ isPasswordSet ? '登录中...' : '设置密码并登录' }}</span>
                        <span v-else>{{ isPasswordSet ? '登录' : '设置密码并登录' }}</span>
                    </button>
                </div>

                <div class="login-loading" v-else-if="authStatus === null">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3 text-muted">正在检查认证状态...</p>
                </div>

                <div class="login-footer">
                    <p class="text-muted small mb-0">
                        <i class="bi bi-shield-check me-1"></i>
                        密码本地存储，安全可靠
                    </p>
                </div>
            </div>
        </div>
    `
};
