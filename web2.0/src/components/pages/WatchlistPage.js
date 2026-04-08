/**
 * Watchlist Page Component - 自选/持仓页面
 * Layout: Fixed area + Table internal scrolling
 */

const { ref, computed, onMounted, watch } = Vue;
import { stocksApi } from '../../api/stocks.js';
import { analysisApi } from '../../api/analysis.js';
import { backtestApi } from '../../api/backtest.js';
import { getConclusionClass, getTagClass, getTrendClass } from '../../utils/tagStyles.js';
import BottomDrawerModal from '../common/BottomDrawerModal.js';

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
    name: 'WatchlistPage',

    components: {
        BottomDrawerModal,
    },

    setup() {
        const activeTab = ref('watchlist');
        const filterCategory = ref('all');
        const filterScore = ref('default');
        const searchQuery = ref('');
        const selectedStock = ref(null);
        const showModal = ref(false);
        const stockList = ref([]);
        const isLoading = ref(false);
        const loadError = ref(null);

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

        const filteredStocks = computed(() => {
            let result = [...stockList.value];

            if (filterCategory.value !== 'all') {
                const categoryMap = {
                    'buy': '买入',
                    'hold': '观望',
                    'sell': '卖出',
                    'holding': '持有'
                };
                result = result.filter(stock => stock.conclusion === categoryMap[filterCategory.value]);
            }

            if (searchQuery.value) {
                const query = searchQuery.value.toLowerCase();
                result = result.filter(stock =>
                    stock.code.toLowerCase().includes(query) ||
                    stock.name.toLowerCase().includes(query)
                );
            }

            if (filterScore.value === 'score_desc') {
                result.sort((a, b) => b.score - a.score);
            } else if (filterScore.value === 'score_asc') {
                result.sort((a, b) => a.score - b.score);
            }

            return result;
        });

        const dataStats = computed(() => {
            const total = stockList.value.length;
            const filtered = filteredStocks.value.length;
            return {
                total,
                filtered,
                showing: filtered
            };
        });

        const totalPages = computed(() => Math.ceil(totalResults.value / pageSize));

        const targetDate = ref(null);

        const loadStocks = async () => {
            if (isLoading.value) return;

            isLoading.value = true;
            loadError.value = null;

            try {
                let response;
                if (activeTab.value === 'watchlist') {
                    response = await stocksApi.getWatchlist();
                } else if (activeTab.value === 'holding') {
                    response = await stocksApi.getHoldings();
                } else {
                    stockList.value = [];
                    return;
                }

                targetDate.value = response.targetDate || null;
                const items = response.items || [];
                
                stockList.value = items.map(item => {
                    const quote = item.quote;
                    const analysis = item.analysis;
                    
                    let price = null;
                    let change = '-';
                    let changeUp = false;
                    
                    if (quote && quote.close != null) {
                        price = typeof quote.close === 'number' ? quote.close : parseFloat(quote.close);
                    }
                    const pctChg = quote?.pctChg ?? quote?.pct_chg;
                    if (pctChg != null) {
                        change = pctChg >= 0 
                            ? `+${pctChg.toFixed(2)}%` 
                            : `${pctChg.toFixed(2)}%`;
                        changeUp = pctChg >= 0;
                    }
                    
                    return {
                        code: item.code,
                        name: item.name,
                        stockType: item.stockType,
                        status: item.status,
                        market: item.market,
                        industry: item.industry,
                        sector: item.sector,
                        price: price,
                        change: change,
                        changeUp: changeUp,
                        conclusion: analysis?.advice || '-',
                        tags: [],
                        score: analysis?.score ?? '-',
                        trend: analysis?.trend || '-',
                        analysisId: analysis?.analysisId ?? analysis?.analysis_id ?? null,
                        buyPrice: null,
                        stopLoss: null,
                        target: null,
                        sentiment: [],
                    };
                });
            } catch (err) {
                console.error('Failed to load stocks:', err);
                loadError.value = err.message || '加载失败';
                stockList.value = [];
            } finally {
                isLoading.value = false;
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

        const handlePageChange = (page) => {
            const windowDays = evalDays.value ? parseInt(evalDays.value, 10) : undefined;
            fetchResults(page, codeFilter.value.trim() || undefined, windowDays);
        };

        const selectStock = (stock) => {
            selectedStock.value = stock;
            showModal.value = true;
        };

        const closeModal = () => {
            showModal.value = false;
            setTimeout(() => {
                selectedStock.value = null;
            }, 300);
        };

        const handleImportCSV = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv,.xlsx,.xls';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    const result = await stocksApi.parseImport(file);
                    if (result.codes && result.codes.length > 0) {
                        for (const code of result.codes) {
                            await stocksApi.addToWatchlist(code);
                        }
                        await loadStocks();
                        alert(`成功导入 ${result.codes.length} 只股票`);
                    } else {
                        alert('未能识别股票代码');
                    }
                } catch (err) {
                    alert('导入失败: ' + err.message);
                }
            };
            input.click();
        };

        const handleAddStock = async () => {
            const code = prompt('请输入股票代码：');
            if (!code || !code.trim()) return;

            try {
                await stocksApi.addToWatchlist(code.trim());
                await loadStocks();
                alert('添加成功');
            } catch (err) {
                alert('添加失败: ' + err.message);
            }
        };

        const handleViewDetails = () => {
            if (selectedStock.value) {
                alert(`查看 ${selectedStock.value.code} 详情功能开发中`);
            }
        };

        const handleRerunStock = async () => {
            if (!selectedStock.value) return;

            try {
                await analysisApi.analyzeAsync({
                    stockCode: selectedStock.value.code,
                    reportType: 'detailed',
                });
                alert(`已提交 ${selectedStock.value.code} 分析任务`);
            } catch (err) {
                alert('提交失败: ' + err.message);
            }
        };

        const handleCopyPush = () => {
            if (selectedStock.value) {
                const text = `${selectedStock.value.code} ${selectedStock.value.name}\n建议: ${selectedStock.value.conclusion}\n评分: ${selectedStock.value.score}`;
                navigator.clipboard.writeText(text).then(() => {
                    alert('已复制到剪贴板');
                }).catch(() => {
                    alert('复制失败');
                });
            }
        };

        const handleRemoveStock = async (stock) => {
            if (!confirm(`确定要移除 ${stock.code} ${stock.name} 吗？`)) return;

            try {
                await stocksApi.removeStock(stock.code);
                const index = stockList.value.findIndex(s => s.code === stock.code);
                if (index > -1) {
                    stockList.value.splice(index, 1);
                }
            } catch (err) {
                alert('移除失败: ' + err.message);
            }
        };

        const handleAddToPosition = async (stock) => {
            try {
                await stocksApi.updateStockStatus(stock.code, 'holding');
                const index = stockList.value.findIndex(s => s.code === stock.code);
                if (index > -1) {
                    stockList.value.splice(index, 1);
                }
                alert(`已将 ${stock.code} ${stock.name} 加入持仓`);
            } catch (err) {
                alert('操作失败: ' + err.message);
            }
        };

        const handleAnalyze = async (stock) => {
            try {
                const response = await analysisApi.analyzeAsync({
                    stockCode: stock.code,
                    reportType: 'detailed',
                });
                alert(`已提交 ${stock.code} 分析任务`);
            } catch (err) {
                alert('提交失败: ' + err.message);
            }
        };

        const getScoreClass = (score) => {
            if (typeof score !== 'number') return 'score-default';
            if (score >= 80) return 'score-excellent';
            if (score >= 60) return 'score-good';
            return 'score-warning';
        };

        const closeDropdown = (dropdownId) => {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                const bsDropdown = bootstrap.Dropdown.getInstance(dropdown);
                if (bsDropdown) {
                    bsDropdown.hide();
                }
            }
        };

        let lastHoveredRow = null;
        let lastHoverTime = 0;

        const handleRowMouseEnter = (event, stock) => {
            const currentRow = event.currentTarget;
            const currentTime = Date.now();
            
            if (lastHoveredRow && lastHoveredRow !== currentRow) {
                const lastRect = lastHoveredRow.getBoundingClientRect();
                const currentRect = currentRow.getBoundingClientRect();
                
                if (currentRect.top > lastRect.top) {
                    currentRow.classList.add('indicator-from-top');
                    lastHoveredRow.classList.add('indicator-exit-down');
                } else if (currentRect.top < lastRect.top) {
                    currentRow.classList.add('indicator-from-bottom');
                    lastHoveredRow.classList.add('indicator-exit-up');
                }
                
                setTimeout(() => {
                    if (lastHoveredRow) {
                        lastHoveredRow.classList.remove('indicator-exit-down', 'indicator-exit-up');
                    }
                }, 150);
            }
            
            lastHoveredRow = currentRow;
            lastHoverTime = currentTime;
        };

        const handleRowMouseLeave = (event) => {
            const row = event.currentTarget;
            row.classList.remove('indicator-from-top', 'indicator-from-bottom');
        };

        watch(activeTab, (newTab) => {
            if (newTab === 'backtest') {
                initBacktest();
            } else {
                loadStocks();
            }
        });

        onMounted(() => {
            loadStocks();
        });

        return {
            activeTab,
            filterCategory,
            filterScore,
            searchQuery,
            selectedStock,
            showModal,
            stockList,
            isLoading,
            loadError,
            filteredStocks,
            dataStats,
            targetDate,
            selectStock,
            closeModal,
            closeDropdown,
            getConclusionClass,
            getTagClass,
            getTrendClass,
            getScoreClass,
            handleImportCSV,
            handleAddStock,
            handleViewDetails,
            handleRerunStock,
            handleCopyPush,
            handleRemoveStock,
            handleAddToPosition,
            handleAnalyze,
            handleRowMouseEnter,
            handleRowMouseLeave,
            loadStocks,
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
        <div class="watchlist-container">
            <div class="watchlist-card">
                <div class="watchlist-header">
                    <div class="watchlist-header-content">
                        <div class="watchlist-title-section">
                            <h5 class="watchlist-title">自选/持仓/回测</h5>
                            <small class="watchlist-subtitle">把自选股列表升级为可筛选、可追溯的资产视图。</small>
                        </div>
                        <div class="watchlist-actions">
                            <button v-if="activeTab !== 'backtest'" class="btn btn-outline-primary btn-sm" @click="handleImportCSV">
                                <span class="btn-content">
                                    <i class="bi bi-file-earmark-spreadsheet"></i>
                                    <span>CSV 导入</span>
                                </span>
                            </button>
                            <button v-if="activeTab !== 'backtest'" class="btn btn-dark btn-sm" @click="handleAddStock">
                                <span class="btn-content">
                                    <i class="bi bi-plus-lg"></i>
                                    <span>新增</span>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="watchlist-filter-section">
                    <div class="watchlist-tabs">
                        <button
                            type="button"
                            class="btn btn-fixed-width"
                            :class="activeTab === 'watchlist' ? 'btn-dark' : 'btn-outline-primary'"
                            @click="activeTab = 'watchlist'"
                        >
                            <span class="btn-content">自选</span>
                        </button>
                        <button
                            type="button"
                            class="btn btn-fixed-width"
                            :class="activeTab === 'holding' ? 'btn-dark' : 'btn-outline-primary'"
                            @click="activeTab = 'holding'"
                        >
                            <span class="btn-content">持仓</span>
                        </button>
                        <button
                            type="button"
                            class="btn btn-fixed-width"
                            :class="activeTab === 'backtest' ? 'btn-dark' : 'btn-outline-primary'"
                            @click="activeTab = 'backtest'"
                        >
                            <span class="btn-content">回测</span>
                        </button>
                    </div>

                    <!-- Stock filters (shown when not in backtest tab) -->
                    <div v-if="activeTab !== 'backtest'" class="watchlist-filters">
                        <div class="filter-item">
                            <label class="filter-label">筛选</label>
                            <div class="dropdown custom-dropdown" id="categoryDropdown">
                                <button
                                    class="btn btn-outline-secondary dropdown-toggle filter-dropdown-btn"
                                    type="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    {{ filterCategory === 'all' ? '全部建议' : filterCategory === 'buy' ? '买入' : filterCategory === 'hold' ? '观望' : filterCategory === 'sell' ? '卖出' : '持有' }}
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" :class="{ active: filterCategory === 'all' }" href="#" @click.prevent="filterCategory = 'all'; closeDropdown('categoryDropdown')">全部建议</a></li>
                                    <li><a class="dropdown-item" :class="{ active: filterCategory === 'buy' }" href="#" @click.prevent="filterCategory = 'buy'; closeDropdown('categoryDropdown')">买入</a></li>
                                    <li><a class="dropdown-item" :class="{ active: filterCategory === 'hold' }" href="#" @click.prevent="filterCategory = 'hold'; closeDropdown('categoryDropdown')">观望</a></li>
                                    <li><a class="dropdown-item" :class="{ active: filterCategory === 'holding' }" href="#" @click.prevent="filterCategory = 'holding'; closeDropdown('categoryDropdown')">持有</a></li>
                                    <li><a class="dropdown-item" :class="{ active: filterCategory === 'sell' }" href="#" @click.prevent="filterCategory = 'sell'; closeDropdown('categoryDropdown')">卖出</a></li>
                                </ul>
                            </div>
                        </div>

                        <div class="filter-item">
                            <label class="filter-label">排序</label>
                            <div class="dropdown custom-dropdown" id="scoreDropdown">
                                <button
                                    class="btn btn-outline-secondary dropdown-toggle filter-dropdown-btn"
                                    type="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    {{ filterScore === 'default' ? '综合评分' : filterScore === 'score_desc' ? '评分 ↓' : '评分 ↑' }}
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" :class="{ active: filterScore === 'default' }" href="#" @click.prevent="filterScore = 'default'; closeDropdown('scoreDropdown')">综合评分</a></li>
                                    <li><a class="dropdown-item" :class="{ active: filterScore === 'score_desc' }" href="#" @click.prevent="filterScore = 'score_desc'; closeDropdown('scoreDropdown')">评分 ↓</a></li>
                                    <li><a class="dropdown-item" :class="{ active: filterScore === 'score_asc' }" href="#" @click.prevent="filterScore = 'score_asc'; closeDropdown('scoreDropdown')">评分 ↑</a></li>
                                </ul>
                            </div>
                        </div>

                        <div class="filter-item filter-search">
                            <div class="task-search">
                                <i class="bi bi-search task-search-icon"></i>
                                <input
                                    type="text"
                                    class="task-search-input"
                                    v-model="searchQuery"
                                    placeholder="搜索代码/名称"
                                >
                            </div>
                        </div>
                    </div>

                    <!-- Backtest controls (shown when in backtest tab) -->
                    <div v-else class="backtest-controls-inline">
                        <div class="backtest-controls-row">
                            <div class="backtest-input-group">
                                <input
                                    type="text"
                                    v-model="codeFilter"
                                    @keydown="handleKeyDown"
                                    placeholder="按股票代码筛选（留空查询全部）"
                                    :disabled="isRunning"
                                    class="form-control form-control-sm backtest-input"
                                />
                            </div>
                            <button
                                type="button"
                                @click="handleFilter"
                                :disabled="isLoadingResults"
                                class="btn btn-outline-secondary btn-sm"
                            >
                                <i class="bi bi-funnel me-1"></i>筛选
                            </button>
                            <div class="backtest-window-group">
                                <span class="text-muted small">窗口</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="120"
                                    v-model="evalDays"
                                    placeholder="10"
                                    :disabled="isRunning"
                                    class="form-control form-control-sm backtest-input-sm"
                                />
                            </div>
                            <button
                                type="button"
                                @click="forceRerun = !forceRerun"
                                :disabled="isRunning"
                                :class="['btn', 'btn-sm', 'backtest-force-btn', { active: forceRerun }]"
                            >
                                <span class="force-dot"></span>
                                强制
                            </button>
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

                        <!-- Run Summary -->
                        <div v-if="runResult" class="backtest-summary-inline">
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
                        <div v-if="runError" class="alert alert-danger mt-2 py-2 small mb-0">
                            <i class="bi bi-exclamation-circle me-1"></i>{{ runError }}
                        </div>
                    </div>
                </div>

                <!-- Stock Table (shown when not in backtest tab) -->
                <div v-if="activeTab !== 'backtest'" class="watchlist-table-container">
                    <table class="watchlist-table">
                        <thead class="watchlist-table-head">
                            <tr>
                                <th>代码 / 名称</th>
                                <th>最新价</th>
                                <th>涨跌</th>
                                <th>评分</th>
                                <th>建议</th>
                                <th>趋势</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody class="watchlist-table-body">
                            <tr
                                v-for="stock in filteredStocks"
                                :key="stock.code"
                                class="watchlist-table-row"
                                :class="{ 'table-active': selectedStock?.code === stock.code }"
                                @mouseenter="handleRowMouseEnter($event, stock)"
                                @mouseleave="handleRowMouseLeave($event)"
                            >
                                <td @click="selectStock(stock)">
                                    <div class="stock-code-cell">
                                        <span class="stock-code-text">{{ stock.code }}</span>
                                        <span class="stock-name-text">{{ stock.name }}</span>
                                    </div>
                                </td>
                                <td class="fw-medium" @click="selectStock(stock)">{{ stock.price != null ? stock.price.toFixed(2) : '-' }}</td>
                                <td @click="selectStock(stock)">
                                    <span :class="stock.changeUp ? 'text-danger' : 'text-success'">
                                        {{ stock.change }}
                                    </span>
                                </td>
                                <td @click="selectStock(stock)">
                                    <span class="score-badge" :class="getScoreClass(stock.score)">
                                        {{ stock.score || '-' }}
                                    </span>
                                </td>
                                <td @click="selectStock(stock)">
                                    <span v-if="stock.conclusion && stock.conclusion !== '-'" class="tag" :class="getConclusionClass(stock.conclusion)">
                                        {{ stock.conclusion }}
                                    </span>
                                    <span v-else class="score-badge score-default">-</span>
                                </td>
                                <td @click="selectStock(stock)">
                                    <span v-if="stock.trend && stock.trend !== '-'" class="tag" :class="getTrendClass(stock.trend)">{{ stock.trend }}</span>
                                    <span v-else class="score-badge score-default">-</span>
                                </td>
                                <td>
                                    <div class="action-buttons">
                                        <button
                                            class="btn btn-action btn-analyze"
                                            @click.stop="handleAnalyze(stock)"
                                            title="分析"
                                        >
                                            <i class="bi bi-graph-up"></i>
                                        </button>
                                        <button
                                            class="btn btn-action btn-remove"
                                            @click.stop="handleRemoveStock(stock)"
                                            title="移除"
                                        >
                                            <i class="bi bi-trash"></i>
                                        </button>
                                        <button
                                            v-if="activeTab === 'watchlist'"
                                            class="btn btn-action btn-add-position"
                                            @click.stop="handleAddToPosition(stock)"
                                            title="加入持仓"
                                        >
                                            <i class="bi bi-briefcase-plus"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div v-if="isLoading" class="watchlist-loading-state">
                        <div class="watchlist-loading-spinner"></div>
                        <div class="watchlist-loading-text">正在加载...</div>
                    </div>

                    <div v-else-if="filteredStocks.length === 0" class="watchlist-empty-state">
                        <div class="watchlist-empty-icon">
                            <i class="bi bi-inbox"></i>
                        </div>
                        <div class="watchlist-empty-title">暂无数据</div>
                        <div class="watchlist-empty-desc">{{ loadError || '没有找到符合条件的股票' }}</div>
                    </div>
                </div>

                <!-- Backtest Content (shown when in backtest tab) -->
                <div v-else class="backtest-content-area">
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

                <div class="watchlist-footer">
                    <div class="watchlist-stats">
                        <span v-if="activeTab !== 'backtest'" class="stats-text">
                            共 <strong>{{ dataStats.showing }}</strong> 条
                            <span v-if="searchQuery || filterCategory !== 'all'">
                                / 共 <strong>{{ dataStats.total }}</strong> 条
                            </span>
                        </span>
                        <span v-else class="stats-text">
                            回测结果共 <strong>{{ totalResults }}</strong> 条
                        </span>
                    </div>
                </div>
            </div>

            <BottomDrawerModal
                :show="showModal"
                :title="selectedStock ? selectedStock.code + ' ' + selectedStock.name : '股票详情'"
                @close="closeModal"
            >
                <template #default>
                    <div v-if="selectedStock">
                        <p class="text-muted small mb-3">
                            选中一行后展示最近结论、价位与舆情。
                        </p>

                        <div class="mb-4">
                            <h5 class="fw-bold">{{ selectedStock.code }} {{ selectedStock.name }}</h5>
                            <p class="text-muted small mb-2">
                                最近一次结论：{{ selectedStock.conclusion || '-' }} · 综合评分 {{ selectedStock.score || '-' }}
                            </p>
                            <div class="d-flex gap-3 text-sm" v-if="selectedStock.buyPrice">
                                <span>买入：<strong>{{ selectedStock.buyPrice }}</strong></span>
                                <span>止损：<strong>{{ selectedStock.stopLoss }}</strong></span>
                                <span>目标：<strong>{{ selectedStock.target }}</strong></span>
                            </div>
                        </div>

                        <div class="mb-4" v-if="selectedStock.tags && selectedStock.tags.length > 0">
                            <h6 class="text-muted small mb-2">标签</h6>
                            <div class="d-flex gap-2 flex-wrap">
                                <span
                                    v-for="(tag, index) in selectedStock.tags"
                                    :key="index"
                                    class="tag"
                                    :class="getTagClass(tag.label)"
                                >
                                    <i :class="tag.icon"></i>
                                    {{ tag.label }}
                                </span>
                            </div>
                        </div>

                        <div class="mb-4" v-if="selectedStock.sentiment && selectedStock.sentiment.length > 0">
                            <h6 class="text-muted small mb-2">最近舆情</h6>
                            <div class="d-flex flex-column gap-2">
                                <div
                                    v-for="(item, index) in selectedStock.sentiment"
                                    :key="index"
                                    class="p-2 bg-light rounded"
                                >
                                    <div class="fw-medium">{{ item.title }}</div>
                                    <small class="text-muted">{{ item.source }} · {{ item.time }}</small>
                                </div>
                            </div>
                        </div>

                        <div class="d-flex flex-column gap-2">
                            <button class="btn btn-dark" @click="handleViewDetails">
                                <span class="btn-content">
                                    <i class="bi bi-eye"></i>
                                    <span>看个股详情</span>
                                </span>
                            </button>
                            <button class="btn btn-outline-primary" @click="handleRerunStock">
                                <span class="btn-content">
                                    <i class="bi bi-arrow-repeat"></i>
                                    <span>重跑该股票</span>
                                </span>
                            </button>
                            <button class="btn btn-outline-primary" @click="handleCopyPush">
                                <span class="btn-content">
                                    <i class="bi bi-clipboard"></i>
                                    <span>复制推送文案</span>
                                </span>
                            </button>
                        </div>
                    </div>
                </template>
            </BottomDrawerModal>
        </div>
    `
};
