/**
 * Chat Page Component - 问股页面
 * 完整的 AI 股票问答功能，支持技能选择、流式响应、思考过程、历史会话管理
 */

const { ref, computed, onMounted, onUnmounted, nextTick, watch } = Vue;
import { agentApi } from '../../api/agent.js';
import appStore from '../../stores/appStore.js';

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const STORAGE_KEY_SESSION = 'dsa_chat_session_id';

const QUICK_QUESTIONS = [
    { label: '用缠论分析茅台', skill: 'chan_theory' },
    { label: '波浪理论看宁德时代', skill: 'wave_theory' },
    { label: '分析比亚迪趋势', skill: 'bull_trend' },
    { label: '箱体震荡技能看中芯国际', skill: 'box_oscillation' },
    { label: '分析腾讯 hk00700', skill: 'bull_trend' },
    { label: '用情绪周期分析东方财富', skill: 'emotion_cycle' },
];

export default {
    name: 'ChatPage',

    setup() {
        const messages = ref([]);
        const inputMessage = ref('');
        const isStreaming = ref(false);
        const selectedSkill = ref('');
        const skills = ref([]);
        const chatContainer = ref(null);
        const inputRef = ref(null);
        const sessionId = ref(localStorage.getItem(STORAGE_KEY_SESSION) || generateUUID());
        const sessions = ref([]);
        const sessionsLoading = ref(false);
        const sidebarOpen = ref(false);
        const progressSteps = ref([]);
        const chatError = ref(null);
        const expandedThinking = ref(new Set());
        const showJumpToBottom = ref(false);
        const showSkillDesc = ref(null);
        const deleteConfirmId = ref(null);
        const isFollowUpContextLoading = ref(false);
        const sendToast = ref(null);
        const copiedMessages = ref(new Set());
        const abortController = ref(null);

        const scrollToBottom = async (behavior = 'auto') => {
            await nextTick();
            if (chatContainer.value) {
                chatContainer.value.scrollTo({
                    top: chatContainer.value.scrollHeight,
                    behavior
                });
            }
        };

        const isNearBottom = () => {
            if (!chatContainer.value) return true;
            const { scrollTop, clientHeight, scrollHeight } = chatContainer.value;
            return scrollHeight - scrollTop - clientHeight < 100;
        };

        const handleScroll = () => {
            const nearBottom = isNearBottom();
            if (nearBottom) {
                showJumpToBottom.value = false;
            } else if (messages.value.length > 0) {
                showJumpToBottom.value = true;
            }
        };

        const addMessage = (role, content, extra = {}) => {
            const msg = {
                id: Date.now().toString(),
                role,
                content,
                timestamp: new Date().toLocaleTimeString(),
                ...extra,
            };
            messages.value.push(msg);
            scrollToBottom('smooth');
            return msg;
        };

        const loadSkills = async () => {
            try {
                const data = await agentApi.getSkills();
                skills.value = data.skills || [];
                selectedSkill.value = data.default_skill_id || data.skills?.[0]?.id || '';
            } catch (error) {
                console.error('Failed to load skills:', error);
            }
        };

        const loadSessions = async () => {
            sessionsLoading.value = true;
            try {
                const data = await agentApi.getChatSessions();
                sessions.value = data;
            } catch (error) {
                console.error('Failed to load sessions:', error);
            } finally {
                sessionsLoading.value = false;
            }
        };

        const loadInitialSession = async () => {
            sessionsLoading.value = true;
            try {
                const sessionList = await agentApi.getChatSessions();
                sessions.value = sessionList;
                const savedId = localStorage.getItem(STORAGE_KEY_SESSION);
                if (savedId) {
                    const exists = sessionList.some(s => s.session_id === savedId);
                    if (exists) {
                        const msgs = await agentApi.getChatSessionMessages(savedId);
                        if (msgs.length > 0) {
                            messages.value = msgs.map(m => ({
                                id: m.id,
                                role: m.role,
                                content: m.content,
                            }));
                        }
                    } else {
                        const newId = generateUUID();
                        sessionId.value = newId;
                        localStorage.setItem(STORAGE_KEY_SESSION, newId);
                    }
                } else {
                    localStorage.setItem(STORAGE_KEY_SESSION, sessionId.value);
                }
            } catch (error) {
                console.error('Failed to load initial session:', error);
            } finally {
                sessionsLoading.value = false;
            }
        };

        const startNewChat = () => {
            abortController.value?.abort();
            const newId = generateUUID();
            sessionId.value = newId;
            messages.value = [];
            isStreaming.value = false;
            progressSteps.value = [];
            chatError.value = null;
            abortController.value = null;
            localStorage.setItem(STORAGE_KEY_SESSION, newId);
            sidebarOpen.value = false;
        };

        const switchSession = async (targetSessionId) => {
            if (targetSessionId === sessionId.value && messages.value.length > 0) return;
            abortController.value?.abort();
            
            sessionId.value = targetSessionId;
            messages.value = [];
            localStorage.setItem(STORAGE_KEY_SESSION, targetSessionId);

            try {
                const msgs = await agentApi.getChatSessionMessages(targetSessionId);
                messages.value = msgs.map(m => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                }));
            } catch (error) {
                console.error('Failed to switch session:', error);
            }
            sidebarOpen.value = false;
            scrollToBottom('auto');
        };

        const confirmDelete = async () => {
            if (!deleteConfirmId.value) return;
            try {
                await agentApi.deleteChatSession(deleteConfirmId.value);
                await loadSessions();
                if (deleteConfirmId.value === sessionId.value) {
                    startNewChat();
                }
            } catch (error) {
                console.error('Failed to delete session:', error);
            }
            deleteConfirmId.value = null;
        };

        const getCurrentStage = (steps) => {
            if (steps.length === 0) return '正在连接...';
            const last = steps[steps.length - 1];
            if (last.type === 'thinking') return last.message || 'AI 正在思考...';
            if (last.type === 'tool_start') return `${last.display_name || last.tool}...`;
            if (last.type === 'tool_done') return `${last.display_name || last.tool} 完成`;
            if (last.type === 'generating') return last.message || '正在生成最终分析...';
            return '处理中...';
        };

        const processStreamLine = (line) => {
            if (!line.startsWith('data: ')) return null;
            try {
                const event = JSON.parse(line.slice(6));
                return event;
            } catch {
                return null;
            }
        };

        const handleSend = async (overrideMessage, overrideSkill) => {
            const msgText = overrideMessage || inputMessage.value.trim();
            if (!msgText || isStreaming.value) return;

            const usedSkill = overrideSkill || selectedSkill.value;
            const usedSkillName = skills.value.find(s => s.id === usedSkill)?.name || (usedSkill ? usedSkill : '通用');

            abortController.value?.abort();
            abortController.value = new AbortController();

            const payload = {
                message: msgText,
                session_id: sessionId.value,
                skills: usedSkill ? [usedSkill] : undefined,
            };

            inputMessage.value = '';
            isStreaming.value = true;
            progressSteps.value = [];
            chatError.value = null;

            const userMessage = {
                id: Date.now().toString(),
                role: 'user',
                content: msgText,
                skill: usedSkill,
                skillName: usedSkillName,
            };

            const skillForDisplay = usedSkill;
            const skillNameForDisplay = usedSkillName;

            messages.value = [...messages.value, userMessage];
            
            const existingSessions = [...sessions.value];
            const sessionExists = existingSessions.some(s => s.session_id === sessionId.value);
            if (!sessionExists) {
                sessions.value = [
                    {
                        session_id: sessionId.value,
                        title: msgText.slice(0, 60),
                        message_count: 1,
                        created_at: new Date().toISOString(),
                        last_active: new Date().toISOString(),
                    },
                    ...sessions.value
                ];
            }

            scrollToBottom('smooth');

            try {
                const response = await agentApi.chatStream(payload, { signal: abortController.value.signal });
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buf = '';
                let finalContent = null;
                const currentProgressSteps = [];

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buf += decoder.decode(value, { stream: true });
                    const lines = buf.split('\n');
                    buf = lines.pop() || '';

                    for (const line of lines) {
                        const event = processStreamLine(line);
                        if (!event) continue;

                        if (event.type === 'done') {
                            if (event.success === false) {
                                throw new Error(event.error || event.content || '分析失败');
                            }
                            finalContent = event.content || '';
                            continue;
                        }

                        if (event.type === 'error') {
                            throw new Error(event.message || '分析出错');
                        }

                        currentProgressSteps.push(event);
                        progressSteps.value = [...progressSteps.value, event];
                    }
                }

                if (buf.trim().startsWith('data: ')) {
                    const event = processStreamLine(buf.trim());
                    if (event) {
                        if (event.type === 'done') {
                            finalContent = event.content || '';
                        } else if (event.type !== 'error') {
                            currentProgressSteps.push(event);
                            progressSteps.value = [...progressSteps.value, event];
                        }
                    }
                }

                messages.value = [
                    ...messages.value,
                    {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: finalContent || '（无内容）',
                        skill: skillForDisplay,
                        skillName: skillNameForDisplay,
                        thinkingSteps: [...currentProgressSteps],
                    }
                ];

                await loadSessions();
            } catch (error) {
                if (error.name === 'AbortError') {
                    return;
                }
                chatError.value = {
                    message: error.message || '分析失败，请稍后重试'
                };
            } finally {
                isStreaming.value = false;
                progressSteps.value = [];
                abortController.value = null;
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        };

        const handleQuickQuestion = (q) => {
            selectedSkill.value = q.skill;
            handleSend(q.label, q.skill);
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

        const exportSessionAsMarkdown = () => {
            const content = messages.value
                .map(m => {
                    const heading = m.role === 'user' ? '# 用户消息' : `# AI 回复${m.skillName ? ` · ${m.skillName}` : ''}`;
                    return `${heading}\n\n${m.content}`;
                })
                .join('\n\n');
            
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `问股会话-${new Date().toISOString().slice(0, 10)}.md`;
            a.click();
            URL.revokeObjectURL(url);
        };

        const sendToNotification = async () => {
            if (isStreaming.value) return;
            try {
                const content = messages.value
                    .map(m => {
                        const heading = m.role === 'user' ? '# 用户消息' : `# AI 回复`;
                        return `${heading}\n\n${m.content}`;
                    })
                    .join('\n\n');
                
                await agentApi.sendChat(content);
                appStore.addToast({
                    type: 'success',
                    message: '已发送到通知渠道'
                });
            } catch (error) {
                appStore.addToast({
                    type: 'error',
                    message: error.message || '发送失败'
                });
            }
        };

        const copyMessageToClipboard = async (msgId, content) => {
            try {
                await navigator.clipboard.writeText(content);
                copiedMessages.value.add(msgId);
                setTimeout(() => {
                    copiedMessages.value.delete(msgId);
                }, 2000);
            } catch (err) {
                console.error('Copy failed:', err);
            }
        };

        const downloadMessageAsMarkdown = (msg) => {
            const heading = msg.role === 'user' ? '# 用户消息' : `# AI 回复${msg.skillName ? ` · ${msg.skillName}` : ''}`;
            const content = [heading, '', msg.content].join('\n');
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${msg.role === 'user' ? 'user' : 'assistant'}-message-${msg.id}.md`;
            a.click();
            URL.revokeObjectURL(url);
        };

        const toggleThinking = (msgId) => {
            if (expandedThinking.value.has(msgId)) {
                expandedThinking.value.delete(msgId);
            } else {
                expandedThinking.value.add(msgId);
            }
            expandedThinking.value = new Set(expandedThinking.value);
        };

        const renderThinkingBlock = (msg) => {
            if (!msg.thinkingSteps || msg.thinkingSteps.length === 0) return null;
            const isExpanded = expandedThinking.value.has(msg.id);
            const toolSteps = msg.thinkingSteps.filter(s => s.type === 'tool_done');
            const totalDuration = toolSteps.reduce((sum, s) => sum + (s.duration || 0), 0);
            const summary = `${toolSteps.length} 个工具调用 · ${totalDuration.toFixed(1)}s`;

            return {
                isExpanded,
                summary,
                toggle: () => toggleThinking(msg.id)
            };
        };

        const renderThinkingDetails = (steps) => {
            return steps.map((step, idx) => {
                let statusClass = 'chat-progress-item-muted';
                let iconClass = 'chat-progress-dot-muted';
                let text = '';
                
                if (step.type === 'thinking') {
                    text = step.message || `第 ${step.step} 步：思考`;
                    statusClass = 'chat-progress-item-thinking';
                    iconClass = 'chat-progress-dot-thinking';
                } else if (step.type === 'tool_start') {
                    text = `${step.display_name || step.tool}...`;
                    statusClass = 'chat-progress-item-tool';
                    iconClass = 'chat-progress-dot-tool';
                } else if (step.type === 'tool_done') {
                    text = `${step.display_name || step.tool} (${step.duration}s)`;
                    statusClass = step.success ? 'chat-progress-item-success' : 'chat-progress-item-danger';
                    iconClass = step.success ? 'chat-progress-dot-success' : 'chat-progress-dot-danger';
                } else if (step.type === 'generating') {
                    text = step.message || '生成分析';
                    statusClass = 'chat-progress-item-generating';
                    iconClass = 'chat-progress-dot-generating';
                }
                
                return { idx, statusClass, iconClass, text };
            });
        };

        const availableSkillIds = computed(() => new Set(skills.value.map(s => s.id)));
        const quickQuestions = computed(() => {
            return QUICK_QUESTIONS.filter(q => 
                availableSkillIds.value.size === 0 || availableSkillIds.value.has(q.skill)
            );
        });

        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        };

        onMounted(async () => {
            document.title = '问股 - DSA';
            await loadSkills();
            await loadInitialSession();
            await loadSessions();
        });

        onUnmounted(() => {
            abortController.value?.abort();
        });

        return {
            messages,
            inputMessage,
            isStreaming,
            selectedSkill,
            skills,
            chatContainer,
            inputRef,
            sessionId,
            sessions,
            sessionsLoading,
            sidebarOpen,
            progressSteps,
            chatError,
            expandedThinking,
            showJumpToBottom,
            showSkillDesc,
            deleteConfirmId,
            isFollowUpContextLoading,
            sendToast,
            copiedMessages,
            quickQuestions,
            handleSend,
            handleKeyDown,
            handleQuickQuestion,
            clearChat,
            exportChat,
            exportSessionAsMarkdown,
            sendToNotification,
            copyMessageToClipboard,
            downloadMessageAsMarkdown,
            renderThinkingBlock,
            renderThinkingDetails,
            getCurrentStage,
            startNewChat,
            switchSession,
            confirmDelete,
            scrollToBottom,
            formatDate,
        };
    },

    template: `
        <div class="chat-page">
            <!-- Mobile Sidebar Overlay -->
            <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false">
                <div class="sidebar-drawer" @click.stop>
                    <div class="sidebar-header">
                        <h2>
                            <i class="bi bi-clock-history"></i>
                            历史对话
                        </h2>
                        <button class="btn-new-chat" @click="startNewChat" title="开启新对话">
                            <i class="bi bi-plus-lg"></i>
                        </button>
                    </div>
                    <div class="sidebar-content">
                        <div v-if="sessionsLoading" class="sidebar-loading">
                            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                            <span>加载中...</span>
                        </div>
                        <div v-else-if="sessions.length === 0" class="sidebar-empty">
                            <p>暂无历史对话</p>
                        </div>
                        <div v-else class="session-list">
                            <div 
                                v-for="s in sessions" 
                                :key="s.session_id"
                                class="session-item"
                                :class="{ active: s.session_id === sessionId }"
                            >
                                <button 
                                    class="session-item-btn"
                                    @click="switchSession(s.session_id)"
                                >
                                    <div class="session-indicator"></div>
                                    <div class="session-content">
                                        <span class="session-title">{{ s.title }}</span>
                                        <div class="session-meta">
                                            <span>{{ s.message_count }} 条对话</span>
                                            <span v-if="s.last_active"> · {{ formatDate(s.last_active) }}</span>
                                        </div>
                                    </div>
                                </button>
                                <button 
                                    class="session-delete-btn"
                                    @click.stop="deleteConfirmId = s.session_id"
                                >
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Delete Confirmation Modal -->
            <div v-if="deleteConfirmId" class="modal-overlay" @click="deleteConfirmId = null">
                <div class="confirm-dialog" @click.stop>
                    <h4>删除对话</h4>
                    <p>删除后，该对话将不可恢复，确认删除吗？</p>
                    <div class="confirm-dialog-actions">
                        <button class="btn btn-secondary btn-sm" @click="deleteConfirmId = null">取消</button>
                        <button class="btn btn-danger btn-sm" @click="confirmDelete">删除</button>
                    </div>
                </div>
            </div>

            <!-- Chat Header -->
            <div class="chat-header">
                <div class="chat-header-left">
                    <button class="btn-menu d-lg-none" @click="sidebarOpen = true">
                        <i class="bi bi-list"></i>
                    </button>
                    <h5 class="mb-0">
                        <i class="bi bi-chat-dots me-2"></i>
                        问股
                    </h5>
                </div>
                <div class="chat-header-right">
                    <button 
                        v-if="messages.length > 0"
                        class="btn btn-outline-secondary btn-sm" 
                        @click="exportSessionAsMarkdown"
                        title="导出会话为 Markdown 文件"
                    >
                        <i class="bi bi-download"></i>
                        导出
                    </button>
                    <button 
                        v-if="messages.length > 0"
                        class="btn btn-outline-secondary btn-sm" 
                        @click="sendToNotification"
                        :disabled="isStreaming"
                        title="发送到已配置的通知渠道"
                    >
                        <i class="bi bi-send"></i>
                        发送
                    </button>
                </div>
            </div>

            <!-- Chat Description -->
            <p class="chat-description">
                向 AI 询问个股分析，获取基于技能视角的交易建议与实时决策报告。
            </p>

            <!-- Error Alert -->
            <div v-if="chatError" class="alert alert-danger chat-error-alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                {{ chatError.message }}
            </div>

            <!-- Chat Messages -->
            <div 
                class="chat-messages" 
                ref="chatContainer"
                @scroll="handleScroll"
            >
                <!-- Empty State -->
                <div v-if="messages.length === 0 && !isStreaming" class="chat-empty">
                    <div class="chat-empty-icon">
                        <i class="bi bi-lightbulb"></i>
                    </div>
                    <h4>开始问股</h4>
                    <p>输入「分析 600519」或「茅台现在能买吗」，AI 将调用实时数据工具为您生成决策报告。</p>
                    <div class="quick-questions">
                        <button 
                            v-for="(q, i) in quickQuestions" 
                            :key="i"
                            class="quick-question-btn"
                            @click="handleQuickQuestion(q)"
                        >
                            {{ q.label }}
                        </button>
                    </div>
                </div>

                <!-- Messages -->
                <div v-for="msg in messages" :key="msg.id" class="chat-message" :class="msg.role">
                    <div class="chat-message-avatar">
                        {{ msg.role === 'user' ? 'U' : 'AI' }}
                    </div>
                    <div class="chat-message-content">
                        <!-- Skill Badge -->
                        <div v-if="msg.role === 'assistant' && msg.skillName" class="chat-skill-badge">
                            <i class="bi bi-lightning-charge-fill"></i>
                            {{ msg.skillName }}
                        </div>

                        <!-- Thinking Block -->
                        <div v-if="msg.role === 'assistant' && msg.thinkingSteps && msg.thinkingSteps.length > 0" class="thinking-block">
                            <button 
                                class="thinking-toggle"
                                @click="renderThinkingBlock(msg).toggle()"
                            >
                                <i :class="['bi', renderThinkingBlock(msg).isExpanded ? 'bi-chevron-down' : 'bi-chevron-right']"></i>
                                <span>思考过程</span>
                                <span class="thinking-summary">· {{ renderThinkingBlock(msg).summary }}</span>
                            </button>
                            <div v-if="renderThinkingBlock(msg).isExpanded" class="thinking-details">
                                <div 
                                    v-for="step in renderThinkingDetails(msg.thinkingSteps)" 
                                    :key="step.idx"
                                    class="chat-progress-item"
                                    :class="step.statusClass"
                                >
                                    <span class="chat-progress-dot" :class="step.iconClass"></span>
                                    <span>{{ step.text }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Message Actions (Assistant only) -->
                        <div v-if="msg.role === 'assistant'" class="chat-message-actions">
                            <button 
                                class="chat-action-btn"
                                @click="copyMessageToClipboard(msg.id, msg.content)"
                            >
                                {{ copiedMessages.has(msg.id) ? '已复制' : '复制' }}
                            </button>
                            <button 
                                class="chat-action-btn"
                                @click="downloadMessageAsMarkdown(msg)"
                            >
                                导出
                            </button>
                        </div>

                        <!-- Message Content -->
                        <div class="chat-message-text" :class="{ 'chat-prose': msg.role === 'assistant' }">
                            <template v-if="msg.role === 'assistant'">
                                <div v-html="msg.content.replace(/\\n/g, '<br>')"></div>
                            </template>
                            <template v-else>
                                <p v-for="(line, i) in msg.content.split('\\n')" :key="i">
                                    {{ line || ' ' }}
                                </p>
                            </template>
                        </div>
                    </div>
                </div>

                <!-- Streaming Indicator -->
                <div v-if="isStreaming" class="chat-message assistant">
                    <div class="chat-message-avatar">AI</div>
                    <div class="chat-message-content">
                        <div class="chat-typing">
                            <div class="typing-spinner"></div>
                            <span>{{ getCurrentStage(progressSteps) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Jump to Bottom Button -->
                <button 
                    v-if="showJumpToBottom" 
                    class="jump-to-bottom"
                    @click="scrollToBottom('smooth')"
                >
                    <i class="bi bi-arrow-down"></i>
                    有新消息
                </button>
            </div>

            <!-- Chat Input Area -->
            <div class="chat-input-area">
                <!-- Skills Selection -->
                <div v-if="skills.length > 0" class="skill-selection">
                    <span class="skill-label">策略</span>
                    <label class="skill-option">
                        <input 
                            type="radio" 
                            name="skill" 
                            value="" 
                            v-model="selectedSkill"
                        />
                        <span :class="{ active: selectedSkill === '' }">通用分析</span>
                    </label>
                    <label 
                        v-for="s in skills" 
                        :key="s.id" 
                        class="skill-option"
                        @mouseenter="showSkillDesc = s.id"
                        @mouseleave="showSkillDesc = null"
                    >
                        <input 
                            type="radio" 
                            name="skill" 
                            :value="s.id" 
                            v-model="selectedSkill"
                        />
                        <span :class="{ active: selectedSkill === s.id }">{{ s.name }}</span>
                        <div v-if="showSkillDesc === s.id && s.description" class="skill-desc-tooltip">
                            <p class="skill-title">{{ s.name }}</p>
                            <p>{{ s.description }}</p>
                        </div>
                    </label>
                </div>

                <!-- Input -->
                <div class="chat-input-wrapper">
                    <textarea
                        ref="inputRef"
                        v-model="inputMessage"
                        class="chat-input"
                        placeholder="例如：分析 600519 / 茅台现在适合买入吗？ (Enter 发送, Shift+Enter 换行)"
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
