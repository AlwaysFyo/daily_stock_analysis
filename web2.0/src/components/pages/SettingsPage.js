/**
 * Settings Page Component - 设置页面
 * 参考 dsa-web 的设置功能实现，提供完整的系统配置管理能力
 */

const { ref, reactive, computed, onMounted, watch, nextTick } = Vue;
import { systemConfigApi, SystemConfigValidationError, SystemConfigConflictError } from '../../api/systemConfig.js';
import appStore from '../../stores/appStore.js';

// 分类显示顺序
const CATEGORY_DISPLAY_ORDER = {
    base: 10,
    ai_model: 20,
    data_source: 30,
    notification: 40,
    system: 50,
    agent: 55,
    backtest: 60,
    uncategorized: 99,
};

// 分类标题映射
const CATEGORY_TITLES = {
    base: '基础设置',
    data_source: '数据源',
    ai_model: 'AI 模型',
    notification: '通知渠道',
    system: '系统设置',
    agent: 'Agent 设置',
    backtest: '回测配置',
    uncategorized: '其他',
};

// 分类描述映射
const CATEGORY_DESCRIPTIONS = {
    base: '管理自选股与基础运行参数。',
    data_source: '管理行情数据源与优先级策略。',
    ai_model: '管理模型供应商、模型名称与推理参数。',
    notification: '管理机器人、Webhook 和消息推送配置。',
    system: '管理调度、日志、端口等系统级参数。',
    agent: '管理 Agent 模式、策略与多 Agent 编排配置。',
    backtest: '管理回测开关、评估窗口和引擎参数。',
    uncategorized: '其他未归类的配置项。',
};

// 字段标题映射
const FIELD_TITLES = {
    STOCK_LIST: '自选股列表',
    TUSHARE_TOKEN: 'Tushare Token',
    BOCHA_API_KEYS: 'Bocha API Keys',
    TAVILY_API_KEYS: 'Tavily API Keys',
    SERPAPI_API_KEYS: 'SerpAPI API Keys',
    BRAVE_API_KEYS: 'Brave API Keys',
    SEARXNG_BASE_URLS: 'SearXNG Base URLs',
    SEARXNG_PUBLIC_INSTANCES_ENABLED: 'SearXNG 公共实例自动发现',
    MINIMAX_API_KEYS: 'MiniMax API Keys',
    NEWS_STRATEGY_PROFILE: '新闻策略窗口档位',
    NEWS_MAX_AGE_DAYS: '新闻最大时效（天）',
    REALTIME_SOURCE_PRIORITY: '实时数据源优先级',
    ENABLE_REALTIME_TECHNICAL_INDICATORS: '盘中实时技术面',
    LITELLM_MODEL: '主模型',
    AGENT_LITELLM_MODEL: 'Agent 主模型',
    LITELLM_FALLBACK_MODELS: '备选模型',
    LITELLM_CONFIG: 'LiteLLM 配置文件',
    LLM_CHANNELS: 'LLM 渠道列表',
    LLM_TEMPERATURE: '采样温度',
    AIHUBMIX_KEY: 'AIHubmix Key',
    DEEPSEEK_API_KEY: 'DeepSeek API Key',
    GEMINI_API_KEY: 'Gemini API Key',
    GEMINI_MODEL: 'Gemini 模型',
    GEMINI_TEMPERATURE: 'Gemini 温度参数',
    OPENAI_API_KEY: 'OpenAI API Key',
    OPENAI_BASE_URL: 'OpenAI Base URL',
    OPENAI_MODEL: 'OpenAI 模型',
    WECHAT_WEBHOOK_URL: '企业微信 Webhook',
    DINGTALK_APP_KEY: '钉钉 App Key',
    DINGTALK_APP_SECRET: '钉钉 App Secret',
    PUSHPLUS_TOKEN: 'PushPlus Token',
    REPORT_SUMMARY_ONLY: '仅分析结果摘要',
    MAX_WORKERS: '最大并发线程数',
    SCHEDULE_TIME: '定时任务时间',
    HTTP_PROXY: 'HTTP 代理',
    LOG_LEVEL: '日志级别',
    WEBUI_PORT: 'WebUI 端口',
    AGENT_MODE: '启用 Agent 策略问股',
    AGENT_MAX_STEPS: 'Agent 最大步数',
    AGENT_SKILLS: 'Agent 激活策略',
    AGENT_SKILL_DIR: 'Agent 策略目录',
    AGENT_ARCH: 'Agent 架构模式',
    AGENT_ORCHESTRATOR_MODE: '编排模式',
    AGENT_ORCHESTRATOR_TIMEOUT_S: 'Agent 超时（秒）',
    AGENT_RISK_OVERRIDE: '风控 Agent 否决',
    AGENT_SKILL_AUTOWEIGHT: '策略自动加权',
    AGENT_SKILL_ROUTING: '策略路由模式',
    AGENT_MEMORY_ENABLED: '记忆与校准',
    BACKTEST_ENABLED: '启用回测',
    BACKTEST_EVAL_WINDOW_DAYS: '回测评估窗口（交易日）',
    BACKTEST_MIN_AGE_DAYS: '回测最小历史天数',
    BACKTEST_ENGINE_VERSION: '回测引擎版本',
    BACKTEST_NEUTRAL_BAND_PCT: '回测中性区间阈值（%）',
};

