/**
 * Chat Page Component - Agent 策略对话页面
 */

const { ref, computed, onMounted, onUnmounted, nextTick } = Vue;
import appStore from '../../stores/appStore.js';

export default {
    name: 'ChatPage',

    setup() {
        const messages = ref([]);
        const inputMessage = ref('');
        const isStreaming = ref(false);
        const selectedStrategy = ref('bull_trend');
        const chatContainer = ref(null);
        const inputRef = ref(null);

        const strategies = [
            { value: 'bull_trend', label: '多头趋势', icon: 'bi-graph-up-arrow' },
            { value: 'ma_golden_cross', label: '均线金叉', icon: 'bi-arrow-up-circle' },
            { value: 'volume_breakout', label: '放量突破', icon: 'bi-bar-chart-line' },
            { value: 'shrink_pullback', label: '缩量回踩', icon: 'bi-arrow-down-up' },
            { value: 'bottom_volume', label: '底部放量', icon: 'bi-layers' },
            { value: 'dragon_head', label: '龙头策略', icon: 'bi-star' },
            { value: 'chan_theory', label: '缠论', icon: 'bi-diagram-3' },
            { value: 'wave_theory', label: '波浪理论', icon: 'bi-tsunami' },
        ];

        const scrollToBottom = async () => {
            await nextTick();
            if (chatContainer.value) {
                chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
            }
        };

        const addMessage = (role, content) => {
            messages.value.push({
                id: Date.now(),
                role,
                content,
                timestamp: new Date().toLocaleTimeString(),
            });
            scrollToBottom();
        };

        const handleSend = async () => {
            if (!inputMessage.value.trim() || isStreaming.value) return;

            const userMessage = inputMessage.value.trim();
            inputMessage.value = '';
            addMessage('user', userMessage);
            isStreaming.value = true;

            try {
                const response = await axios.post('/api/v1/agent/chat', {
                    message: userMessage,
                    strategy: selectedStrategy.value,
                    stream: true,
                }, {
                    responseType: 'text',
                });

                addMessage('assistant', response.data.response || '分析完成');
            } catch (error) {
                addMessage('assistant', `分析失败: ${error.message}`);
            } finally {
                isStreaming.value = false;
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        };

        const clearChat = () => {
            messages.value = [];
        };

        const exportChat = () => {
            const content = messages.value
                .map(m => `[${m.timestamp}] ${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
                .join('\n\n');
            
            const blob = new Blob([content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chat-${new Date().toISOString().slice(0, 10)}.md`;
            a.click();
            URL.revokeObjectURL(url);
        };

        return {
            messages,
            inputMessage,
            isStreaming,
            selectedStrategy,
            strategies,
            chatContainer,
            inputRef,
            handleSend,
            handleKeyDown,
            clearChat,
            exportChat,
        };
    },

    template: `
        <div class="chat-page">
            <div class="chat-header">
                <div class="chat-header-left">
                    <h5 class="mb-0">
                        <i class="bi bi-chat-dots me-2"></i>
                        Agent 策略对话
                    </h5>
                </div>
                <div class="chat-header-right">
                    <select v-model="selectedStrategy" class="form-select form-select-sm strategy-select">
                        <option v-for="s in strategies" :key="s.value" :value="s.value">
                            {{ s.label }}
                        </option>
                    </select>
                    <button class="btn btn-outline-secondary btn-sm" @click="clearChat">
                        <i class="bi bi-trash"></i>
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" @click="exportChat">
                        <i class="bi bi-download"></i>
                    </button>
                </div>
            </div>

            <div class="chat-messages" ref="chatContainer">
                <div v-if="messages.length === 0" class="chat-empty">
                    <i class="bi bi-robot chat-empty-icon"></i>
                    <p>选择策略后，输入股票代码或问题开始对话</p>
                    <div class="chat-strategy-cards">
                        <div v-for="s in strategies" :key="s.value" 
                             class="chat-strategy-card"
                             :class="{ active: selectedStrategy === s.value }"
                             @click="selectedStrategy = s.value">
                            <i :class="['bi', s.icon]"></i>
                            <span>{{ s.label }}</span>
                        </div>
                    </div>
                </div>

                <div v-for="msg in messages" :key="msg.id" 
                     class="chat-message"
                     :class="msg.role">
                    <div class="chat-message-avatar">
                        <i :class="msg.role === 'user' ? 'bi bi-person' : 'bi bi-robot'"></i>
                    </div>
                    <div class="chat-message-content">
                        <div class="chat-message-header">
                            <span class="chat-message-role">
                                {{ msg.role === 'user' ? '用户' : 'AI' }}
                            </span>
                            <span class="chat-message-time">{{ msg.timestamp }}</span>
                        </div>
                        <div class="chat-message-text" v-html="msg.content"></div>
                    </div>
                </div>

                <div v-if="isStreaming" class="chat-message assistant">
                    <div class="chat-message-avatar">
                        <i class="bi bi-robot"></i>
                    </div>
                    <div class="chat-message-content">
                        <div class="chat-typing">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="chat-input-area">
                <div class="chat-input-wrapper">
                    <textarea
                        ref="inputRef"
                        v-model="inputMessage"
                        class="chat-input"
                        placeholder="输入股票代码或问题，如：用缠论分析 600519"
                        @keydown="handleKeyDown"
                        :disabled="isStreaming"
                        rows="1"
                    ></textarea>
                    <button
                        class="btn btn-dark chat-send-btn"
                        @click="handleSend"
                        :disabled="!inputMessage.trim() || isStreaming"
                    >
                        <i class="bi" :class="isStreaming ? 'bi-hourglass-split' : 'bi-send'"></i>
                    </button>
                </div>
            </div>
        </div>
    `
};
