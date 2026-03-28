/**
 * Tasks Page Component - Task Center Page
 * Layout: Fixed area + Table internal scrolling (matching WatchlistPage style)
 */

const { ref, computed, onMounted, onUnmounted } = Vue;
import { analysisApi } from '../../api/analysis.js';

export default {
    name: 'TasksPage',

    setup() {
        // State
        const tasks = ref([]);
        const isLoading = ref(false);
        const loadError = ref(null);
        const eventSource = ref(null);
        const filterStatus = ref('all'); // all, pending, processing, completed, failed
        const searchQuery = ref('');
        const selectedTask = ref(null);
        let reconnectTimeout = null;

        // Computed
        const filteredTasks = computed(() => {
            let result = tasks.value;

            // Filter by status
            if (filterStatus.value !== 'all') {
                result = result.filter(task => task.status === filterStatus.value);
            }

            // Filter by search query
            if (searchQuery.value.trim()) {
                const query = searchQuery.value.toLowerCase();
                result = result.filter(task =>
                    task.stockCode.toLowerCase().includes(query) ||
                    (task.stockName && task.stockName.toLowerCase().includes(query)) ||
                    task.taskId.toLowerCase().includes(query)
                );
            }

            return result;
        });

        const taskStats = computed(() => {
            return {
                total: tasks.value.length,
                pending: tasks.value.filter(t => t.status === 'pending').length,
                processing: tasks.value.filter(t => t.status === 'processing').length,
                completed: tasks.value.filter(t => t.status === 'completed').length,
                failed: tasks.value.filter(t => t.status === 'failed').length,
            };
        });

        const dataStats = computed(() => {
            const total = tasks.value.length;
            const filtered = filteredTasks.value.length;
            return {
                total,
                filtered,
                showing: filtered
            };
        });

        const emptyStateMessage = computed(() => {
            if (isLoading.value) {
                return {
                    type: 'loading',
                    icon: '',
                    title: '',
                    description: ''
                };
            }

            if (searchQuery.value && filteredTasks.value.length === 0) {
                return {
                    type: 'empty',
                    icon: 'bi-search',
                    title: '未找到匹配任务',
                    description: `没有找到包含 "${searchQuery.value}" 的任务`,
                    showAction: false
                };
            }

            if (filterStatus.value !== 'all') {
                return {
                    type: 'empty',
                    icon: 'bi-inbox',
                    title: `暂无${getStatusText(filterStatus.value)}任务`,
                    description: '尝试切换其他筛选条件查看任务',
                    showAction: false
                };
            }

            return {
                type: 'empty',
                icon: 'bi-inbox',
                title: '暂无数据',
                description: '系统尚未创建任何分析任务，分析任务将在您添加自选持仓后自动生成',
                showAction: false,
            };
        });

        // Methods
        const loadTasks = async () => {
            if (isLoading.value) return;

            isLoading.value = true;
            loadError.value = null;

            try {
                const response = await analysisApi.getTasks({ limit: 100 });
                tasks.value = (response.tasks || []).map(task => ({
                    taskId: task.taskId,
                    stockCode: task.stockCode,
                    stockName: task.stockName,
                    status: task.status,
                    progress: task.progress || 0,
                    message: task.message,
                    reportType: task.reportType,
                    createdAt: task.createdAt,
                    startedAt: task.startedAt,
                    completedAt: task.completedAt,
                    error: task.error,
                })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            } catch (err) {
                console.error('Failed to load tasks:', err);
                loadError.value = err.message || '网络连接失败，请检查网络后重试';
            } finally {
                isLoading.value = false;
            }
        };

        const connectEventSource = () => {
            const url = analysisApi.getTaskStreamUrl();
            eventSource.value = new EventSource(url);

            eventSource.value.onopen = () => {
            };

            eventSource.value.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleSSEEvent(data);
                } catch (err) {
                }
            };

            eventSource.value.onerror = () => {
                if (eventSource.value) {
                    eventSource.value.close();
                }

                reconnectTimeout = setTimeout(() => {
                    connectEventSource();
                }, 5000);
            };
        };

        const handleSSEEvent = (event) => {
            switch (event.type) {
                case 'connected':
                    break;
                case 'task_created':
                    tasks.value.unshift(event.data);
                    break;
                case 'task_started':
                    updateTask(event.data);
                    break;
                case 'task_progress':
                    updateTask(event.data);
                    break;
                case 'task_completed':
                    updateTask(event.data);
                    break;
                case 'task_failed':
                    updateTask(event.data);
                    break;
                case 'heartbeat':
                    break;
            }
        };

        const updateTask = (taskData) => {
            const index = tasks.value.findIndex(t => t.taskId === taskData.taskId);
            if (index >= 0) {
                tasks.value[index] = { ...tasks.value[index], ...taskData };
            }
        };

        const getStatusClass = (status) => {
            return `task-status-badge task-status-${status}`;
        };

        const getStatusIcon = (status) => {
            const icons = {
                pending: 'bi-hourglass',
                processing: 'bi-arrow-repeat spin',
                completed: 'bi-check-circle',
                failed: 'bi-x-circle',
            };
            return icons[status] || 'bi-question-circle';
        };

        const getStatusText = (status) => {
            const texts = {
                pending: '等待中',
                processing: '执行中',
                completed: '已完成',
                failed: '失败',
            };
            return texts[status] || status;
        };

        const getProgressBarClass = (status) => {
            return `task-progress-fill progress-${status}`;
        };

        const formatTime = (isoString) => {
            if (!isoString) return '-';
            const date = new Date(isoString);
            return date.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        };

        const copyTaskId = async (taskId) => {
            try {
                await navigator.clipboard.writeText(taskId);
            } catch (err) {
            }
        };

        const selectTask = (task) => {
            selectedTask.value = task;
        };

        let lastHoveredRow = null;

        const handleRowMouseEnter = (event, task) => {
            const currentRow = event.currentTarget;
            
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

        // Lifecycle
        onMounted(() => {
            loadTasks();
            connectEventSource();
        });

        onUnmounted(() => {
            if (eventSource.value) {
                eventSource.value.close();
            }
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
        });

        return {
            tasks,
            isLoading,
            loadError,
            filterStatus,
            searchQuery,
            filteredTasks,
            taskStats,
            dataStats,
            emptyStateMessage,
            selectedTask,
            loadTasks,
            getStatusClass,
            getStatusIcon,
            getStatusText,
            getProgressBarClass,
            formatTime,
            copyTaskId,
            selectTask,
            handleRowMouseEnter,
            handleRowMouseLeave,
        };
    },

    template: `
        <div class="tasks-container">
            <div class="tasks-card">
                <div class="tasks-header">
                    <div class="tasks-header-content">
                        <div class="tasks-title-section">
                            <h5 class="tasks-title">任务中心</h5>
                            <small class="tasks-subtitle">实时追踪分析任务执行状态，支持筛选、搜索与详情查看。</small>
                        </div>
                        <div class="tasks-actions">
                            <button
                                class="btn btn-outline-primary btn-sm btn-refresh-header"
                                :class="{ 'is-loading': isLoading }"
                                @click="loadTasks"
                                title="刷新"
                            >
                                <span class="btn-content">
                                    <i class="bi bi-arrow-clockwise"></i>
                                    <span>刷新</span>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="tasks-stats-section">
                    <div class="tasks-stats-row">
                        <div class="task-stat-item">
                            <span class="task-stat-label">总任务</span>
                            <span class="task-stat-value">{{ taskStats.total }}</span>
                        </div>
                        <div class="task-stat-item task-stat-pending">
                            <span class="task-stat-label">等待中</span>
                            <span class="task-stat-value">{{ taskStats.pending }}</span>
                        </div>
                        <div class="task-stat-item task-stat-processing">
                            <span class="task-stat-label">执行中</span>
                            <span class="task-stat-value">{{ taskStats.processing }}</span>
                        </div>
                        <div class="task-stat-item task-stat-completed">
                            <span class="task-stat-label">已完成</span>
                            <span class="task-stat-value">{{ taskStats.completed }}</span>
                        </div>
                        <div class="task-stat-item task-stat-failed">
                            <span class="task-stat-label">失败</span>
                            <span class="task-stat-value">{{ taskStats.failed }}</span>
                        </div>
                    </div>
                </div>

                <div class="tasks-filter-section">
                    <div class="tasks-filters">
                        <div class="filter-item">
                            <label class="filter-label">筛选</label>
                            <div class="task-filter-group">
                                <button
                                    class="task-filter-btn"
                                    :class="{ active: filterStatus === 'all' }"
                                    @click="filterStatus = 'all'"
                                >
                                    全部
                                </button>
                                <button
                                    class="task-filter-btn"
                                    :class="{ active: filterStatus === 'pending' }"
                                    @click="filterStatus = 'pending'"
                                >
                                    等待中
                                </button>
                                <button
                                    class="task-filter-btn"
                                    :class="{ active: filterStatus === 'processing' }"
                                    @click="filterStatus = 'processing'"
                                >
                                    执行中
                                </button>
                                <button
                                    class="task-filter-btn"
                                    :class="{ active: filterStatus === 'completed' }"
                                    @click="filterStatus = 'completed'"
                                >
                                    已完成
                                </button>
                                <button
                                    class="task-filter-btn"
                                    :class="{ active: filterStatus === 'failed' }"
                                    @click="filterStatus = 'failed'"
                                >
                                    失败
                                </button>
                            </div>
                        </div>

                        <div class="filter-item filter-search">
                            <div class="task-search">
                                <i class="bi bi-search task-search-icon"></i>
                                <input
                                    type="text"
                                    class="task-search-input"
                                    v-model="searchQuery"
                                    placeholder="搜索股票代码/名称/任务ID"
                                >
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tasks-table-container">
                    <table class="tasks-table">
                        <thead class="tasks-table-head">
                            <tr>
                                <th>任务ID</th>
                                <th>代码 / 名称</th>
                                <th>状态</th>
                                <th>进度</th>
                                <th>消息</th>
                                <th>创建时间</th>
                            </tr>
                        </thead>
                        <tbody class="tasks-table-body">
                            <tr
                                v-for="task in filteredTasks"
                                :key="task.taskId"
                                class="tasks-table-row"
                                :class="{ 'table-active': selectedTask?.taskId === task.taskId }"
                                @click="selectTask(task)"
                                @mouseenter="handleRowMouseEnter($event, task)"
                                @mouseleave="handleRowMouseLeave($event)"
                            >
                                <td>
                                    <div class="task-id-cell">
                                        <span class="task-id-text">{{ task.taskId.slice(0, 8) }}...</span>
                                        <button
                                            class="btn-copy-id"
                                            @click.stop="copyTaskId(task.taskId)"
                                            title="复制任务ID"
                                        >
                                            <i class="bi bi-clipboard"></i>
                                        </button>
                                    </div>
                                </td>
                                <td>
                                    <div class="task-stock-cell">
                                        <span class="task-stock-code">{{ task.stockCode }}</span>
                                        <span v-if="task.stockName" class="task-stock-name">{{ task.stockName }}</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="task-status-badge" :class="getStatusClass(task.status)">
                                        <i :class="getStatusIcon(task.status)"></i>
                                        {{ getStatusText(task.status) }}
                                    </span>
                                </td>
                                <td>
                                    <div class="task-progress-cell">
                                        <div class="task-progress-bar">
                                            <div
                                                class="task-progress-fill"
                                                :class="getProgressBarClass(task.status)"
                                                :style="{ width: task.progress + '%' }"
                                            ></div>
                                        </div>
                                        <span class="task-progress-text">{{ task.progress }}%</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="task-message-text">{{ task.message || '-' }}</span>
                                </td>
                                <td>
                                    <div class="task-time-cell">
                                        <i class="bi bi-clock"></i>
                                        <span>{{ formatTime(task.createdAt) }}</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div v-if="isLoading && tasks.length === 0" class="tasks-loading-state">
                        <div class="tasks-loading-spinner"></div>
                        <div class="tasks-loading-text">正在加载任务...</div>
                    </div>

                    <div v-else-if="filteredTasks.length === 0" class="tasks-empty-state">
                        <div class="tasks-empty-icon">
                            <i class="bi" :class="emptyStateMessage.icon"></i>
                        </div>
                        <div class="tasks-empty-title">{{ emptyStateMessage.title }}</div>
                        <div class="tasks-empty-desc">{{ emptyStateMessage.description }}</div>
                    </div>
                </div>

                <div class="tasks-footer">
                    <div class="tasks-stats">
                        <span class="stats-text">
                            共 <strong>{{ dataStats.showing }}</strong> 条
                            <span v-if="searchQuery || filterStatus !== 'all'">
                                / 共 <strong>{{ dataStats.total }}</strong> 条
                            </span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `
};
