/**
 * Overview Page Component - 概览页面
 */

const { ref, computed } = Vue;
import { analysisApi, DuplicateTaskError } from '../../api/analysis.js';
import appStore from '../../stores/appStore.js';
import { getConclusionClass, getTagClass } from '../../utils/tagStyles.js';
import BottomDrawerModal from '../common/BottomDrawerModal.js';

export default {
    name: 'OverviewPage',

    components: {
        BottomDrawerModal,
    },

    setup() {
        // State
        const stockCode = ref('');
        const stockCodeInput = ref(null);
        const isAnalyzing = ref(false);
        const inputError = ref('');
        const duplicateError = ref('');
        const showDetailModal = ref(false);
        const modalStock = ref(null);

        const showBottomDrawer = ref(false);
        const drawerStock = ref(null);

        const selectedRunMode = ref('all');
        const isRunning = ref(false);
        const runningMode = ref(null);

        // Mock data for stock cards (matching design)
        const decisionCards = ref([
            {
                code: '600519',
                name: '贵州茅台',
                conclusion: '观望',
                score: 78,
                buyPrice: 1620,
                stopLoss: 1578,
                target: 1750,
                tags: [
                    { label: '乖离>5%', icon: 'bi-arrow-down-up' },
                    { label: '多头排列', icon: 'bi-graph-up-arrow' },
                ],
            },
            {
                code: '000858',
                name: '五粮液',
                conclusion: '卖出',
                score: 61,
                buyPrice: 132,
                stopLoss: 128,
                target: 148,
                tags: [
                    { label: '跌破MA20', icon: 'bi-arrow-down-up' },
                    { label: '放量下跌', icon: 'bi-arrow-down' },
                ],
            },
            {
                code: '300750',
                name: '宁德时代',
                conclusion: '买入',
                score: 84,
                buyPrice: 182,
                stopLoss: 176,
                target: 205,
                tags: [
                    { label: '放量突破', icon: 'bi-graph-up-arrow' },
                    { label: '趋势向上', icon: 'bi-trending-up' },
                ],
            },
        ]);

        // Market data from store
        const marketIndices = computed(() => appStore.state.marketIndices);
        const marketOverview = computed(() => appStore.state.marketOverview);
        const alerts = computed(() => appStore.state.alerts);

        // Methods
        const validateStockCode = (code) => {
            if (!code || code.trim() === '') {
                return { valid: false, message: '请输入股票代码' };
            }
            // Basic validation for Chinese stock codes
            const cleanCode = code.trim().toUpperCase();
            if (!/^[0-9]{6}$/.test(cleanCode) && !/^[A-Z]{1,5}$/.test(cleanCode)) {
                return { valid: false, message: '股票代码格式不正确' };
            }
            return { valid: true, normalized: cleanCode };
        };

        const handleAnalyze = async () => {
            // If search box is empty, focus it and show hint
            if (!stockCode.value || stockCode.value.trim() === '') {
                inputError.value = '请输入股票代码';
                stockCodeInput.value?.focus();
                return;
            }

            const validation = validateStockCode(stockCode.value);
            if (!validation.valid) {
                inputError.value = validation.message;
                return;
            }

            inputError.value = '';
            duplicateError.value = '';
            isAnalyzing.value = true;

            try {
                const response = await analysisApi.analyzeAsync({
                    stockCode: validation.normalized,
                    reportType: 'detailed',
                });

                // Clear input on success
                stockCode.value = '';

                // Add task to store
                appStore.addTask({
                    taskId: response.taskId,
                    stockCode: validation.normalized,
                    status: 'pending',
                    progress: 0,
                });

            } catch (err) {
                if (err instanceof DuplicateTaskError) {
                    duplicateError.value = `股票 ${err.stockCode} 正在分析中，请等待完成`;
                } else {
                    inputError.value = err.message || '分析失败';
                }
            } finally {
                isAnalyzing.value = false;
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !isAnalyzing.value) {
                handleAnalyze();
            }
        };

        const clearErrors = () => {
            inputError.value = '';
            duplicateError.value = '';
        };

        const handleStockClick = (stock) => {
            openBottomDrawer(stock);
        };

        const openDetailModal = (stock) => {
            modalStock.value = stock;
            showDetailModal.value = true;
        };

        const closeDetailModal = () => {
            showDetailModal.value = false;
            modalStock.value = null;
        };

        const openBottomDrawer = (stock) => {
            drawerStock.value = stock;
            showBottomDrawer.value = true;
        };

        const closeBottomDrawer = () => {
            showBottomDrawer.value = false;
            drawerStock.value = null;
        };

        const handleRunAll = async () => {
            if (isRunning.value) return;
            
            selectedRunMode.value = 'all';
            isRunning.value = true;
            runningMode.value = 'all';
            
            try {
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (err) {
            } finally {
                isRunning.value = false;
                runningMode.value = null;
            }
        };

        const handleRunWatchlist = async () => {
            if (isRunning.value) return;
            
            selectedRunMode.value = 'watchlist';
            isRunning.value = true;
            runningMode.value = 'watchlist';
            
            try {
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (err) {
            } finally {
                isRunning.value = false;
                runningMode.value = null;
            }
        };

        const handleRunHoldings = async () => {
            if (isRunning.value) return;
            
            selectedRunMode.value = 'holdings';
            isRunning.value = true;
            runningMode.value = 'holdings';
            
            try {
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (err) {
            } finally {
                isRunning.value = false;
                runningMode.value = null;
            }
        };



        return {
            stockCode,
            stockCodeInput,
            isAnalyzing,
            inputError,
            duplicateError,
            decisionCards,
            marketIndices,
            marketOverview,
            alerts,
            selectedRunMode,
            isRunning,
            runningMode,
            showDetailModal,
            modalStock,
            showBottomDrawer,
            drawerStock,
            handleAnalyze,
            handleKeyDown,
            clearErrors,
            handleStockClick,
            openDetailModal,
            closeDetailModal,
            openBottomDrawer,
            closeBottomDrawer,
            handleRunAll,
            handleRunWatchlist,
            handleRunHoldings,
            getTagClass,
            getConclusionClass,
        };
    },

    template: `
        <div class="container-fluid overview-container">
            <!-- Quick Actions Section -->
            <div class="card overview-card">
                <div class="card-header overview-card-header">
                    <i class="bi bi-lightning-fill me-2"></i>
                    快捷操作
                </div>
                <div class="card-body overview-card-body">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <div class="d-flex gap-2">
                                <button
                                    class="btn btn-fixed-width"
                                    :class="[
                                        selectedRunMode === 'all' ? 'btn-dark' : 'btn-outline-primary',
                                        { 'is-loading': runningMode === 'all' }
                                    ]"
                                    @click="handleRunAll"
                                    :disabled="isRunning && runningMode !== 'all'"
                                >
                                    <span class="btn-content">
                                        <i class="bi bi-arrow-repeat"></i>
                                        <span>重跑今日全量</span>
                                    </span>
                                </button>
                                <button
                                    class="btn btn-fixed-width"
                                    :class="[
                                        selectedRunMode === 'watchlist' ? 'btn-dark' : 'btn-outline-primary',
                                        { 'is-loading': runningMode === 'watchlist' }
                                    ]"
                                    @click="handleRunWatchlist"
                                    :disabled="isRunning && runningMode !== 'watchlist'"
                                >
                                    <span class="btn-content">
                                        <i class="bi bi-filter"></i>
                                        <span>仅跑自选</span>
                                    </span>
                                </button>
                                <button
                                    class="btn btn-fixed-width"
                                    :class="[
                                        selectedRunMode === 'holdings' ? 'btn-dark' : 'btn-outline-primary',
                                        { 'is-loading': runningMode === 'holdings' }
                                    ]"
                                    @click="handleRunHoldings"
                                    :disabled="isRunning && runningMode !== 'holdings'"
                                >
                                    <span class="btn-content">
                                        <i class="bi bi-briefcase"></i>
                                        <span>仅跑持仓</span>
                                    </span>
                                </button>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="d-flex gap-2 align-items-start">
                                <div class="flex-grow-1">
                                    <div class="task-search" style="width: 100%;">
                                        <svg class="task-search-icon" width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                            <path d="M12 .503c.35 0 .64.274.685.627.11.877.314 1.725.601 2.532l.402.985a11.917 11.917 0 0 0 5.718 5.793l.973.407.317.11c.746.248 1.525.423 2.328.517.266.03.473.255.473.526l-.01.1a.534.534 0 0 1-.463.426l-.124.016c-.873.111-1.718.318-2.521.611l-.973.407a11.916 11.916 0 0 0-5.718 5.792l-.402.986a12.002 12.002 0 0 0-.601 2.532l-.028.128c-.09.289-.35.5-.657.5l-.128-.014a.704.704 0 0 1-.53-.486l-.027-.128a12.002 12.002 0 0 0-.601-2.532l-.402-.986a11.917 11.917 0 0 0-5.718-5.792l-.973-.407a11.61 11.61 0 0 0-2.303-.582l-.342-.045A.533.533 0 0 1 .503 12c0-.271.207-.495.473-.526a11.607 11.607 0 0 0 2.328-.517l.317-.11.973-.407a11.917 11.917 0 0 0 5.718-5.793l-.402-.985c-.287-.807-.491-1.655-.601-2.532A.703.703 0 0 1 12 .503Z" fill="currentColor"/>
                                        </svg>
                                        <input
                                            id="stock-code-input"
                                            ref="stockCodeInput"
                                            type="text"
                                            class="task-search-input"
                                            :class="{ 'is-invalid': inputError || duplicateError }"
                                            v-model="stockCode"
                                            @keydown="handleKeyDown"
                                            @blur="clearErrors"
                                            @input="clearErrors"
                                            placeholder="输入股票代码，如 600519"
                                            :disabled="isAnalyzing"
                                            aria-label="股票代码"
                                            aria-describedby="stock-code-help"
                                        >
                                    </div>
                                    <div id="stock-code-help" class="visually-hidden">请输入6位数字股票代码，例如600519</div>
                                    <div class="error-container">
                                        <div v-if="inputError" class="error-text">
                                            {{ inputError }}
                                        </div>
                                        <div v-if="duplicateError" class="error-text warning">
                                            {{ duplicateError }}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    class="btn btn-dark btn-run-fixed"
                                    :class="{ 'is-loading': isAnalyzing }"
                                    @click="handleAnalyze"
                                    :disabled="isAnalyzing"
                                    aria-label="运行股票分析"
                                >
                                    <span class="btn-content">
                                        <i class="bi bi-play-fill" aria-hidden="true"></i>
                                        <span>运行</span>
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Alert Cards -->
                    <div class="row g-3 mt-0 align-items-stretch">
                        <div class="col-md-4 d-flex">
                            <div class="alert-card alert-risk flex-fill">
                                <div class="alert-card-title">
                                    <i class="bi bi-arrow-down-up alert-icon-risk"></i>
                                    风险提示
                                </div>
                                <div class="alert-card-content">
                                    <ul>
                                        <li v-for="(item, index) in alerts.risk" :key="index">{{ item }}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4 d-flex">
                            <div class="alert-card alert-opportunity flex-fill">
                                <div class="alert-card-title">
                                    <i class="bi bi-graph-up-arrow alert-icon-opportunity"></i>
                                    机会提示
                                </div>
                                <div class="alert-card-content">
                                    <ul>
                                        <li v-for="(item, index) in alerts.opportunity" :key="index">{{ item }}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4 d-flex">
                            <div class="alert-card alert-sentiment flex-fill">
                                <div class="alert-card-title">
                                    <i class="bi bi-newspaper alert-icon-sentiment"></i>
                                    舆情异常
                                </div>
                                <div class="alert-card-content">
                                    <ul>
                                        <li v-for="(item, index) in alerts.sentiment" :key="index">{{ item }}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="row g-3 overview-main-row">
                <!-- Left: Decision Cards -->
                <div class="col-lg-7">
                    <div class="card overview-card">
                        <div class="card-header overview-card-header">
                            <i class="bi bi-star-fill me-2"></i>
                            最新决策（自选 Top）
                        </div>
                        <div class="card-body overview-card-body">
                            <div class="d-flex flex-column gap-3">
                                <div
                                    v-for="stock in decisionCards"
                                    :key="stock.code"
                                    class="stock-card stock-card-enhanced"
                                    @click="handleStockClick(stock)"
                                >
                                    <!-- Row 1: Stock Identity + Conclusion + Action -->
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div class="flex-grow-1">
                                            <div class="d-flex align-items-center gap-2 mb-1">
                                                <span class="stock-code">{{ stock.code }}</span>
                                                <span class="stock-name">{{ stock.name }}</span>
                                                <span class="tag" :class="getConclusionClass(stock.conclusion)">
                                                    {{ stock.conclusion }}
                                                </span>
                                            </div>
                                            <div class="stock-score">
                                                综合评分 <strong>{{ stock.score }}</strong>
                                            </div>
                                        </div>
                                        <button
                                            class="btn btn-outline-light btn-sm"
                                            :aria-label="'查看 ' + stock.name + ' 详细分析'"
                                            @click.stop="openBottomDrawer(stock)"
                                        >
                                            看详情
                                            <i class="bi bi-chevron-right" aria-hidden="true"></i>
                                        </button>
                                    </div>

                                    <!-- Divider -->
                                    <div class="stock-divider"></div>

                                    <!-- Row 2: Prices + Tags -->
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div class="stock-prices-compact">
                                            <div class="price-pill">
                                                <span class="price-label">买入</span>
                                                <span class="price-value price-buy">{{ stock.buyPrice }}</span>
                                            </div>
                                            <div class="price-pill">
                                                <span class="price-label">止损</span>
                                                <span class="price-value price-stop-loss">{{ stock.stopLoss }}</span>
                                            </div>
                                            <div class="price-pill">
                                                <span class="price-label">目标</span>
                                                <span class="price-value price-target">{{ stock.target }}</span>
                                            </div>
                                        </div>
                                        <div class="stock-tags">
                                            <span
                                                v-for="(tag, index) in stock.tags"
                                                :key="index"
                                                class="tag"
                                                :class="getTagClass(tag.label)"
                                            >
                                                <i :class="tag.icon"></i>
                                                {{ tag.label }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right: Market Snapshot -->
                <div class="col-lg-5">
                    <div class="card overview-card">
                        <div class="card-header overview-card-header">
                            <i class="bi bi-camera-fill me-2"></i>
                            大盘快照
                        </div>
                        <div class="card-body overview-card-body">
                            <!-- Market Indices -->
                            <div class="row g-3 mb-3">
                                <div class="col-4">
                                    <div class="market-index">
                                        <div class="market-index-name">{{ marketIndices.shanghai.name }}</div>
                                        <div
                                            class="market-index-value"
                                            :class="marketIndices.shanghai.up ? 'up' : 'down'"
                                        >
                                            {{ marketIndices.shanghai.value }}
                                        </div>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="market-index">
                                        <div class="market-index-name">{{ marketIndices.shenzhen.name }}</div>
                                        <div
                                            class="market-index-value"
                                            :class="marketIndices.shenzhen.up ? 'up' : 'down'"
                                        >
                                            {{ marketIndices.shenzhen.value }}
                                        </div>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="market-index">
                                        <div class="market-index-name">{{ marketIndices.chuangye.name }}</div>
                                        <div
                                            class="market-index-value"
                                            :class="marketIndices.chuangye.up ? 'up' : 'down'"
                                        >
                                            {{ marketIndices.chuangye.value }}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Market Overview -->
                            <div class="card bg-light border-0 mb-3">
                                <div class="card-body p-3">
                                    <h6 class="mb-3">市场概况</h6>
                                    <div class="row text-center g-2">
                                        <div class="col-4">
                                            <div class="text-muted small">上涨/下跌</div>
                                            <div class="fw-medium">
                                                <span class="text-up">{{ marketOverview.upCount }}</span>
                                                <span class="text-muted"> / </span>
                                                <span class="text-down">{{ marketOverview.downCount }}</span>
                                            </div>
                                        </div>
                                        <div class="col-4">
                                            <div class="text-muted small">涨停/跌停</div>
                                            <div class="fw-medium">
                                                <span class="text-up">{{ marketOverview.limitUpCount }}</span>
                                                <span class="text-muted"> / </span>
                                                <span class="text-down">{{ marketOverview.limitDownCount }}</span>
                                            </div>
                                        </div>
                                        <div class="col-4">
                                            <div class="text-muted small">成交额</div>
                                            <div class="fw-medium text-normal">{{ marketOverview.volume }}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- AI Interpretation -->
                            <div class="d-flex align-items-center justify-content-between">
                                <div class="text-muted small">
                                    <i class="bi bi-robot me-1" aria-hidden="true"></i>
                                    AI 解读：阶段震荡偏强，关注放量板块延续性。
                                </div>
                                <button
                                    class="btn btn-outline-light btn-sm"
                                    aria-label="查看完整市场复盘报告"
                                >
                                    今日复盘
                                    <i class="bi bi-arrow-right" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stock Detail Modal -->
            <stock-detail-modal
                :show="showDetailModal"
                :stock="modalStock"
                @close="closeDetailModal"
            ></stock-detail-modal>

            <!-- Bottom Drawer Modal -->
            <bottom-drawer-modal
                :show="showBottomDrawer"
                :title="drawerStock?.name + ' 详情'"
                height="85%"
                @close="closeBottomDrawer"
            >
                <div v-if="drawerStock" class="drawer-stock-content">
                    <!-- Stock Header -->
                    <div class="drawer-stock-header">
                        <div class="drawer-stock-code">{{ drawerStock.code }}</div>
                        <div class="drawer-stock-conclusion">
                            <span class="tag" :class="getConclusionClass(drawerStock.conclusion)">
                                {{ drawerStock.conclusion }}
                            </span>
                        </div>
                    </div>

                    <!-- Price Info -->
                    <div class="drawer-price-section">
                        <div class="drawer-price-item">
                            <span class="drawer-price-label">买入价</span>
                            <span class="drawer-price-value buy">{{ drawerStock.buyPrice }}</span>
                        </div>
                        <div class="drawer-price-item">
                            <span class="drawer-price-label">止损价</span>
                            <span class="drawer-price-value stop">{{ drawerStock.stopLoss }}</span>
                        </div>
                        <div class="drawer-price-item">
                            <span class="drawer-price-label">目标价</span>
                            <span class="drawer-price-value target">{{ drawerStock.target }}</span>
                        </div>
                    </div>

                    <!-- Tags -->
                    <div class="drawer-tags-section">
                        <h6 class="drawer-section-title">技术指标</h6>
                        <div class="drawer-tags-list">
                            <span 
                                v-for="(tag, index) in drawerStock.tags" 
                                :key="index"
                                class="tag"
                                :class="getTagClass(tag.label)"
                            >
                                <i :class="tag.icon"></i>
                                {{ tag.label }}
                            </span>
                        </div>
                    </div>

                    <!-- Score -->
                    <div class="drawer-score-section">
                        <h6 class="drawer-section-title">综合评分</h6>
                        <div class="drawer-score-value" :class="drawerStock.score >= 80 ? 'excellent' : drawerStock.score >= 60 ? 'good' : 'warning'">
                            {{ drawerStock.score }}分
                        </div>
                    </div>
                </div>
            </bottom-drawer-modal>
        </div>
    `
};
