/**
 * Watchlist Page Component - 自选/持仓页面
 * Layout: Fixed area + Table internal scrolling
 */

const { ref, computed, onMounted } = Vue;
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

        const stockList = ref([
            {
                code: '300750',
                name: '宁德时代',
                price: 188.40,
                change: '+2.03%',
                changeUp: true,
                conclusion: '买入',
                tags: [
                    { label: '放量突破', icon: 'bi-graph-up-arrow' },
                    { label: '趋势向上', icon: 'bi-trending-up' },
                ],
                score: 84,
                buyPrice: 182,
                stopLoss: 176,
                target: 205,
                sentiment: [
                    { title: '机构观点偏多', source: '示例来源', time: '10:12' },
                ],
            },
            {
                code: '600519',
                name: '贵州茅台',
                price: 1666.80,
                change: '+0.86%',
                changeUp: true,
                conclusion: '观望',
                tags: [
                    { label: '乖离>5%', icon: 'bi-arrow-down-up' },
                    { label: '多头排列', icon: 'bi-graph-up-arrow' },
                ],
                score: 78,
                buyPrice: 1620,
                stopLoss: 1578,
                target: 1750,
                sentiment: [
                    { title: '短期高位震荡', source: '示例来源', time: '09:40' },
                ],
            },
            {
                code: '000858',
                name: '五粮液',
                price: 138.20,
                change: '-1.12%',
                changeUp: false,
                conclusion: '卖出',
                tags: [
                    { label: '跌破MA20', icon: 'bi-arrow-down-up' },
                    { label: '放量下跌', icon: 'bi-arrow-down' },
                ],
                score: 61,
                buyPrice: 132,
                stopLoss: 128,
                target: 148,
                sentiment: [],
            },
            {
                code: '002594',
                name: '比亚迪',
                price: 245.60,
                change: '+3.25%',
                changeUp: true,
                conclusion: '买入',
                tags: [
                    { label: '突破前高', icon: 'bi-graph-up-arrow' },
                    { label: '量价齐升', icon: 'bi-trending-up' },
                ],
                score: 88,
                buyPrice: 238,
                stopLoss: 228,
                target: 275,
                sentiment: [
                    { title: '新能源销量创新高', source: '财经新闻', time: '08:30' },
                ],
            },
            {
                code: '601318',
                name: '中国平安',
                price: 42.85,
                change: '-0.58%',
                changeUp: false,
                conclusion: '观望',
                tags: [
                    { label: '横盘整理', icon: 'bi-arrow-left-right' },
                    { label: '量能萎缩', icon: 'bi-arrow-down' },
                ],
                score: 72,
                buyPrice: 41,
                stopLoss: 39,
                target: 48,
                sentiment: [],
            },
            {
                code: '600036',
                name: '招商银行',
                price: 32.45,
                change: '+1.12%',
                changeUp: true,
                conclusion: '买入',
                tags: [
                    { label: '底部放量', icon: 'bi-graph-up-arrow' },
                    { label: 'MACD金叉', icon: 'bi-trending-up' },
                ],
                score: 82,
                buyPrice: 31.5,
                stopLoss: 30,
                target: 38,
                sentiment: [
                    { title: '业绩超预期', source: '研报', time: '11:20' },
                ],
            },
            {
                code: '000333',
                name: '美的集团',
                price: 58.90,
                change: '+0.45%',
                changeUp: true,
                conclusion: '观望',
                tags: [
                    { label: '均线粘合', icon: 'bi-arrow-left-right' },
                    { label: '等待方向', icon: 'bi-arrow-left-right' },
                ],
                score: 75,
                buyPrice: 56,
                stopLoss: 53,
                target: 65,
                sentiment: [],
            },
            {
                code: '002415',
                name: '海康威视',
                price: 32.15,
                change: '-2.35%',
                changeUp: false,
                conclusion: '卖出',
                tags: [
                    { label: '破位下行', icon: 'bi-arrow-down' },
                    { label: '放量下跌', icon: 'bi-arrow-down' },
                ],
                score: 55,
                buyPrice: 30,
                stopLoss: 28,
                target: 36,
                sentiment: [
                    { title: '海外业务承压', source: '行业分析', time: '14:30' },
                ],
            },
            {
                code: '600276',
                name: '恒瑞医药',
                price: 42.30,
                change: '+1.85%',
                changeUp: true,
                conclusion: '买入',
                tags: [
                    { label: '创新药获批', icon: 'bi-graph-up-arrow' },
                    { label: '趋势反转', icon: 'bi-trending-up' },
                ],
                score: 86,
                buyPrice: 40,
                stopLoss: 38,
                target: 52,
                sentiment: [
                    { title: '新药临床试验成功', source: '公司公告', time: '09:15' },
                ],
            },
            {
                code: '000568',
                name: '泸州老窖',
                price: 185.60,
                change: '+0.92%',
                changeUp: true,
                conclusion: '观望',
                tags: [
                    { label: '高位震荡', icon: 'bi-arrow-left-right' },
                    { label: '筹码集中', icon: 'bi-arrow-left-right' },
                ],
                score: 76,
                buyPrice: 175,
                stopLoss: 168,
                target: 205,
                sentiment: [],
            },
            {
                code: '002230',
                name: '科大讯飞',
                price: 48.75,
                change: '+4.56%',
                changeUp: true,
                conclusion: '买入',
                tags: [
                    { label: 'AI概念爆发', icon: 'bi-graph-up-arrow' },
                    { label: '主力资金流入', icon: 'bi-trending-up' },
                ],
                score: 90,
                buyPrice: 46,
                stopLoss: 42,
                target: 58,
                sentiment: [
                    { title: '大模型技术突破', source: '科技资讯', time: '10:45' },
                ],
            },
            {
                code: '603259',
                name: '药明康德',
                price: 68.90,
                change: '-1.28%',
                changeUp: false,
                conclusion: '观望',
                tags: [
                    { label: '回调企稳', icon: 'bi-arrow-left-right' },
                    { label: '估值修复', icon: 'bi-arrow-left-right' },
                ],
                score: 70,
                buyPrice: 65,
                stopLoss: 60,
                target: 78,
                sentiment: [],
            },
            {
                code: '600900',
                name: '长江电力',
                price: 28.35,
                change: '+0.35%',
                changeUp: true,
                conclusion: '买入',
                tags: [
                    { label: '高股息', icon: 'bi-graph-up-arrow' },
                    { label: '防御属性', icon: 'bi-shield-check' },
                ],
                score: 80,
                buyPrice: 27.5,
                stopLoss: 26,
                target: 32,
                sentiment: [],
            },
            {
                code: '002475',
                name: '立讯精密',
                price: 32.80,
                change: '+2.15%',
                changeUp: true,
                conclusion: '买入',
                tags: [
                    { label: '果链龙头', icon: 'bi-graph-up-arrow' },
                    { label: '订单饱满', icon: 'bi-trending-up' },
                ],
                score: 83,
                buyPrice: 31,
                stopLoss: 29,
                target: 38,
                sentiment: [
                    { title: '新机型备货启动', source: '供应链消息', time: '13:20' },
                ],
            },
            {
                code: '000001',
                name: '平安银行',
                price: 11.25,
                change: '-0.88%',
                changeUp: false,
                conclusion: '观望',
                tags: [
                    { label: '估值低位', icon: 'bi-arrow-left-right' },
                    { label: '等待催化', icon: 'bi-arrow-left-right' },
                ],
                score: 68,
                buyPrice: 10.5,
                stopLoss: 9.8,
                target: 13,
                sentiment: [],
            },
            {
                code: '601012',
                name: '隆基绿能',
                price: 22.45,
                change: '-3.25%',
                changeUp: false,
                conclusion: '卖出',
                tags: [
                    { label: '行业产能过剩', icon: 'bi-arrow-down' },
                    { label: '价格战加剧', icon: 'bi-arrow-down' },
                ],
                score: 52,
                buyPrice: 21,
                stopLoss: 19,
                target: 26,
                sentiment: [
                    { title: '光伏行业景气度下行', source: '行业报告', time: '15:00' },
                ],
            },
            {
                code: '002352',
                name: '顺丰控股',
                price: 42.15,
                change: '+0.68%',
                changeUp: true,
                conclusion: '观望',
                tags: [
                    { label: '业务量回升', icon: 'bi-graph-up-arrow' },
                    { label: '成本控制', icon: 'bi-arrow-left-right' },
                ],
                score: 74,
                buyPrice: 40,
                stopLoss: 37,
                target: 48,
                sentiment: [],
            },
            {
                code: '300059',
                name: '东方财富',
                price: 15.85,
                change: '+2.45%',
                changeUp: true,
                conclusion: '买入',
                tags: [
                    { label: '市场活跃受益', icon: 'bi-graph-up-arrow' },
                    { label: '成交量放大', icon: 'bi-trending-up' },
                ],
                score: 85,
                buyPrice: 15,
                stopLoss: 13.5,
                target: 19,
                sentiment: [
                    { title: '两市成交额破万亿', source: '市场数据', time: '15:30' },
                ],
            },
            {
                code: '600309',
                name: '万华化学',
                price: 85.60,
                change: '-0.45%',
                changeUp: false,
                conclusion: '观望',
                tags: [
                    { label: '周期底部', icon: 'bi-arrow-left-right' },
                    { label: 'MDI价格企稳', icon: 'bi-arrow-left-right' },
                ],
                score: 73,
                buyPrice: 80,
                stopLoss: 75,
                target: 95,
                sentiment: [],
            },
            {
                code: '002714',
                name: '牧原股份',
                price: 42.80,
                change: '+1.58%',
                changeUp: true,
                conclusion: '买入',
                tags: [
                    { label: '猪周期反转', icon: 'bi-graph-up-arrow' },
                    { label: '产能去化', icon: 'bi-trending-up' },
                ],
                score: 81,
                buyPrice: 40,
                stopLoss: 37,
                target: 50,
                sentiment: [
                    { title: '能繁母猪存栏下降', source: '农业数据', time: '10:00' },
                ],
            },
            {
                code: '601888',
                name: '中国中免',
                price: 82.35,
                change: '-1.85%',
                changeUp: false,
                conclusion: '观望',
                tags: [
                    { label: '消费复苏缓慢', icon: 'bi-arrow-down' },
                    { label: '等待旺季', icon: 'bi-arrow-left-right' },
                ],
                score: 67,
                buyPrice: 78,
                stopLoss: 72,
                target: 95,
                sentiment: [],
            },
        ]);

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

        const handleImportWatchlist = () => {
            alert('导入自选功能开发中');
        };

        const handleImportCSV = () => {
            alert('CSV导入功能开发中');
        };

        const handleAddStock = () => {
            alert('新增股票功能开发中');
        };

        const handleViewDetails = () => {
            alert('查看个股详情功能开发中');
        };

        const handleRerunStock = () => {
            alert('重跑该股票功能开发中');
        };

        const handleCopyPush = () => {
            alert('复制推送文案功能开发中');
        };

        const handleRemoveStock = (stock) => {
            if (confirm(`确定要移除 ${stock.code} ${stock.name} 吗？`)) {
                const index = stockList.value.findIndex(s => s.code === stock.code);
                if (index > -1) {
                    stockList.value.splice(index, 1);
                }
            }
        };

        const handleAddToPosition = (stock) => {
            alert(`已将 ${stock.code} ${stock.name} 加入持仓`);
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

        return {
            activeTab,
            filterCategory,
            filterScore,
            searchQuery,
            selectedStock,
            showModal,
            stockList,
            filteredStocks,
            dataStats,
            selectStock,
            closeModal,
            closeDropdown,
            getConclusionClass,
            getTagClass,
            getScoreClass,
            handleImportWatchlist,
            handleImportCSV,
            handleAddStock,
            handleViewDetails,
            handleRerunStock,
            handleCopyPush,
            handleRemoveStock,
            handleAddToPosition,
            handleRowMouseEnter,
            handleRowMouseLeave,
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
                            :class="activeTab === 'position' ? 'btn-dark' : 'btn-outline-primary'"
                            @click="activeTab = 'position'"
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
                                        {{ stock.score }}
                                    </span>
                                </td>
                                <td @click="selectStock(stock)">
                                    <span class="tag" :class="getConclusionClass(stock.conclusion)">
                                        {{ stock.conclusion }}
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

                    <div v-if="filteredStocks.length === 0" class="watchlist-empty-state">
                        <div class="watchlist-empty-icon">
                            <i class="bi bi-inbox"></i>
                        </div>
                        <div class="watchlist-empty-title">暂无数据</div>
                        <div class="watchlist-empty-desc">没有找到符合条件的股票</div>
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
                                最近一次结论：{{ selectedStock.conclusion }} · 综合评分 {{ selectedStock.score }}
                            </p>
                            <div class="d-flex gap-3 text-sm">
                                <span>买入：<strong>{{ selectedStock.buyPrice }}</strong></span>
                                <span>止损：<strong>{{ selectedStock.stopLoss }}</strong></span>
                                <span>目标：<strong>{{ selectedStock.target }}</strong></span>
                            </div>
                        </div>

                        <div class="mb-4">
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

                        <div class="mb-4">
                            <h6 class="text-muted small mb-2">最近舆情</h6>
                            <div v-if="selectedStock.sentiment.length > 0" class="d-flex flex-column gap-2">
                                <div
                                    v-for="(item, index) in selectedStock.sentiment"
                                    :key="index"
                                    class="p-2 bg-light rounded"
                                >
                                    <div class="fw-medium">{{ item.title }}</div>
                                    <small class="text-muted">{{ item.source }} · {{ item.time }}</small>
                                </div>
                            </div>
                            <div v-else class="text-muted small">
                                暂无舆情数据
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