// 字段描述映射
const FIELD_DESCRIPTIONS = {
    STOCK_LIST: '使用逗号分隔股票代码，例如：600519,300750。',
    TUSHARE_TOKEN: '用于接入 Tushare Pro 数据服务的凭据。',
    BOCHA_API_KEYS: '用于新闻检索的 Bocha 密钥，支持逗号分隔多个（最高优先级）。',
    TAVILY_API_KEYS: '用于新闻检索的 Tavily 密钥，支持逗号分隔多个。',
    SERPAPI_API_KEYS: '用于新闻检索的 SerpAPI 密钥，支持逗号分隔多个。',
    BRAVE_API_KEYS: '用于新闻检索的 Brave Search 密钥，支持逗号分隔多个。',
    SEARXNG_BASE_URLS: 'SearXNG 自建实例地址（逗号分隔，无配额兜底，需在 settings.yml 启用 format: json）。',
    SEARXNG_PUBLIC_INSTANCES_ENABLED: '当未配置 SearXNG 自建实例时，自动从 searx.space 获取公共实例并轮询使用；设为 false 可禁用该默认行为。',
    MINIMAX_API_KEYS: '用于新闻检索的 MiniMax 密钥，支持逗号分隔多个（最低优先级）。',
    NEWS_STRATEGY_PROFILE: '新闻窗口档位：ultra_short=1天，short=3天，medium=7天，long=30天。',
    NEWS_MAX_AGE_DAYS: '新闻最大时效上限。实际窗口 = min(策略档位天数, NEWS_MAX_AGE_DAYS)。',
    REALTIME_SOURCE_PRIORITY: '按逗号分隔填写数据源调用优先级。',
    ENABLE_REALTIME_TECHNICAL_INDICATORS: '盘中分析时用实时价计算 MA5/MA10/MA20 与多头排列。',
    LITELLM_MODEL: '主模型，格式 provider/model（如 gemini/gemini-2.5-flash）。',
    AGENT_LITELLM_MODEL: 'Agent 专用主模型。留空时继承主模型。',
    LITELLM_FALLBACK_MODELS: '备选模型，逗号分隔，主模型失败时按序尝试。',
    LITELLM_CONFIG: 'LiteLLM YAML 配置文件路径（高级用法），优先级最高。',
    LLM_CHANNELS: '渠道名称列表（逗号分隔）。',
    LLM_TEMPERATURE: '控制模型输出随机性，0 为确定性输出，2 为最大随机性，推荐 0.7。',
    AIHUBMIX_KEY: 'AIHubmix 一站式密钥，自动指向 aihubmix.com/v1。',
    DEEPSEEK_API_KEY: 'DeepSeek 官方 API 密钥。',
    GEMINI_API_KEY: '用于 Gemini 服务调用的密钥。',
    GEMINI_MODEL: '设置 Gemini 分析模型名称。',
    GEMINI_TEMPERATURE: '控制模型输出随机性，范围通常为 0.0 到 2.0。',
    OPENAI_API_KEY: '用于 OpenAI 兼容服务调用的密钥。',
    OPENAI_BASE_URL: 'OpenAI 兼容 API 地址，例如 https://api.deepseek.com/v1。',
    OPENAI_MODEL: 'OpenAI 兼容模型名称，例如 gpt-4o-mini、deepseek-chat。',
    WECHAT_WEBHOOK_URL: '企业微信机器人 Webhook 地址。',
    DINGTALK_APP_KEY: '钉钉应用模式 App Key。',
    DINGTALK_APP_SECRET: '钉钉应用模式 App Secret。',
    PUSHPLUS_TOKEN: 'PushPlus 推送令牌。',
    REPORT_SUMMARY_ONLY: '仅推送分析结果摘要，不包含个股详情。',
    MAX_WORKERS: '异步任务队列最大并发数。',
    SCHEDULE_TIME: '每日定时任务执行时间，格式为 HH:MM。',
    HTTP_PROXY: '网络代理地址，可留空。',
    LOG_LEVEL: '设置日志输出级别。',
    WEBUI_PORT: 'Web 页面服务监听端口。',
    AGENT_MODE: '是否启用 ReAct Agent 策略问股。',
    AGENT_MAX_STEPS: 'Agent 思考和调用工具的最大步数。',
    AGENT_SKILLS: '逗号分隔的交易策略列表。',
    AGENT_SKILL_DIR: '存放 Agent 策略定义文件的目录路径。',
    AGENT_ARCH: '选择 Agent 执行架构。single 为经典单 Agent；multi 为多 Agent 编排。',
    AGENT_ORCHESTRATOR_MODE: 'Multi-Agent 编排深度。',
    AGENT_ORCHESTRATOR_TIMEOUT_S: 'Agent 执行总超时预算（秒）。',
    AGENT_RISK_OVERRIDE: '允许风控 Agent 在发现关键风险时否决买入信号。',
    AGENT_SKILL_AUTOWEIGHT: '根据回测表现自动调整策略权重。',
    AGENT_SKILL_ROUTING: '策略选择方式。',
    AGENT_MEMORY_ENABLED: '启用记忆与校准系统。',
    BACKTEST_ENABLED: '是否启用回测功能。',
    BACKTEST_EVAL_WINDOW_DAYS: '回测评估窗口长度，单位为交易日。',
    BACKTEST_MIN_AGE_DAYS: '仅回测早于该天数的分析记录。',
    BACKTEST_ENGINE_VERSION: '回测引擎版本标识。',
    BACKTEST_NEUTRAL_BAND_PCT: '中性区间阈值百分比。',
};

