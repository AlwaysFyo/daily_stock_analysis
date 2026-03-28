/**
 * Portfolio Page Component - 投资组合页面
 */

const { ref, computed, onMounted } = Vue;

export default {
    name: 'PortfolioPage',

    setup() {
        const portfolio = ref(null);
        const isLoading = ref(true);
        const error = ref(null);
        const selectedAccount = ref('all');
        const accounts = ref([]);

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

        onMounted(() => {
            loadAccounts();
            loadPortfolio();
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
                                        </tr>
                                        <tr v-if="positions.length === 0">
                                            <td colspan="8" class="text-center text-muted py-4">
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
            </div>
        </div>
    `
};
