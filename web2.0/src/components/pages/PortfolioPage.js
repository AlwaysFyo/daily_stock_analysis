/**
 * Portfolio Page Component - 投资组合页面
 */

const { ref, computed, onMounted, watch } = Vue;
import { getConclusionClass, getTrendClass } from '../../utils/tagStyles.js';
import { backtestApi } from '../../api/backtest.js';

function pct(value) {
    if (value == null) return '--';
    return `${value.toFixed(1)}%`;
}

function outcomeBadge(outcome) {
    if (!outcome) return '<span class="badge badge-default">--</span>';
    switch (outcome) {
        case 'win':
            return '<span class="badge badge-success glow">WIN</span>';
        case 'loss':
            return '<span class="badge badge-danger glow">LOSS</span>';
        case 'neutral':
            return '<span class="badge badge-warning">NEUTRAL</span>';
        default:
            return `<span class="badge badge-default">${outcome}</span>`;
    }
}

function statusBadge(status) {
    switch (status) {
        case 'completed':
            return '<span class="badge badge-success">completed</span>';
        case 'insufficient':
            return '<span class="badge badge-warning">insufficient</span>';
        case 'error':
            return '<span class="badge badge-danger">error</span>';
        default:
            return `<span class="badge badge-default">${status}</span>`;
    }
}

function boolIcon(value) {
    if (value === true) {
        return '<span class="backtest-status-chip backtest-status-chip-success"><span class="status-dot success"></span><i class="bi bi-check"></i></span>';
    }
    if (value === false) {
        return '<span class="backtest-status-chip backtest-status-chip-danger"><span class="status-dot danger"></span><i class="bi bi-x"></i></span>';
    }
    return '<span class="backtest-status-chip backtest-status-chip-neutral"><span class="status-dot neutral"></span><i class="bi bi-dash"></i></span>';
}

