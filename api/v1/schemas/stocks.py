# -*- coding: utf-8 -*-
"""
===================================
股票数据相关模型
===================================

职责：
1. 定义股票实时行情模型
2. 定义历史 K 线数据模型
"""

from typing import Optional, List

from pydantic import BaseModel, Field


class StockQuote(BaseModel):
    """股票实时行情"""
    
    stock_code: str = Field(..., description="股票代码")
    stock_name: Optional[str] = Field(None, description="股票名称")
    current_price: float = Field(..., description="当前价格")
    change: Optional[float] = Field(None, description="涨跌额")
    change_percent: Optional[float] = Field(None, description="涨跌幅 (%)")
    open: Optional[float] = Field(None, description="开盘价")
    high: Optional[float] = Field(None, description="最高价")
    low: Optional[float] = Field(None, description="最低价")
    prev_close: Optional[float] = Field(None, description="昨收价")
    volume: Optional[float] = Field(None, description="成交量（股）")
    amount: Optional[float] = Field(None, description="成交额（元）")
    update_time: Optional[str] = Field(None, description="更新时间")
    
    class Config:
        json_schema_extra = {
            "example": {
                "stock_code": "600519",
                "stock_name": "贵州茅台",
                "current_price": 1800.00,
                "change": 15.00,
                "change_percent": 0.84,
                "open": 1785.00,
                "high": 1810.00,
                "low": 1780.00,
                "prev_close": 1785.00,
                "volume": 10000000,
                "amount": 18000000000,
                "update_time": "2024-01-01T15:00:00"
            }
        }


class KLineData(BaseModel):
    """K 线数据点"""
    
    date: str = Field(..., description="日期")
    open: float = Field(..., description="开盘价")
    high: float = Field(..., description="最高价")
    low: float = Field(..., description="最低价")
    close: float = Field(..., description="收盘价")
    volume: Optional[float] = Field(None, description="成交量")
    amount: Optional[float] = Field(None, description="成交额")
    change_percent: Optional[float] = Field(None, description="涨跌幅 (%)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "date": "2024-01-01",
                "open": 1785.00,
                "high": 1810.00,
                "low": 1780.00,
                "close": 1800.00,
                "volume": 10000000,
                "amount": 18000000000,
                "change_percent": 0.84
            }
        }


class ExtractItem(BaseModel):
    """单条提取结果（代码、名称、置信度）"""

    code: Optional[str] = Field(None, description="股票代码，None 表示解析失败")
    name: Optional[str] = Field(None, description="股票名称（如有）")
    confidence: str = Field("medium", description="置信度：high/medium/low")


class ExtractFromImageResponse(BaseModel):
    """图片股票代码提取响应"""

    codes: List[str] = Field(..., description="提取的股票代码（已去重，向后兼容）")
    items: List[ExtractItem] = Field(default_factory=list, description="提取结果明细（代码+名称+置信度）")
    raw_text: Optional[str] = Field(None, description="原始 LLM 响应（调试用）")


class StockHistoryResponse(BaseModel):
    """股票历史行情响应"""
    
    stock_code: str = Field(..., description="股票代码")
    stock_name: Optional[str] = Field(None, description="股票名称")
    period: str = Field(..., description="K 线周期")
    data: List[KLineData] = Field(default_factory=list, description="K 线数据列表")
    
    class Config:
        json_schema_extra = {
            "example": {
                "stock_code": "600519",
                "stock_name": "贵州茅台",
                "period": "daily",
                "data": []
            }
        }


class AddStockRequest(BaseModel):
    """添加股票请求"""
    
    code: str = Field(..., description="股票代码")
    status: str = Field("watchlist", description="状态: watchlist(自选) / holding(持仓)")
    stock_type: Optional[str] = Field(None, description="股票类型: stock/etf/index (可选，自动获取)")


class DailyQuote(BaseModel):
    """收盘行情数据"""
    
    date: str = Field(..., description="交易日期")
    close: float = Field(..., description="收盘价")
    open: Optional[float] = Field(None, description="开盘价")
    high: Optional[float] = Field(None, description="最高价")
    low: Optional[float] = Field(None, description="最低价")
    volume: Optional[int] = Field(None, description="成交量（股）")
    amount: Optional[float] = Field(None, description="成交额（元）")
    pct_chg: Optional[float] = Field(None, description="涨跌幅 (%)")
    prev_close: Optional[float] = Field(None, description="昨收价")
    
    class Config:
        json_schema_extra = {
            "example": {
                "date": "2026-03-27",
                "close": 1523.60,
                "open": 1510.00,
                "high": 1530.00,
                "low": 1505.00,
                "volume": 2850000,
                "amount": 4325000000,
                "pct_chg": 1.25,
                "prev_close": 1504.80
            }
        }


class AnalysisSummary(BaseModel):
    """分析结果摘要"""
    
    score: int = Field(..., description="情绪评分 (0-100)")
    advice: str = Field(..., description="操作建议: 买入/卖出/观望")
    trend: str = Field(..., description="趋势预测")
    analysis_id: int = Field(..., description="分析记录 ID")
    analyzed_at: str = Field(..., description="分析时间")
    ideal_buy: Optional[float] = Field(None, description="理想买入价")
    secondary_buy: Optional[float] = Field(None, description="次级买入价")
    stop_loss: Optional[float] = Field(None, description="止损价")
    take_profit: Optional[float] = Field(None, description="止盈价")
    
    class Config:
        json_schema_extra = {
            "example": {
                "score": 85,
                "advice": "买入",
                "trend": "震荡上行",
                "analysis_id": 12345,
                "analyzed_at": "2026-03-27T10:30:00",
                "ideal_buy": 180.0,
                "secondary_buy": 175.0,
                "stop_loss": 170.0,
                "take_profit": 200.0,
            }
        }


class StockInfoItem(BaseModel):
    """股票信息项"""
    
    code: str = Field(..., description="股票代码")
    name: str = Field(..., description="股票名称")
    stock_type: str = Field(..., description="股票类型: stock/etf/index")
    status: str = Field(..., description="状态: watchlist/holding")
    market: Optional[str] = Field(None, description="市场: cn/hk/us")
    industry: Optional[str] = Field(None, description="所属行业")
    sector: Optional[str] = Field(None, description="所属板块")
    created_at: Optional[str] = Field(None, description="创建时间")
    updated_at: Optional[str] = Field(None, description="更新时间")
    quote: Optional[DailyQuote] = Field(None, description="收盘行情")
    analysis: Optional[AnalysisSummary] = Field(None, description="当日分析结果")


class StockInfoListResponse(BaseModel):
    """股票信息列表响应"""
    
    items: List[StockInfoItem] = Field(default_factory=list, description="股票列表")
    total: int = Field(..., description="总数")
    target_date: Optional[str] = Field(None, description="目标交易日 (YYYY-MM-DD)")


class AddStockResponse(BaseModel):
    """添加股票响应"""
    
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="消息")
    stock: Optional[StockInfoItem] = Field(None, description="股票信息")


class UpdateStatusRequest(BaseModel):
    """更新股票状态请求"""
    
    status: str = Field(..., description="目标状态: watchlist(自选) / holding(持仓)")
