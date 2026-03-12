/**
 * Tag Style System - 通用标签样式工具
 * 
 * Design Principles:
 * 1. Two-layer system: Conclusion (filled) vs Indicator (outlined)
 * 2. Maximum 4 semantic colors to avoid visual chaos
 * 3. Unified indicator style with color-coded semantics
 */

// Tag type definitions
export const TAG_TYPES = {
    // Layer 1: Conclusion tags (filled style)
    CONCLUSION: {
        BUY: 'conclusion-buy',
        SELL: 'conclusion-sell',
        HOLD: 'conclusion-hold',
    },
    // Layer 2: Indicator tags (outlined style)
    INDICATOR: {
        POSITIVE: 'indicator-positive',   // Green - bullish signals
        NEGATIVE: 'indicator-negative',   // Red - bearish signals
        WARNING: 'indicator-warning',     // Orange - attention needed
        NEUTRAL: 'indicator-neutral',     // Gray - informational
    },
};

// Tag classification mapping
const TAG_CLASSIFICATION = {
    // Conclusion mappings
    '买入': TAG_TYPES.CONCLUSION.BUY,
    '卖出': TAG_TYPES.CONCLUSION.SELL,
    '观望': TAG_TYPES.CONCLUSION.HOLD,
    // Indicator mappings - Positive
    '多头排列': TAG_TYPES.INDICATOR.POSITIVE,
    '趋势向上': TAG_TYPES.INDICATOR.POSITIVE,
    '放量突破': TAG_TYPES.INDICATOR.POSITIVE,
    '金叉': TAG_TYPES.INDICATOR.POSITIVE,
    '底背离': TAG_TYPES.INDICATOR.POSITIVE,
    // Indicator mappings - Negative
    '放量下跌': TAG_TYPES.INDICATOR.NEGATIVE,
    '趋势向下': TAG_TYPES.INDICATOR.NEGATIVE,
    '死叉': TAG_TYPES.INDICATOR.NEGATIVE,
    '顶背离': TAG_TYPES.INDICATOR.NEGATIVE,
    // Indicator mappings - Warning
    '乖离>5%': TAG_TYPES.INDICATOR.WARNING,
    '乖离过大': TAG_TYPES.INDICATOR.WARNING,
    '超买': TAG_TYPES.INDICATOR.WARNING,
    '超卖': TAG_TYPES.INDICATOR.WARNING,
    // Indicator mappings - Neutral
    '跌破MA20': TAG_TYPES.INDICATOR.NEUTRAL,
    '突破MA20': TAG_TYPES.INDICATOR.NEUTRAL,
    '缩量': TAG_TYPES.INDICATOR.NEUTRAL,
    '横盘': TAG_TYPES.INDICATOR.NEUTRAL,
};

/**
 * Get CSS class for a tag based on its label
 * @param {string} label - Tag label text
 * @returns {string} CSS class name
 */
export function getTagClass(label) {
    return TAG_CLASSIFICATION[label] || TAG_TYPES.INDICATOR.NEUTRAL;
}

/**
 * Get CSS class for conclusion tag
 * @param {string} conclusion - Conclusion text (买入/卖出/观望)
 * @returns {string} CSS class name
 */
export function getConclusionClass(conclusion) {
    const mapping = {
        '买入': TAG_TYPES.CONCLUSION.BUY,
        '卖出': TAG_TYPES.CONCLUSION.SELL,
        '观望': TAG_TYPES.CONCLUSION.HOLD,
    };
    return mapping[conclusion] || TAG_TYPES.INDICATOR.NEUTRAL;
}

/**
 * Get all available tag labels for a specific type
 * @param {string} type - Tag type from TAG_TYPES
 * @returns {string[]} Array of tag labels
 */
export function getTagsByType(type) {
    return Object.entries(TAG_CLASSIFICATION)
        .filter(([, tagType]) => tagType === type)
        .map(([label]) => label);
}