// 需要在 AI 模型分类中隐藏的键
const AI_MODEL_HIDDEN_KEYS = new Set([
    'LLM_CHANNELS',
    'LLM_TEMPERATURE',
    'LITELLM_MODEL',
    'AGENT_LITELLM_MODEL',
    'LITELLM_FALLBACK_MODELS',
    'LITELLM_CONFIG',
    'AIHUBMIX_KEY',
    'DEEPSEEK_API_KEY',
    'DEEPSEEK_API_KEYS',
    'GEMINI_API_KEY',
    'GEMINI_API_KEYS',
    'GEMINI_MODEL',
    'GEMINI_MODEL_FALLBACK',
    'GEMINI_TEMPERATURE',
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_API_KEYS',
    'ANTHROPIC_MODEL',
    'ANTHROPIC_TEMPERATURE',
    'ANTHROPIC_MAX_TOKENS',
    'OPENAI_API_KEY',
    'OPENAI_API_KEYS',
    'OPENAI_BASE_URL',
    'OPENAI_MODEL',
    'OPENAI_VISION_MODEL',
    'OPENAI_TEMPERATURE',
    'VISION_MODEL',
]);

const SYSTEM_HIDDEN_KEYS = new Set([
    'ADMIN_AUTH_ENABLED',
]);

const LLM_CHANNEL_KEY_RE = /^LLM_[A-Z0-9]+_(PROTOCOL|BASE_URL|API_KEY|API_KEYS|MODELS|EXTRA_HEADERS|ENABLED)$/;