export default {
    name: 'PortfolioPage',

    setup() {
        const portfolio = ref(null);
        const isLoading = ref(true);
        const error = ref(null);
        const selectedAccount = ref('all');
        const accounts = ref([]);

        const codeFilter = ref('');
        const evalDays = ref('');
        const forceRerun = ref(false);
        const isRunning = ref(false);
        const runResult = ref(null);
        const runError = ref(null);
        const pageError = ref(null);

        const results = ref([]);
        const totalResults = ref(0);
        const currentPage = ref(1);
        const isLoadingResults = ref(false);
        const pageSize = 20;

        const overallPerf = ref(null);
        const stockPerf = ref(null);
        const isLoadingPerf = ref(false);

        const loadPortfolio = async () => {
            isLoading.value = true;
            error.value = null;
            try {
                const response = await axios.get('/api/v1/portfolio/snapshot', {
                    params: {
                        account_id: selectedAccount.value === 'all' ? null : selectedAccount.value
                    }
                });
                portfolio.value = response.data;
            } catch (err) {
                error.value = err.message || '加载投资组合失败';
            } finally {
                isLoading.value = false;
            }
        };

        const loadAccounts = async () => {
            try {
                const response = await axios.get('/api/v1/portfolio/accounts');
                accounts.value = response.data.accounts || [];
            } catch (err) {
                console.error('Failed to load accounts:', err);
            }
        };

        const fetchResults = async (page = 1, code, windowDays) => {
            isLoadingResults.value = true;
            try {
                const response = await backtestApi.getResults({
                    code: code || undefined,
                    evalWindowDays: windowDays,
                    page,
                    limit: pageSize
                });
                results.value = response.items;
                totalResults.value = response.total;
                currentPage.value = response.page;
                pageError.value = null;
            } catch (err) {
                console.error('Failed to fetch backtest results:', err);
                pageError.value = err.message || '获取回测结果失败';
            } finally {
                isLoadingResults.value = false;
            }
        };

        const fetchPerformance = async (code, windowDays) => {
            isLoadingPerf.value = true;
            try {
                const overall = await backtestApi.getOverallPerformance(windowDays);
                overallPerf.value = overall;

                if (code) {
                    const stock = await backtestApi.getStockPerformance(code, windowDays);
                    stockPerf.value = stock;
                } else {
                    stockPerf.value = null;
                }
                pageError.value = null;
            } catch (err) {
                console.error('Failed to fetch performance:', err);
                pageError.value = err.message || '获取性能指标失败';
            } finally {
                isLoadingPerf.value = false;
            }
        };

        const initBacktest = async () => {
            try {
                const overall = await backtestApi.getOverallPerformance();
                overallPerf.value = overall;
                const windowDays = overall?.evalWindowDays;
                if (windowDays && !evalDays.value) {
                    evalDays.value = String(windowDays);
                }
                fetchResults(1, undefined, windowDays);
            } catch (err) {
                console.error('Failed to init backtest:', err);
            }
        };

        const handleRun = async () => {
            isRunning.value = true;
            runResult.value = null;
            runError.value = null;
            try {
                const code = codeFilter.value.trim() || undefined;
                const evalWindowDays = evalDays.value ? parseInt(evalDays.value, 10) : undefined;
                const response = await backtestApi.run({
                    code,
                    force: forceRerun.value || undefined,
                    minAgeDays: forceRerun.value ? 0 : undefined,
                    evalWindowDays,
                });
                runResult.value = response;
                fetchResults(1, codeFilter.value.trim() || undefined, evalWindowDays);
                fetchPerformance(codeFilter.value.trim() || undefined, evalWindowDays);
            } catch (err) {
                runError.value = err.message || '运行回测失败';
            } finally {
                isRunning.value = false;
            }
        };

        const handleFilter = () => {
            const code = codeFilter.value.trim() || undefined;
            const windowDays = evalDays.value ? parseInt(evalDays.value, 10) : undefined;
            currentPage.value = 1;
            fetchResults(1, code, windowDays);
            fetchPerformance(code, windowDays);
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                handleFilter();
            }
        };

        const totalPages = computed(() => Math.ceil(totalResults.value / pageSize));

        const handlePageChange = (page) => {
            const windowDays = evalDays.value ? parseInt(evalDays.value, 10) : undefined;
            fetchResults(page, codeFilter.value.trim() || undefined, windowDays);
        };

        onMounted(() => {
            loadAccounts();
            loadPortfolio();
            initBacktest();
        });

        const totalValue = computed(() => {
            if (!portfolio.value) return 0;
            return portfolio.value.total_value || 0;
        });

        const totalPnl = computed(() => {
            if (!portfolio.value) return { value: 0, percent: 0 };
            return {
                value: portfolio.value.total_pnl || 0,
                percent: portfolio.value.total_pnl_percent || 0
            };
        });

        const positions = computed(() => {
            return portfolio.value?.positions || [];
        });

        const formatCurrency = (value) => {
            return new Intl.NumberFormat('zh-CN', {
                style: 'currency',
                currency: 'CNY',
                minimumFractionDigits: 2
            }).format(value);
        };

        const formatPercent = (value) => {
            const sign = value >= 0 ? '+' : '';
            return `${sign}${value.toFixed(2)}%`;
        };

        const getPnlClass = (value) => {
            if (value > 0) return 'pnl-up';
            if (value < 0) return 'pnl-down';
            return 'pnl-neutral';
        };

        return {
            portfolio,
            isLoading,
            error,
            selectedAccount,
            accounts,
            totalValue,
            totalPnl,
            positions,
            loadPortfolio,
            formatCurrency,
            formatPercent,
            getPnlClass,
            getConclusionClass,
            getTrendClass,
            codeFilter,
            evalDays,
            forceRerun,
            isRunning,
            runResult,
            runError,
            pageError,
            results,
            totalResults,
            currentPage,
            isLoadingResults,
            overallPerf,
            stockPerf,
            isLoadingPerf,
            totalPages,
            handleRun,
            handleFilter,
            handleKeyDown,
            handlePageChange,
            pct,
            outcomeBadge,
            statusBadge,
            boolIcon,
        };
    },

    template: `
        <div class="portfolio-page">
            <div class="container-fluid">
                <div class="page-header">
                    <h4 class="page-title">
                        <i class="bi bi-wallet2 me-2"></i>
                        投资组合
                    </h4>
                    <div class="page-actions">
                        <select v-model="selectedAccount" @change="loadPortfolio" class="form-select form-select-sm">
                            <option value="all">全部账户</option>
                            <option v-for="acc in accounts" :key="acc.id" :value="acc.id">
                                {{ acc.name }}
                            </option>
                        </select>
                        <button class="btn btn-outline-secondary btn-sm" @click="loadPortfolio">
                            <i class="bi bi-arrow-clockwise"></i>
                        </button>
                    </div>
                </div>

                <div v-if="isLoading" class="loading-state">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">加载中...</span>
                    </div>
                </div>

                <div v-else-if="error" class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    {{ error }}
                </div>

                <template v-else-if="portfolio">
                    <div class="row g-3 mb-4">
                        <div class="col-md-4">
                            <div class="stat-card">
                                <div class="stat-label">总资产</div>
                                <div class="stat-value">{{ formatCurrency(totalValue) }}</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="stat-card">
                                <div class="stat-label">总盈亏</div>
                                <div class="stat-value" :class="getPnlClass(totalPnl.value)">
                                    {{ formatCurrency(totalPnl.value) }}
                                </div>
                                <div class="stat-sub" :class="getPnlClass(totalPnl.percent)">
                                    {{ formatPercent(totalPnl.percent) }}
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="stat-card">
                                <div class="stat-label">持仓数量</div>
                                <div class="stat-value">{{ positions.length }}</div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <i class="bi bi-list-ul me-2"></i>
                            持仓明细
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>代码</th>
                                            <th>名称</th>
                                            <th class="text-end">持仓</th>
                                            <th class="text-end">成本</th>
                                            <th class="text-end">现价</th>
                                            <th class="text-end">市值</th>
                                            <th class="text-end">盈亏</th>
                                            <th class="text-end">占比</th>
                                            <th>建议</th>
                                            <th>趋势</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="pos in positions" :key="pos.stock_code">
                                            <td><code>{{ pos.stock_code }}</code></td>
                                            <td>{{ pos.stock_name }}</td>
                                            <td class="text-end">{{ pos.quantity }}</td>
                                            <td class="text-end">{{ pos.cost_price?.toFixed(2) }}</td>
                                            <td class="text-end">{{ pos.current_price?.toFixed(2) }}</td>
                                            <td class="text-end">{{ formatCurrency(pos.market_value) }}</td>
                                            <td class="text-end" :class="getPnlClass(pos.pnl)">
                                                {{ formatCurrency(pos.pnl) }}
                                                <br>
                                                <small :class="getPnlClass(pos.pnl_percent)">
                                                    {{ formatPercent(pos.pnl_percent) }}
                                                </small>
                                            </td>
                                            <td class="text-end">{{ pos.weight?.toFixed(1) }}%</td>
                                            <td>
                                                <span v-if="pos.advice && pos.advice !== '-'" class="tag" :class="getConclusionClass(pos.advice)">
                                                    {{ pos.advice }}
                                                </span>
                                                <span v-else class="score-badge score-default">-</span>
                                            </td>
                                            <td>
                                                <span v-if="pos.trend && pos.trend !== '-'" class="tag" :class="getTrendClass(pos.trend)">
                                                    {{ pos.trend }}
                                                </span>
                                                <span v-else class="score-badge score-default">-</span>
                                            </td>
                                        </tr>
                                        <tr v-if="positions.length === 0">
                                            <td colspan="10" class="text-center text-muted py-4">
                                                暂无持仓数据
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div v-if="portfolio.risk" class="row g-3 mt-3">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <i class="bi bi-shield-exclamation me-2"></i>
                                    风险提示
                                </div>
                                <div class="card-body">
                                    <div v-if="portfolio.risk.concentration" class="risk-item">
                                        <span class="risk-label">集中度风险</span>
                                        <span class="risk-value" 
                                              :class="portfolio.risk.concentration.alert ? 'text-danger' : 'text-success'">
                                            {{ portfolio.risk.concentration.top1_weight?.toFixed(1) }}%
                                        </span>
                                    </div>
                                    <div v-if="portfolio.risk.drawdown" class="risk-item">
                                        <span class="risk-label">最大回撤</span>
                                        <span class="risk-value"
                                              :class="portfolio.risk.drawdown.alert ? 'text-danger' : 'text-success'">
                                            {{ portfolio.risk.drawdown.value?.toFixed(2) }}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- Backtest Section -->
                <div class="backtest-section mt-4">
                    <div class="section-header">
                        <h5 class="section-title">
                            <i class="bi bi-graph-up-arrow me-2"></i>
                            策略回测
                        </h5>
                    </div>

                    <!-- Backtest Controls -->
                    <div class="backtest-controls">
                        <div class="row g-2 align-items-center">
                            <div class="col-auto flex-grow-1" style="min-width: 200px;">
                                <input
                                    type="text"
                                    v-model="codeFilter"
                                    @keydown="handleKeyDown"
                                    placeholder="按股票代码筛选（留空查询全部）"
                                    :disabled="isRunning"
                                    class="form-control backtest-input"
                                />
                            </div>
                            <div class="col-auto">
                                <button
                                    type="button"
                                    @click="handleFilter"
                                    :disabled="isLoadingResults"
                                    class="btn btn-outline-secondary btn-sm"
                                >
                                    <i class="bi bi-funnel me-1"></i>筛选
                                </button>
                            </div>
                            <div class="col-auto d-flex align-items-center gap-2">
                                <span class="text-muted small">窗口</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="120"
                                    v-model="evalDays"
                                    placeholder="10"
                                    :disabled="isRunning"
                                    class="form-control backtest-input-sm"
                                    style="width: 80px;"
                                />
                            </div>
                            <div class="col-auto">
                                <button
                                    type="button"
                                    @click="forceRerun = !forceRerun"
                                    :disabled="isRunning"
                                    :class="['btn', 'btn-sm', 'backtest-force-btn', { active: forceRerun }]"
                                >
                                    <span class="force-dot"></span>
                                    强制
                                </button>
                            </div>
                            <div class="col-auto">
                                <button
                                    type="button"
                                    @click="handleRun"
                                    :disabled="isRunning"
                                    class="btn btn-primary btn-sm"
                                >
                                    <template v-if="isRunning">
                                        <span class="spinner-border spinner-border-sm me-1"></span>
                                        运行中...
                                    </template>
                                    <template v-else>
                                        <i class="bi bi-play-fill me-1"></i>运行回测
                                    </template>
                                </button>
                            </div>
                        </div>

                        <!-- Run Summary -->
                        <div v-if="runResult" class="backtest-summary mt-2">
                            <span class="summary-item">
                                <span class="label">处理:</span>
                                <span class="value">{{ runResult.processed }}</span>
                            </span>
                            <span class="summary-item">
                                <span class="label">保存:</span>
                                <span class="value primary">{{ runResult.saved }}</span>
                            </span>
                            <span class="summary-item">
                                <span class="label">完成:</span>
                                <span class="value success">{{ runResult.completed }}</span>
                            </span>
                            <span class="summary-item">
                                <span class="label">不足:</span>
                                <span class="value warning">{{ runResult.insufficient }}</span>
                            </span>
                            <span v-if="runResult.errors > 0" class="summary-item">
                                <span class="label">错误:</span>
                                <span class="value danger">{{ runResult.errors }}</span>
                            </span>
                        </div>

                        <!-- Run Error -->
                        <div v-if="runError" class="alert alert-danger mt-2 py-2 small">
                            <i class="bi bi-exclamation-circle me-1"></i>{{ runError }}
                        </div>
                    </div>

                    <!-- Backtest Content -->
                    <div class="backtest-content">
                        <div class="row g-3">
                            <!-- Performance Cards -->
                            <div class="col-lg-3 col-md-4">
                                <div class="backtest-sidebar">
                                    <!-- Loading -->
                                    <div v-if="isLoadingPerf" class="text-center py-4">
                                        <div class="spinner-border spinner-border-sm text-primary"></div>
                                    </div>

                                    <!-- Overall Performance -->
                                    <div v-else-if="overallPerf" class="performance-card">
                                        <div class="performance-title">整体表现</div>
                                        <div class="metric-row">
                                            <span class="label">方向准确率</span>
                                            <span class="value accent">{{ pct(overallPerf.directionAccuracyPct) }}</span>
                                        </div>
                                        <div class="metric-row">
                                            <span class="label">胜率</span>
                                            <span class="value accent">{{ pct(overallPerf.winRatePct) }}</span>
                                        </div>
                                        <div class="metric-row">
                                            <span class="label">平均模拟收益</span>
                                            <span class="value">{{ pct(overallPerf.avgSimulatedReturnPct) }}</span>
                                        </div>
                                        <div class="metric-row">
                                            <span class="label">平均股票收益</span>
                                            <span class="value">{{ pct(overallPerf.avgStockReturnPct) }}</span>
                                        </div>
                                        <div class="metric-row">
                                            <span class="label">止损触发率</span>
                                            <span class="value">{{ pct(overallPerf.stopLossTriggerRate) }}</span>
                                        </div>
                                        <div class="metric-row">
                                            <span class="label">止盈触发率</span>
                                            <span class="value">{{ pct(overallPerf.takeProfitTriggerRate) }}</span>
                                        </div>
                                        <div class="metric-row">
                                            <span class="label">平均命中天数</span>
                                            <span class="value">{{ overallPerf.avgDaysToFirstHit != null ? overallPerf.avgDaysToFirstHit.toFixed(1) : '--' }}</span>
                                        </div>
                                        <div class="metric-footer">
                                            <span class="text-muted small">评估数</span>
                                            <span class="small font-monospace">
                                                {{ overallPerf.completedCount }} / {{ overallPerf.totalEvaluations }}
                                            </span>
                                        </div>
                                        <div class="d-flex justify-content-between">
                                            <span class="text-muted small">W / L / N</span>
                                            <span class="small font-monospace">
                                                <span class="text-success">{{ overallPerf.winCount }}</span>
                                                /
                                                <span class="text-danger">{{ overallPerf.lossCount }}</span>
                                                /
                                                <span class="text-warning">{{ overallPerf.neutralCount }}</span>
                                            </span>
                                        </div>
                                    </div>

                                    <!-- No Metrics -->
                                    <div v-else class="empty-performance">
                                        <i class="bi bi-bar-chart-line"></i>
                                        <div class="title">暂无指标</div>
                                        <div class="desc">运行回测以生成性能指标</div>
                                    </div>

                                    <!-- Stock Performance -->
                                    <div v-if="stockPerf" class="performance-card mt-3">
                                        <div class="performance-title">{{ stockPerf.code || codeFilter }}</div>
                                        <div class="metric-row">
                                            <span class="label">方向准确率</span>
                                            <span class="value accent">{{ pct(stockPerf.directionAccuracyPct) }}</span>
                                        </div>
                                        <div class="metric-row">
                                            <span class="label">胜率</span>
                                            <span class="value accent">{{ pct(stockPerf.winRatePct) }}</span>
                                        </div>
                                        <div class="metric-row">
                                            <span class="label">平均模拟收益</span>
                                            <span class="value">{{ pct(stockPerf.avgSimulatedReturnPct) }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Results Table -->
                            <div class="col-lg-9 col-md-8">
                                <!-- Page Error -->
                                <div v-if="pageError" class="alert alert-danger mb-3">
                                    <i class="bi bi-exclamation-circle me-2"></i>{{ pageError }}
                                </div>

                                <!-- Loading -->
                                <div v-if="isLoadingResults" class="text-center py-5">
                                    <div class="spinner-border text-primary"></div>
                                    <p class="mt-2 text-muted">加载结果中...</p>
                                </div>

                                <!-- Empty State -->
                                <div v-else-if="results.length === 0" class="backtest-empty">
                                    <div class="empty-icon">
                                        <i class="bi bi-clipboard-data"></i>
                                    </div>
                                    <div class="title">暂无结果</div>
                                    <div class="desc">运行回测以评估历史分析准确性</div>
                                </div>

                                <!-- Results Table -->
                                <div v-else class="backtest-table-wrapper">
                                    <div class="table-toolbar">
                                        <div>
                                            <span class="label-uppercase">结果集</span>
                                            <span class="text-muted small ms-2">
                                                {{ codeFilter.trim() ? '筛选: ' + codeFilter.trim() : '全部股票' }}
                                                {{ evalDays ? ' · ' + evalDays + ' 天窗口' : '' }}
                                            </span>
                                        </div>
                                        <span class="scroll-hint">小屏幕可横向滚动</span>
                                    </div>
                                    <div class="table-responsive">
                                        <table class="table table-hover backtest-table mb-0">
                                            <thead>
                                                <tr>
                                                    <th>代码</th>
                                                    <th>日期</th>
                                                    <th>建议</th>
                                                    <th>方向</th>
                                                    <th>结果</th>
                                                    <th class="text-end">收益%</th>
                                                    <th class="text-center">SL</th>
                                                    <th class="text-center">TP</th>
                                                    <th>状态</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr v-for="row in results" :key="row.analysisHistoryId">
                                                    <td class="code-cell">{{ row.code }}</td>
                                                    <td class="text-muted">{{ row.analysisDate || '--' }}</td>
                                                    <td class="advice-cell">
                                                        <span v-if="row.operationAdvice" :title="row.operationAdvice">
                                                            {{ row.operationAdvice.length > 20 ? row.operationAdvice.slice(0, 20) + '...' : row.operationAdvice }}
                                                        </span>
                                                        <span v-else class="text-muted">--</span>
                                                    </td>
                                                    <td>
                                                        <span class="d-flex align-items-center gap-2">
                                                            <span v-html="boolIcon(row.directionCorrect)"></span>
                                                            <span class="text-muted small">{{ row.directionExpected || '' }}</span>
                                                        </span>
                                                    </td>
                                                    <td><span v-html="outcomeBadge(row.outcome)"></span></td>
                                                    <td class="text-end return-cell">
                                                        <span :class="{
                                                            'text-success': row.simulatedReturnPct > 0,
                                                            'text-danger': row.simulatedReturnPct < 0,
                                                            'text-muted': row.simulatedReturnPct == null || row.simulatedReturnPct === 0
                                                        }">
                                                            {{ pct(row.simulatedReturnPct) }}
                                                        </span>
                                                    </td>
                                                    <td class="text-center"><span v-html="boolIcon(row.hitStopLoss)"></span></td>
                                                    <td class="text-center"><span v-html="boolIcon(row.hitTakeProfit)"></span></td>
                                                    <td><span v-html="statusBadge(row.evalStatus)"></span></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <!-- Pagination -->
                                    <div class="pagination-wrapper mt-3">
                                        <nav v-if="totalPages > 1">
                                            <ul class="pagination pagination-sm justify-content-center">
                                                <li class="page-item" :class="{ disabled: currentPage === 1 }">
                                                    <a class="page-link" href="#" @click.prevent="handlePageChange(currentPage - 1)">
                                                        <i class="bi bi-chevron-left"></i>
                                                    </a>
                                                </li>
                                                <li 
                                                    v-for="p in totalPages" 
                                                    :key="p" 
                                                    class="page-item"
                                                    :class="{ active: p === currentPage }"
                                                >
                                                    <a class="page-link" href="#" @click.prevent="handlePageChange(p)">{{ p }}</a>
                                                </li>
                                                <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                                                    <a class="page-link" href="#" @click.prevent="handlePageChange(currentPage + 1)">
                                                        <i class="bi bi-chevron-right"></i>
                                                    </a>
                                                </li>
                                            </ul>
                                        </nav>
                                        <p class="text-center text-muted small mt-2 mb-0">
                                            共 {{ totalResults }} 条结果 · 第 {{ currentPage }} / {{ Math.max(totalPages, 1) }} 页
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};
