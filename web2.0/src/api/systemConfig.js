/**
 * System Configuration API
 * 系统配置 API 模块
 */

const axios = window.axios;

// 自定义错误类
export class SystemConfigValidationError extends Error {
    constructor(message, issues = [], parsedError = null) {
        super(message);
        this.name = 'SystemConfigValidationError';
        this.issues = issues;
        this.parsedError = parsedError || {
            title: '配置校验失败',
            message,
            status: 400,
        };
    }
}

export class SystemConfigConflictError extends Error {
    constructor(message, currentConfigVersion = null, parsedError = null) {
        super(message);
        this.name = 'SystemConfigConflictError';
        this.currentConfigVersion = currentConfigVersion;
        this.parsedError = parsedError || {
            title: '配置版本冲突',
            message,
            status: 409,
        };
    }
}

// 辅助函数：转换为驼峰命名
function toCamelCase(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => toCamelCase(item));
    }
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = toCamelCase(value);
    }
    return result;
}

// 辅助函数：转换为蛇形命名
function toSnakeCase(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => toSnakeCase(item));
    }
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = toSnakeCase(value);
    }
    return result;
}

// 解析 API 错误
function parseApiError(error) {
    if (!error.response) {
        return {
            title: '网络错误',
            message: error.message || '无法连接到服务器',
            status: 0,
        };
    }
    const { status, data } = error.response;
    const message = data?.message || data?.error || error.message || '请求失败';
    return {
        title: `请求失败 (${status})`,
        message,
        status,
        data,
    };
}

export const systemConfigApi = {
    /**
     * 获取系统配置
     * @param {boolean} includeSchema - 是否包含字段 schema
     * @returns {Promise<Object>} 配置响应
     */
    async getConfig(includeSchema = true) {
        const response = await axios.get('/api/v1/system/config', {
            params: { include_schema: includeSchema },
        });
        return toCamelCase(response.data);
    },

    /**
     * 导出桌面端 .env 配置
     * @returns {Promise<Object>} 导出响应
     */
    async exportDesktopEnv() {
        const response = await axios.get('/api/v1/system/config/export');
        return toCamelCase(response.data);
    },

    /**
     * 导入桌面端 .env 配置
     * @param {Object} payload - 导入参数
     * @param {string} payload.configVersion - 配置版本
     * @param {string} payload.content - .env 文件内容
     * @param {boolean} payload.reloadNow - 是否立即重载
     * @returns {Promise<Object>} 导入响应
     */
    async importDesktopEnv(payload) {
        const response = await axios.post('/api/v1/system/config/import', toSnakeCase(payload));
        return toCamelCase(response.data);
    },

    /**
     * 校验配置项
     * @param {Object} payload - 校验参数
     * @param {Array} payload.items - 配置项列表
     * @returns {Promise<Object>} 校验响应
     */
    async validate(payload) {
        const response = await axios.post('/api/v1/system/config/validate', toSnakeCase(payload));
        return toCamelCase(response.data);
    },

    /**
     * 更新系统配置
     * @param {Object} payload - 更新参数
     * @param {string} payload.configVersion - 配置版本
     * @param {string} payload.maskToken - 掩码令牌
     * @param {boolean} payload.reloadNow - 是否立即重载
     * @param {Array} payload.items - 配置项列表
     * @returns {Promise<Object>} 更新响应
     */
    async update(payload) {
        try {
            const response = await axios.put('/api/v1/system/config', toSnakeCase(payload));
            return toCamelCase(response.data);
        } catch (error) {
            const parsed = parseApiError(error);
            const status = error.response?.status;
            const data = error.response?.data || {};

            if (status === 400) {
                const validationError = toCamelCase(data);
                throw new SystemConfigValidationError(
                    parsed.message || validationError.message || '配置校验失败',
                    validationError.issues || [],
                    parsed
                );
            }

            if (status === 409) {
                const conflict = toCamelCase(data);
                throw new SystemConfigConflictError(
                    parsed.message || conflict.message || '配置版本冲突',
                    conflict.currentConfigVersion,
                    parsed
                );
            }

            throw error;
        }
    },

    /**
     * 测试 LLM 渠道连接
     * @param {Object} payload - 测试参数
     * @returns {Promise<Object>} 测试响应
     */
    async testLLMChannel(payload) {
        const response = await axios.post('/api/v1/system/config/llm/test-channel', toSnakeCase(payload));
        return toCamelCase(response.data);
    },
};

export default systemConfigApi;
