/**
 * Agent API Module
 * Handles chat, skills, sessions, and streaming for the AI agent
 */

const API_BASE_URL = (() => {
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        if (port === '8000' || port === '') {
            return '';
        }
    }
    return '';
})();

const axios = window.axios;

const agentEndpoints = {
    chat: '/api/v1/agent/chat',
    chatStream: '/api/v1/agent/chat/stream',
    skills: '/api/v1/agent/skills',
    sessions: '/api/v1/agent/chat/sessions',
    session: (sessionId) => `/api/v1/agent/chat/sessions/${sessionId}`,
    sendChat: '/api/v1/agent/chat/send'
};

const agentApi = {
    async chat(payload) {
        const response = await axios.post(agentEndpoints.chat, payload, {
            timeout: 120000,
        });
        return response.data;
    },

    async getSkills() {
        const response = await axios.get(agentEndpoints.skills);
        return response.data;
    },

    async getChatSessions(limit = 50) {
        const response = await axios.get(agentEndpoints.sessions, { params: { limit } });
        return response.data.sessions || [];
    },

    async getChatSessionMessages(sessionId) {
        const response = await axios.get(agentEndpoints.session(sessionId));
        return response.data.messages || [];
    },

    async deleteChatSession(sessionId) {
        await axios.delete(agentEndpoints.session(sessionId));
    },

    async sendChat(content) {
        const response = await axios.post(agentEndpoints.sendChat, { content });
        const data = response.data;
        if (data.success === false) {
            throw new Error(data.message || '发送失败');
        }
        return { success: true };
    },

    async chatStream(payload, options = {}) {
        const base = API_BASE_URL || '';
        const url = `${base}${agentEndpoints.chatStream}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include',
            signal: options?.signal,
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type') || '';
            let errorMessage = `请求失败 (${response.status})`;
            if (contentType.includes('application/json')) {
                const errorData = await response.json().catch(() => ({}));
                errorMessage = errorData?.message || errorData?.error || errorMessage;
            }
            throw new Error(errorMessage);
        }

        return response;
    }
};

export { agentApi, agentEndpoints };
