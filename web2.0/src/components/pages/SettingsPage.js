/**
 * Settings Page Component - 设置页面
 */

const { ref, onMounted } = Vue;

export default {
    name: 'SettingsPage',

    setup() {
        // Settings state
        const settings = ref({
            // General settings
            general: {
                language: 'zh-CN',
                theme: 'light',
                autoRefresh: true,
                refreshInterval: 30,
            },
            // Notification settings
            notifications: {
                enablePush: true,
                enableEmail: false,
                enableDingTalk: false,
                enableFeishu: false,
            },
            // Analysis settings
            analysis: {
                defaultReportType: 'detailed',
                autoAnalyze: false,
                analyzeTime: '09:30',
            },
        });

        const isSaving = ref(false);
        const saveMessage = ref('');

        // Dropdown options
        const languageOptions = [
            { value: 'zh-CN', label: '简体中文' },
            { value: 'zh-TW', label: '繁體中文' },
            { value: 'en', label: 'English' },
        ];

        const themeOptions = [
            { value: 'light', label: '浅色' },
            { value: 'dark', label: '深色' },
            { value: 'auto', label: '自动' },
        ];

        const reportTypeOptions = [
            { value: 'simple', label: '简洁报告' },
            { value: 'detailed', label: '详细报告' },
            { value: 'comprehensive', label: '综合报告' },
        ];

        // Helper to get label by value
        const getLabelByValue = (options, value) => {
            const option = options.find(opt => opt.value === value);
            return option ? option.label : value;
        };

        // Close dropdown helper
        const closeDropdown = (dropdownId) => {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                const bsDropdown = bootstrap.Dropdown.getInstance(dropdown);
                if (bsDropdown) {
                    bsDropdown.hide();
                }
            }
        };

        // Methods
        const saveSettings = async () => {
            isSaving.value = true;
            saveMessage.value = '';

            try {
                // TODO: Implement API call to save settings
                await new Promise(resolve => setTimeout(resolve, 1000));
                saveMessage.value = '设置已保存';
                setTimeout(() => {
                    saveMessage.value = '';
                }, 3000);
            } catch (err) {
                saveMessage.value = '保存失败: ' + err.message;
            } finally {
                isSaving.value = false;
            }
        };

        const resetSettings = () => {
            if (confirm('确定要重置所有设置吗？')) {
                settings.value = {
                    general: {
                        language: 'zh-CN',
                        theme: 'light',
                        autoRefresh: true,
                        refreshInterval: 30,
                    },
                    notifications: {
                        enablePush: true,
                        enableEmail: false,
                        enableDingTalk: false,
                        enableFeishu: false,
                    },
                    analysis: {
                        defaultReportType: 'detailed',
                        autoAnalyze: false,
                        analyzeTime: '09:30',
                    },
                };
                saveSettings();
            }
        };

        return {
            settings,
            isSaving,
            saveMessage,
            languageOptions,
            themeOptions,
            reportTypeOptions,
            getLabelByValue,
            closeDropdown,
            saveSettings,
            resetSettings,
        };
    },

    template: `
        <div class="container-fluid py-4">
            <div class="row justify-content-center">
                <div class="col-lg-8">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h4 class="mb-0">设置</h4>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-secondary" @click="resetSettings">
                                <span class="btn-content">
                                    <i class="bi bi-arrow-counterclockwise"></i>
                                    <span>重置</span>
                                </span>
                            </button>
                            <button
                                class="btn btn-dark"
                                :class="{ 'is-loading': isSaving }"
                                @click="saveSettings"
                                :disabled="isSaving"
                            >
                                <span class="btn-content">
                                    <i class="bi bi-save"></i>
                                    <span>保存设置</span>
                                </span>
                            </button>
                        </div>
                    </div>

                    <!-- Save Message -->
                    <div v-if="saveMessage" class="alert alert-success alert-dismissible fade show" role="alert">
                        {{ saveMessage }}
                        <button type="button" class="btn-close" @click="saveMessage = ''"></button>
                    </div>

                    <!-- General Settings -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <i class="bi bi-sliders me-2"></i>
                            通用设置
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label class="form-label">界面语言</label>
                                <div class="dropdown custom-dropdown" id="languageDropdown">
                                    <button
                                        class="btn btn-outline-secondary dropdown-toggle w-100 text-start d-flex justify-content-between align-items-center"
                                        type="button"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                    >
                                        {{ getLabelByValue(languageOptions, settings.general.language) }}
                                    </button>
                                    <ul class="dropdown-menu w-100">
                                        <li v-for="opt in languageOptions" :key="opt.value">
                                            <a
                                                class="dropdown-item"
                                                :class="{ active: settings.general.language === opt.value }"
                                                href="#"
                                                @click.prevent="settings.general.language = opt.value; closeDropdown('languageDropdown')"
                                            >
                                                {{ opt.label }}
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">主题</label>
                                <div class="dropdown custom-dropdown" id="themeDropdown">
                                    <button
                                        class="btn btn-outline-secondary dropdown-toggle w-100 text-start d-flex justify-content-between align-items-center"
                                        type="button"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                    >
                                        {{ getLabelByValue(themeOptions, settings.general.theme) }}
                                    </button>
                                    <ul class="dropdown-menu w-100">
                                        <li v-for="opt in themeOptions" :key="opt.value">
                                            <a
                                                class="dropdown-item"
                                                :class="{ active: settings.general.theme === opt.value }"
                                                href="#"
                                                @click.prevent="settings.general.theme = opt.value; closeDropdown('themeDropdown')"
                                            >
                                                {{ opt.label }}
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="form-check form-switch">
                                    <input
                                        class="form-check-input"
                                        type="checkbox"
                                        v-model="settings.general.autoRefresh"
                                        id="autoRefresh"
                                    >
                                    <label class="form-check-label" for="autoRefresh">
                                        自动刷新数据
                                    </label>
                                </div>
                            </div>
                            <div v-if="settings.general.autoRefresh" class="mb-3">
                                <label class="form-label">刷新间隔（秒）</label>
                                <input
                                    type="number"
                                    class="form-control"
                                    v-model.number="settings.general.refreshInterval"
                                    min="10"
                                    max="300"
                                >
                            </div>
                        </div>
                    </div>

                    <!-- Notification Settings -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <i class="bi bi-bell me-2"></i>
                            通知设置
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <div class="form-check form-switch">
                                    <input
                                        class="form-check-input"
                                        type="checkbox"
                                        v-model="settings.notifications.enablePush"
                                        id="enablePush"
                                    >
                                    <label class="form-check-label" for="enablePush">
                                        启用浏览器推送通知
                                    </label>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="form-check form-switch">
                                    <input
                                        class="form-check-input"
                                        type="checkbox"
                                        v-model="settings.notifications.enableEmail"
                                        id="enableEmail"
                                    >
                                    <label class="form-check-label" for="enableEmail">
                                        启用邮件通知
                                    </label>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="form-check form-switch">
                                    <input
                                        class="form-check-input"
                                        type="checkbox"
                                        v-model="settings.notifications.enableDingTalk"
                                        id="enableDingTalk"
                                    >
                                    <label class="form-check-label" for="enableDingTalk">
                                        启用钉钉通知
                                    </label>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="form-check form-switch">
                                    <input
                                        class="form-check-input"
                                        type="checkbox"
                                        v-model="settings.notifications.enableFeishu"
                                        id="enableFeishu"
                                    >
                                    <label class="form-check-label" for="enableFeishu">
                                        启用飞书通知
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Analysis Settings -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <i class="bi bi-graph-up me-2"></i>
                            分析设置
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label class="form-label">默认报告类型</label>
                                <div class="dropdown custom-dropdown" id="reportTypeDropdown">
                                    <button
                                        class="btn btn-outline-secondary dropdown-toggle w-100 text-start d-flex justify-content-between align-items-center"
                                        type="button"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                    >
                                        {{ getLabelByValue(reportTypeOptions, settings.analysis.defaultReportType) }}
                                    </button>
                                    <ul class="dropdown-menu w-100">
                                        <li v-for="opt in reportTypeOptions" :key="opt.value">
                                            <a
                                                class="dropdown-item"
                                                :class="{ active: settings.analysis.defaultReportType === opt.value }"
                                                href="#"
                                                @click.prevent="settings.analysis.defaultReportType = opt.value; closeDropdown('reportTypeDropdown')"
                                            >
                                                {{ opt.label }}
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="form-check form-switch">
                                    <input
                                        class="form-check-input"
                                        type="checkbox"
                                        v-model="settings.analysis.autoAnalyze"
                                        id="autoAnalyze"
                                    >
                                    <label class="form-check-label" for="autoAnalyze">
                                        定时自动分析
                                    </label>
                                </div>
                            </div>
                            <div v-if="settings.analysis.autoAnalyze" class="mb-3">
                                <label class="form-label">分析时间</label>
                                <input
                                    type="time"
                                    class="form-control"
                                    v-model="settings.analysis.analyzeTime"
                                >
                            </div>
                        </div>
                    </div>

                    <!-- About -->
                    <div class="card">
                        <div class="card-header">
                            <i class="bi bi-info-circle me-2"></i>
                            关于
                        </div>
                        <div class="card-body">
                            <div class="d-flex align-items-center gap-3">
                                <div class="bg-dark text-white rounded p-3">
                                    <i class="bi bi-stars fs-3"></i>
                                </div>
                                <div>
                                    <h5 class="mb-1">Daily Stock Analysis</h5>
                                    <p class="text-muted mb-0">版本 2.0.0</p>
                                    <p class="text-muted small mb-0">A股/港股/美股自选股智能分析系统</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};