export default {
    name: 'SettingsPage',

    setup() {
        // 服务端状态
        const configVersion = ref('');
        const maskToken = ref('******');
        const serverItems = ref([]);

        // UI 状态
        const draftValues = reactive({});
        const activeCategory = ref('base');
        const validationIssues = ref([]);
        const toast = ref(null);

        // 请求状态
        const isLoading = ref(false);
        const isSaving = ref(false);
        const loadError = ref(null);
        const saveError = ref(null);
        const retryAction = ref(null);

        // 计算属性：合并后的配置项
        const mergedItems = computed(() => {
            return sortItemsByOrder(
                serverItems.value.map(item => ({
                    ...item,
                    value: draftValues[item.key] !== undefined ? draftValues[item.key] : item.value,
                }))
            );
        });

        // 计算属性：分类列表
        const categories = computed(() => {
            const categoryMap = new Map();
            for (const item of mergedItems.value) {
                if (!item.schema) continue;
                const category = item.schema.category;
                if (!categoryMap.has(category)) {
                    categoryMap.set(category, {
                        category,
                        title: CATEGORY_TITLES[category] || category,
                        description: CATEGORY_DESCRIPTIONS[category] || '',
                        displayOrder: CATEGORY_DISPLAY_ORDER[category] || 999,
                        fields: [],
                    });
                }
                categoryMap.get(category).fields.push(item.schema);
            }
            return [...categoryMap.values()].sort((a, b) => a.displayOrder - b.displayOrder);
        });

        // 计算属性：按分类分组的配置项
        const itemsByCategory = computed(() => {
            const map = {};
            for (const item of mergedItems.value) {
                const category = item.schema?.category || 'uncategorized';
                if (!map[category]) {
                    map[category] = [];
                }
                map[category].push(item);
            }
            return map;
        });

        // 计算属性：当前分类的配置项（过滤隐藏项）
        const activeItems = computed(() => {
            const rawItems = itemsByCategory.value[activeCategory.value] || [];
            const rawItemMap = new Map(rawItems.map(item => [item.key, String(item.value ?? '')]));
            const hasConfiguredChannels = Boolean((rawItemMap.get('LLM_CHANNELS') || '').trim());
            const hasLitellmConfig = Boolean((rawItemMap.get('LITELLM_CONFIG') || '').trim());

            if (activeCategory.value === 'ai_model') {
                return rawItems.filter(item => {
                    if (hasConfiguredChannels && LLM_CHANNEL_KEY_RE.test(item.key)) {
                        return false;
                    }
                    if (hasConfiguredChannels && !hasLitellmConfig && AI_MODEL_HIDDEN_KEYS.has(item.key)) {
                        return false;
                    }
                    return true;
                });
            }
            if (activeCategory.value === 'system') {
                return rawItems.filter(item => !SYSTEM_HIDDEN_KEYS.has(item.key));
            }
            return rawItems;
        });

        // 计算属性：脏数据
        const dirtyKeys = computed(() => {
            const keys = [];
            for (const item of serverItems.value) {
                const draftRaw = draftValues[item.key];
                if (draftRaw === undefined) continue;
                const normalizedDraft = normalizeFieldValue(draftRaw, item.schema);
                const normalizedCurrent = normalizeFieldValue(item.value, item.schema);
                if (normalizedDraft !== normalizedCurrent) {
                    keys.push(item.key);
                }
            }
            return keys;
        });

        const hasDirty = computed(() => dirtyKeys.value.length > 0);
        const dirtyCount = computed(() => dirtyKeys.value.length);

        // 计算属性：按字段分组的校验问题
        const issueByKey = computed(() => {
            const map = {};
            for (const issue of validationIssues.value) {
                if (!map[issue.key]) {
                    map[issue.key] = [];
                }
                map[issue.key].push(issue);
            }
            return map;
        });

        // 辅助函数
        function sortItemsByOrder(items) {
            return [...items].sort((a, b) => {
                const left = a.schema?.displayOrder ?? 9999;
                const right = b.schema?.displayOrder ?? 9999;
                if (left !== right) return left - right;
                return a.key.localeCompare(b.key);
            });
        }

        function normalizeFieldValue(value, schema) {
            const validation = schema?.validation || {};
            const isMultiValue = validation.multiValue || validation.multi_value;
            if (!isMultiValue) return value;
            return value
                .split(',')
                .map(entry => entry.trim())
                .filter(entry => entry.length > 0)
                .join(',');
        }

        function getCategoryTitle(category) {
            return CATEGORY_TITLES[category] || category;
        }

        function getCategoryDescription(category) {
            return CATEGORY_DESCRIPTIONS[category] || '';
        }

        function getFieldTitle(key) {
            return FIELD_TITLES[key] || key;
        }

        function getFieldDescription(key, fallback = '') {
            return FIELD_DESCRIPTIONS[key] || fallback;
        }

        // 加载配置
        async function load() {
            isLoading.value = true;
            loadError.value = null;
            retryAction.value = null;

            try {
                const config = await systemConfigApi.getConfig(true);
                applyServerPayload(config.items, config.configVersion, config.maskToken);
                toast.value = null;
                return true;
            } catch (error) {
                loadError.value = parseError(error);
                retryAction.value = 'load';
                return false;
            } finally {
                isLoading.value = false;
            }
        }

        function applyServerPayload(items, version, token) {
            const sorted = sortItemsByOrder(items);
            serverItems.value = sorted;
            configVersion.value = version;
            maskToken.value = token || '******';

            // 重置草稿值
            for (const item of sorted) {
                draftValues[item.key] = item.value;
            }

            // 设置默认分类
            const defaultCategory = sorted[0]?.schema?.category || 'base';
            if (!sorted.some(item => item.schema?.category === activeCategory.value)) {
                activeCategory.value = defaultCategory;
            }
            validationIssues.value = [];
        }

        // 保存配置
        async function save() {
            if (!hasDirty.value) {
                showToast('success', '当前没有可保存的修改。');
                return { success: true };
            }

            isSaving.value = true;
            saveError.value = null;
            retryAction.value = null;

            const changedItems = getChangedItems();

            try {
                // 先校验
                const validateResult = await systemConfigApi.validate({ items: changedItems });
                validationIssues.value = validateResult.issues || [];

                if (!validateResult.valid) {
                    saveError.value = {
                        title: '配置校验未通过',
                        message: '请先修正表单错误后再保存。',
                    };
                    retryAction.value = 'save';
                    return { success: false };
                }

                // 保存
                const updateResult = await systemConfigApi.update({
                    configVersion: configVersion.value,
                    maskToken: maskToken.value,
                    reloadNow: true,
                    items: changedItems,
                });

                // 重新加载
                const refreshed = await systemConfigApi.getConfig(true);
                applyServerPayload(refreshed.items, refreshed.configVersion, refreshed.maskToken);

                const warningText = updateResult.warnings?.length
                    ? `；警告：${updateResult.warnings.join('；')}`
                    : '';
                showToast('success', `配置已更新${warningText}`);
                return { success: true };
            } catch (error) {
                if (error instanceof SystemConfigValidationError) {
                    validationIssues.value = error.issues;
                    saveError.value = error.parsedError;
                } else if (error instanceof SystemConfigConflictError) {
                    saveError.value = {
                        title: '配置版本冲突',
                        message: `${error.message}，请先重新加载配置。`,
                    };
                } else {
                    saveError.value = parseError(error);
                }
                retryAction.value = 'save';
                return { success: false };
            } finally {
                isSaving.value = false;
            }
        }

        function getChangedItems() {
            return dirtyKeys.value
                .map(key => {
                    const serverItem = serverItems.value.find(item => item.key === key);
                    return {
                        key,
                        value: normalizeFieldValue(draftValues[key] ?? '', serverItem?.schema),
                    };
                })
                .filter(item => {
                    const serverItem = serverItems.value.find(s => s.key === item.key);
                    const normalizedCurrent = normalizeFieldValue(serverItem?.value ?? '', serverItem?.schema);
                    return item.value !== normalizedCurrent;
                });
        }

        // 重置草稿
        function resetDraft() {
            for (const item of serverItems.value) {
                draftValues[item.key] = item.value;
            }
            validationIssues.value = [];
            saveError.value = null;
        }

        // 设置草稿值
        function setDraftValue(key, value) {
            draftValues[key] = value;
        }

        // 重试
        async function retry() {
            if (retryAction.value === 'load') {
                await load();
            } else if (retryAction.value === 'save') {
                await save();
            }
        }

        // Toast
        function showToast(type, message) {
            toast.value = { type, message };
            setTimeout(() => {
                toast.value = null;
            }, 3200);
        }

        function parseError(error) {
            if (!error.response) {
                return {
                    title: '网络错误',
                    message: error.message || '无法连接到服务器',
                };
            }
            const { status, data } = error.response;
            return {
                title: `请求失败 (${status})`,
                message: data?.message || data?.error || error.message || '请求失败',
                status,
            };
        }

        // 判断是否为多值字段
        function isMultiValueField(item) {
            const validation = item.schema?.validation || {};
            return Boolean(validation.multiValue || validation.multi_value);
        }

        // 解析多值
        function parseMultiValues(value) {
            if (!value) return [''];
            const values = value.split(',').map(entry => entry.trim());
            return values.length ? values : [''];
        }

        // 序列化多值
        function serializeMultiValues(values) {
            return values.map(entry => entry.trim()).join(',');
        }

        // 切换分类
        function setActiveCategory(category) {
            activeCategory.value = category;
        }

        // 页面加载
        onMounted(() => {
            document.title = '系统设置 - DSA';
            load();
        });

        return {
            // 状态
            configVersion,
            maskToken,
            serverItems,
            categories,
            itemsByCategory,
            activeItems,
            activeCategory,
            hasDirty,
            dirtyCount,
            isLoading,
            isSaving,
            loadError,
            saveError,
            retryAction,
            toast,
            issueByKey,

            // 方法
            load,
            save,
            resetDraft,
            setDraftValue,
            retry,
            setActiveCategory,
            getCategoryTitle,
            getCategoryDescription,
            getFieldTitle,
            getFieldDescription,
            isMultiValueField,
            parseMultiValues,
            serializeMultiValues,
        };
    },

    template: `
        <div class="settings-page">
            <!-- 页面头部 -->
            <div class="settings-header-card">
                <div class="settings-header-content">
                    <div class="settings-header-info">
                        <h1 class="settings-title">系统设置</h1>
                        <p class="settings-subtitle">统一管理模型、数据源、通知、安全认证与导入能力。</p>
                    </div>
                    <div class="settings-header-actions">
                        <button
                            class="btn btn-outline-secondary"
                            @click="resetDraft"
                            :disabled="isLoading || isSaving"
                        >
                            <span class="btn-content">
                                <i class="bi bi-arrow-counterclockwise"></i>
                                <span>重置</span>
                            </span>
                        </button>
                        <button
                            class="btn btn-dark"
                            @click="save"
                            :disabled="!hasDirty || isSaving || isLoading"
                            :class="{ 'is-loading': isSaving }"
                        >
                            <span class="btn-content">
                                <i class="bi bi-save"></i>
                                <span>{{ isSaving ? '保存中...' : (dirtyCount ? '保存配置 (' + dirtyCount + ')' : '保存配置') }}</span>
                            </span>
                        </button>
                    </div>
                </div>

                <!-- 保存错误提示 -->
                <div v-if="saveError" class="settings-alert settings-alert-error">
                    <div class="settings-alert-icon">
                        <i class="bi bi-exclamation-circle-fill"></i>
                    </div>
                    <div class="settings-alert-content">
                        <div class="settings-alert-title">{{ saveError.title }}</div>
                        <div class="settings-alert-message">{{ saveError.message }}</div>
                    </div>
                    <button
                        v-if="retryAction === 'save'"
                        class="btn btn-sm btn-outline-danger"
                        @click="retry"
                    >
                        重试保存
                    </button>
                </div>
            </div>

            <!-- 加载错误提示 -->
            <div v-if="loadError" class="settings-alert settings-alert-error mb-4">
                <div class="settings-alert-icon">
                    <i class="bi bi-exclamation-circle-fill"></i>
                </div>
                <div class="settings-alert-content">
                    <div class="settings-alert-title">{{ loadError.title }}</div>
                    <div class="settings-alert-message">{{ loadError.message }}</div>
                </div>
                <button
                    class="btn btn-sm btn-outline-danger"
                    @click="retry"
                >
                    {{ retryAction === 'load' ? '重试加载' : '重新加载' }}
                </button>
            </div>

            <!-- 加载状态 -->
            <div v-if="isLoading" class="settings-loading">
                <div v-for="i in 6" :key="i" class="settings-skeleton-card">
                    <div class="settings-skeleton-title"></div>
                    <div class="settings-skeleton-input"></div>
                </div>
            </div>

            <!-- 主内容区 -->
            <div v-else class="settings-main">
                <!-- 左侧分类导航 -->
                <aside class="settings-sidebar">
                    <div class="settings-nav-card">
                        <div class="settings-nav-header">
                            <p class="settings-nav-label">配置分类</p>
                            <p class="settings-nav-hint">按模块整理系统设置与认证能力。</p>
                        </div>
                        <div class="settings-nav-list">
                            <button
                                v-for="category in categories"
                                :key="category.category"
                                class="settings-nav-item"
                                :class="{ active: category.category === activeCategory }"
                                @click="setActiveCategory(category.category)"
                            >
                                <div class="settings-nav-item-content">
                                    <p class="settings-nav-item-title">{{ getCategoryTitle(category.category) }}</p>
                                    <p v-if="getCategoryDescription(category.category)" class="settings-nav-item-desc">
                                        {{ getCategoryDescription(category.category) }}
                                    </p>
                                </div>
                                <span
                                    class="settings-nav-badge"
                                    :class="{ active: category.category === activeCategory }"
                                >
                                    {{ (itemsByCategory[category.category] || []).length }}
                                </span>
                            </button>
                        </div>
                    </div>
                </aside>

                <!-- 右侧配置内容 -->
                <section class="settings-content">
                    <!-- 配置区块卡片 -->
                    <div v-if="activeItems.length" class="settings-section-card">
                        <div class="settings-section-header">
                            <div>
                                <h2 class="settings-section-title">当前分类配置项</h2>
                                <p class="settings-section-desc">
                                    {{ getCategoryDescription(activeCategory) || '使用统一字段卡片维护当前分类的系统配置。' }}
                                </p>
                            </div>
                        </div>
                        <div class="settings-fields">
                            <div
                                v-for="item in activeItems"
                                :key="item.key"
                                class="settings-field-card"
                                :class="{ 'has-error': issueByKey[item.key]?.some(i => i.severity === 'error') }"
                            >
                                <div class="settings-field-header">
                                    <label class="settings-field-label" :for="'field-' + item.key">
                                        {{ getFieldTitle(item.key) }}
                                    </label>
                                    <span v-if="item.schema?.isSensitive" class="settings-badge settings-badge-sensitive">
                                        敏感
                                    </span>
                                    <span v-if="!item.schema?.isEditable" class="settings-badge settings-badge-readonly">
                                        只读
                                    </span>
                                </div>
                                <p v-if="getFieldDescription(item.key, item.schema?.description)" class="settings-field-desc">
                                    {{ getFieldDescription(item.key, item.schema?.description) }}
                                </p>

                                <!-- 文本域 -->
                                <textarea
                                    v-if="item.schema?.uiControl === 'textarea'"
                                    :id="'field-' + item.key"
                                    class="form-control settings-textarea"
                                    :value="item.value"
                                    :disabled="isSaving || !item.schema?.isEditable"
                                    @input="setDraftValue(item.key, $event.target.value)"
                                ></textarea>

                                <!-- 选择框 -->
                                <select
                                    v-else-if="item.schema?.uiControl === 'select' && item.schema?.options?.length"
                                    :id="'field-' + item.key"
                                    class="form-select settings-select"
                                    :value="item.value"
                                    :disabled="isSaving || !item.schema?.isEditable"
                                    @change="setDraftValue(item.key, $event.target.value)"
                                >
                                    <option value="">请选择</option>
                                    <option
                                        v-for="opt in item.schema.options"
                                        :key="typeof opt === 'string' ? opt : opt.value"
                                        :value="typeof opt === 'string' ? opt : opt.value"
                                    >
                                        {{ typeof opt === 'string' ? opt : opt.label }}
                                    </option>
                                </select>

                                <!-- 开关 -->
                                <div v-else-if="item.schema?.uiControl === 'switch'" class="settings-switch">
                                    <label class="form-check form-switch">
                                        <input
                                            class="form-check-input"
                                            type="checkbox"
                                            :id="'field-' + item.key"
                                            :checked="String(item.value).trim().toLowerCase() === 'true'"
                                            :disabled="isSaving || !item.schema?.isEditable"
                                            @change="setDraftValue(item.key, $event.target.checked ? 'true' : 'false')"
                                        >
                                        <span class="settings-switch-label">
                                            {{ String(item.value).trim().toLowerCase() === 'true' ? '已启用' : '未启用' }}
                                        </span>
                                    </label>
                                </div>

                                <!-- 密码字段（多值） -->
                                <div v-else-if="item.schema?.uiControl === 'password' && isMultiValueField(item)" class="settings-password-multi">
                                    <div
                                        v-for="(entry, index) in parseMultiValues(item.value)"
                                        :key="item.key + '-' + index"
                                        class="settings-password-row"
                                    >
                                        <input
                                            :type="'password'"
                                            :id="index === 0 ? 'field-' + item.key : 'field-' + item.key + '-' + index"
                                            class="form-control settings-input"
                                            :value="entry"
                                            :disabled="isSaving || !item.schema?.isEditable"
                                            @input="updateMultiValue(item, index, $event.target.value)"
                                        >
                                        <button
                                            class="btn btn-outline-secondary btn-sm"
                                            :disabled="isSaving || !item.schema?.isEditable || parseMultiValues(item.value).length <= 1"
                                            @click="removeMultiValue(item, index)"
                                        >
                                            删除
                                        </button>
                                    </div>
                                    <button
                                        class="btn btn-outline-secondary btn-sm mt-2"
                                        :disabled="isSaving || !item.schema?.isEditable"
                                        @click="addMultiValue(item)"
                                    >
                                        添加 Key
                                    </button>
                                </div>

                                <!-- 密码字段（单值） -->
                                <input
                                    v-else-if="item.schema?.uiControl === 'password'"
                                    type="password"
                                    :id="'field-' + item.key"
                                    class="form-control settings-input"
                                    :value="item.value"
                                    :disabled="isSaving || !item.schema?.isEditable"
                                    @input="setDraftValue(item.key, $event.target.value)"
                                >

                                <!-- 时间字段 -->
                                <input
                                    v-else-if="item.schema?.uiControl === 'time'"
                                    type="time"
                                    :id="'field-' + item.key"
                                    class="form-control settings-input"
                                    :value="item.value"
                                    :disabled="isSaving || !item.schema?.isEditable"
                                    @input="setDraftValue(item.key, $event.target.value)"
                                >

                                <!-- 数字字段 -->
                                <input
                                    v-else-if="item.schema?.uiControl === 'number'"
                                    type="number"
                                    :id="'field-' + item.key"
                                    class="form-control settings-input"
                                    :value="item.value"
                                    :disabled="isSaving || !item.schema?.isEditable"
                                    @input="setDraftValue(item.key, $event.target.value)"
                                >

                                <!-- 默认文本字段 -->
                                <input
                                    v-else
                                    type="text"
                                    :id="'field-' + item.key"
                                    class="form-control settings-input"
                                    :value="item.value"
                                    :disabled="isSaving || !item.schema?.isEditable"
                                    @input="setDraftValue(item.key, $event.target.value)"
                                >

                                <!-- 敏感字段提示 -->
                                <p v-if="item.schema?.isSensitive" class="settings-field-hint">
                                    敏感内容默认隐藏，可点击眼睛图标查看明文。
                                    {{ isMultiValueField(item) ? '支持添加多个输入框进行增删。' : '' }}
                                </p>

                                <!-- 校验错误 -->
                                <div v-if="issueByKey[item.key]?.length" class="settings-field-errors">
                                    <p
                                        v-for="(issue, idx) in issueByKey[item.key]"
                                        :key="issue.code + '-' + idx"
                                        class="settings-field-error"
                                        :class="issue.severity === 'error' ? 'error' : 'warning'"
                                    >
                                        {{ issue.message }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 空状态 -->
                    <div v-else class="settings-empty">
                        <div class="settings-empty-icon">
                            <i class="bi bi-inbox"></i>
                        </div>
                        <h3 class="settings-empty-title">当前分类下暂无配置项</h3>
                        <p class="settings-empty-desc">当前分类没有可编辑字段；可切换左侧分类继续查看其它系统配置。</p>
                    </div>
                </section>
            </div>

            <!-- Toast 提示 -->
            <div v-if="toast" class="settings-toast" :class="'toast-' + toast.type">
                <i :class="toast.type === 'success' ? 'bi bi-check-circle-fill' : 'bi bi-exclamation-circle-fill'"></i>
                <span>{{ toast.message }}</span>
            </div>
        </div>
    `,

    methods: {
        updateMultiValue(item, index, value) {
            const values = this.parseMultiValues(item.value);
            values[index] = value;
            this.setDraftValue(item.key, this.serializeMultiValues(values));
        },

        removeMultiValue(item, index) {
            const values = this.parseMultiValues(item.value);
            const newValues = values.filter((_, i) => i !== index);
            this.setDraftValue(item.key, this.serializeMultiValues(newValues.length ? newValues : ['']));
        },

        addMultiValue(item) {
            const values = this.parseMultiValues(item.value);
            values.push('');
            this.setDraftValue(item.key, this.serializeMultiValues(values));
        },
    },
};
