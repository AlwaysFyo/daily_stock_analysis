/**
 * Watchlist Page Component - 自选/持仓页面
 * Layout: Fixed area + Table internal scrolling
 */

const { ref, computed, onMounted, watch } = Vue;
import { stocksApi } from '../../api/stocks.js';
import { analysisApi } from '../../api/analysis.js';
import { getConclusionClass, getTagClass } from '../../utils/tagStyles.js';
import BottomDrawerModal from '../common/BottomDrawerModal.js';

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

        const filteredStocks = computed(() => {
            let result = [...stockList.value];

            if (filterCategory.value !== 'all') {
                const categoryMap = {
                    'buy': '买入',
                    'hold': '观望',
                    'sell': '卖出'
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

                const items = response.items || [];
                stockList.value = items.map(item => ({
                    code: item.code,
                    name: item.name,
                    stockType: item.stockType,
                    status: item.status,
                    market: item.market,
                    industry: item.industry,
                    sector: item.sector,
                    price: 0,
                    change: '+0.00%',
                    changeUp: true,
                    conclusion: '观望',
                    tags: [],
                    score: 0,
                    buyPrice: null,
                    stopLoss: null,
                    target: null,
                    sentiment: [],
                }));

                loadQuotesForStocks();
            } catch (err) {
                console.error('Failed to load stocks:', err);
                loadError.value = err.message || '加载失败';
                stockList.value = [];
            } finally {
                isLoading.value = false;
            }
        };

        const loadQuotesForStocks = async () => {
            for (const stock of stockList.value) {
                try {
                    const quote = await stocksApi.getQuote(stock.code);
                    stock.price = quote.currentPrice || 0;
                    const changePercent = quote.changePercent || 0;
                    stock.change = changePercent >= 0 
                        ? `+${changePercent.toFixed(2)}%` 
                        : `${changePercent.toFixed(2)}%`;
                    stock.changeUp = changePercent >= 0;
                } catch (err) {
                    console.warn(`Failed to load quote for ${stock.code}:`, err);
                }
            }
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

        const getScoreClass = (score) => {
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

        watch(activeTab, () => {
            loadStocks();
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
            selectStock,
            closeModal,
            closeDropdown,
            getConclusionClass,
            getTagClass,
            getScoreClass,
            handleImportCSV,
            handleAddStock,
            handleViewDetails,
            handleRerunStock,
            handleCopyPush,
            handleRemoveStock,
            handleAddToPosition,
            handleRowMouseEnter,
            handleRowMouseLeave,
            loadStocks,
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
                            <button class="btn btn-outline-primary btn-sm" @click="handleImportCSV">
                                <span class="btn-content">
                                    <i class="bi bi-file-earmark-spreadsheet"></i>
                                    <span>CSV 导入</span>
                                </span>
                            </button>
                            <button class="btn btn-dark btn-sm" @click="handleAddStock">
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

                    <div class="watchlist-filters">
                        <div class="filter-item">
                            <label class="filter-label">筛选</label>
                            <div class="dropdown custom-dropdown" id="categoryDropdown">
                                <button
                                    class="btn btn-outline-secondary dropdown-toggle filter-dropdown-btn"
                                    type="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    {{ filterCategory === 'all' ? '全部建议' : filterCategory === 'buy' ? '买入' : filterCategory === 'hold' ? '观望' : '卖出' }}
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" :class="{ active: filterCategory === 'all' }" href="#" @click.prevent="filterCategory = 'all'; closeDropdown('categoryDropdown')">全部建议</a></li>
                                    <li><a class="dropdown-item" :class="{ active: filterCategory === 'buy' }" href="#" @click.prevent="filterCategory = 'buy'; closeDropdown('categoryDropdown')">买入</a></li>
                                    <li><a class="dropdown-item" :class="{ active: filterCategory === 'hold' }" href="#" @click.prevent="filterCategory = 'hold'; closeDropdown('categoryDropdown')">观望</a></li>
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
                </div>

                <div class="watchlist-table-container">
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
                                <td class="fw-medium" @click="selectStock(stock)">{{ stock.price.toFixed(2) }}</td>
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
                                    <span class="tag" :class="getConclusionClass(stock.conclusion)">
                                        {{ stock.conclusion || '-' }}
                                    </span>
                                </td>
                                <td @click="selectStock(stock)">
                                    <div class="stock-tags">
                                        <span
                                            v-for="(tag, index) in stock.tags"
                                            :key="index"
                                            class="tag"
                                            :class="getTagClass(tag.label)"
                                        >
                                            <i :class="tag.icon" class="small"></i>
                                            {{ tag.label }}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <div class="action-buttons">
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

                <div class="watchlist-footer">
                    <div class="watchlist-stats">
                        <span class="stats-text">
                            共 <strong>{{ dataStats.showing }}</strong> 条
                            <span v-if="searchQuery || filterCategory !== 'all'">
                                / 共 <strong>{{ dataStats.total }}</strong> 条
                            </span>
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
