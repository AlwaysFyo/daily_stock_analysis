# 自选/持仓列表行情优化设计

## 概述

优化 web2.0 前端自选/持仓列表的行情获取逻辑，解决以下问题：
- 前端逐只股票串行请求行情，效率低下
- 频繁调用行情接口，增加服务器压力
- 节假日/非交易时间无法正确获取行情数据

## 设计目标

1. **节假日处理**：周六、周日、节假日时，获取并展示上一交易日的收盘行情数据
2. **工作日处理**：
   - 收盘前（15:00 前）：获取并展示上一交易日的收盘行情数据
   - 收盘后（15:00 后）：获取并展示当日的收盘行情数据
3. **数据库缓存**：将收盘行情数据存入数据库，避免频繁请求
4. **统一接口**：自选/持仓列表接口直接返回行情和分析数据，减少前端请求次数

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (web2.0)                           │
│  WatchlistPage.js                                           │
│  - 调用 /api/v1/stocks/watchlist 或 /holding                 │
│  - 直接渲染返回的行情数据，无需额外请求                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      后端 API 层                             │
│  api/v1/endpoints/stocks.py                                 │
│  - list_watchlist() / list_holding()                        │
│  - 调用 TradingCalendarService 获取目标交易日                 │
│  - 调用 StockQuoteService 批量获取收盘行情                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      服务层                                  │
│  TradingCalendarService (新增)                               │
│  - 判断当前应获取哪一天的行情数据                              │
│  - 支持多数据源：akshare → tushare → 简单规则降级             │
│                                                              │
│  StockQuoteService (新增)                                    │
│  - 从 StockDaily 表批量获取收盘行情                           │
│  - 若数据库无数据，触发数据拉取并存储                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据层                                  │
│  StockDaily 表 (复用)                                        │
│  - 存储 OHLC、涨跌幅等日线数据                                │
│  - 已有 code + date 唯一约束                                 │
└─────────────────────────────────────────────────────────────┘
```

## 交易日判断逻辑

### 数据源优先级

```
┌─────────────────────────────────────────────┐
│  优先级 1: akshare (免费，无需 Token)         │
│  tool_trade_date_hist_sina()                │
└─────────────────────────────────────────────┘
                    │ 失败
                    ▼
┌─────────────────────────────────────────────┐
│  优先级 2: tushare (需 Token)                │
│  复用现有 TushareFetcher._get_trade_dates()  │
└─────────────────────────────────────────────┘
                    │ 失败
                    ▼
┌─────────────────────────────────────────────┐
│  优先级 3: 简单规则                          │
│  - 周一至周五视为交易日                       │
│  - 节假日无法判断（接受误差）                  │
└─────────────────────────────────────────────┘
                    │ 数据获取失败
                    ▼
┌─────────────────────────────────────────────┐
│  优先级 4: 数据库降级                        │
│  - 从 StockDaily 表查询该股票最近一条记录     │
│  - 返回该记录的日期作为目标交易日              │
│  - 若数据库也无数据，返回 None                │
└─────────────────────────────────────────────┘
```

### 目标交易日判断

| 当前时间 | 是否交易日 | 目标日期 |
|---------|-----------|---------|
| 周六/周日/节假日 | - | 最近一个交易日 |
| 工作日 15:00 前 | 是 | 上一交易日 |
| 工作日 15:00 后 | 是 | 当日 |
| 工作日 | 否 | 最近一个交易日 |

注：A 股收盘时间为 15:00，港股为 16:00。默认使用 A 股规则，后续可扩展支持多市场。

### 行情数据获取流程

```
Step 1: 从 StockDaily 表查询目标日期的行情
        SELECT * FROM stock_daily
        WHERE code IN (列表股票) AND date = 目标日期

Step 2: 若数据库无数据，触发数据拉取
        - 调用 DataFetcherManager.get_daily_data()
        - 存入 StockDaily 表
        - 返回行情数据

Step 3: 若数据拉取也失败，返回空行情
        - 前端显示 "-"
```

## API 响应结构

### Schema 定义

```python
class DailyQuote:
    date: str              # 交易日期 "2026-03-27"
    close: float           # 收盘价
    open: float            # 开盘价
    high: float            # 最高价
    low: float             # 最低价
    volume: int            # 成交量
    amount: float          # 成交额
    pct_chg: float         # 涨跌幅 (%)
    prev_close: float      # 昨收价

class AnalysisSummary:
    score: int             # 情绪评分 (sentiment_score)
    advice: str            # 操作建议 (operation_advice): 买入/卖出/观望
    trend: str             # 趋势预测 (trend_prediction)
    analysis_id: int       # 分析记录 ID
    analyzed_at: str       # 分析时间

class StockInfoItem:
    code: str
    name: str
    stock_type: str
    status: str            # watchlist / holding
    market: str            # cn / hk / us
    industry: str
    sector: str
    created_at: str
    updated_at: str
    quote: Optional[DailyQuote]      # 收盘行情
    analysis: Optional[AnalysisSummary]  # 当日分析结果

class StockInfoListResponse:
    items: List[StockInfoItem]
    total: int
    target_date: str       # 目标交易日
```

### 响应示例

```json
{
  "items": [
    {
      "code": "600519",
      "name": "贵州茅台",
      "stockType": "stock",
      "status": "watchlist",
      "market": "cn",
      "industry": "白酒",
      "sector": "消费",
      "quote": {
        "date": "2026-03-27",
        "close": 1523.60,
        "open": 1510.00,
        "high": 1530.00,
        "low": 1505.00,
        "volume": 2850000,
        "amount": 4325000000,
        "pct_chg": 1.25,
        "prev_close": 1504.80
      },
      "analysis": {
        "score": 85,
        "advice": "买入",
        "trend": "震荡上行",
        "analysisId": 12345,
        "analyzedAt": "2026-03-27T10:30:00"
      }
    },
    {
      "code": "000001",
      "name": "平安银行",
      "stockType": "stock",
      "status": "holding",
      "market": "cn",
      "quote": {
        "date": "2026-03-27",
        "close": 12.35,
        "pct_chg": -0.45
      },
      "analysis": null
    }
  ],
  "total": 2,
  "targetDate": "2026-03-27"
}
```

## 前端改造方案

### 改造要点

1. **移除串行行情请求**
   - 删除 `loadQuotesForStocks()` 函数
   - 删除对 `stocksApi.getQuote()` 的调用

2. **简化 loadStocks() 函数**
   - 一次请求获取全部数据（股票信息 + 行情 + 分析）
   - 直接使用返回的 `quote` 和 `analysis` 字段

3. **数据映射**

| 后端字段 | 前端显示 |
|---------|---------|
| quote.close | 最新价（为空显示 "-"） |
| quote.pct_chg | 涨跌幅（为空显示 "-"） |
| analysis.score | 评分（为空显示 "-"） |
| analysis.advice | 建议（为空显示 "-"） |
| analysis.trend | 趋势（为空显示 "-"） |

4. **操作列按钮**

| 按钮 | 功能 |
|-----|------|
| 分析 | 触发该股票的分析任务（复用 OverviewPage 的分析逻辑） |
| 移除 | 从列表中移除该股票 |
| 加入持仓 | 仅自选列表显示，将股票加入持仓 |

### 代码变更示意

```javascript
// 改造后
const loadStocks = async () => {
    const response = await stocksApi.getWatchlist();
    stockList.value = response.items.map(item => ({
        code: item.code,
        name: item.name,
        // 行情数据（为空显示 "-"）
        price: item.quote?.close ?? '-',
        change: item.quote?.pct_chg != null 
            ? `${item.quote.pct_chg >= 0 ? '+' : ''}${item.quote.pct_chg.toFixed(2)}%`
            : '-',
        changeUp: item.quote?.pct_chg != null ? item.quote.pct_chg >= 0 : false,
        // 分析数据（为空显示 "-"）
        score: item.analysis?.score ?? '-',
        conclusion: item.analysis?.advice ?? '-',
        trend: item.analysis?.trend ?? '-',
        analysisId: item.analysis?.analysisId ?? null,
    }));
    targetDate.value = response.targetDate;
};

// 新增：触发分析（复用 OverviewPage 的分析逻辑）
const handleAnalyze = async (stock) => {
    try {
        const response = await analysisApi.analyzeAsync({
            stockCode: stock.code,
            reportType: 'detailed',
        });
        appStore.addTask({
            taskId: response.taskId,
            stockCode: stock.code,
            status: 'pending',
            progress: 0,
        });
    } catch (err) {
        alert('提交失败: ' + err.message);
    }
};
```

## 实现任务清单

### 后端任务

1. **新增交易日历服务**
   - 文件: `src/services/trading_calendar_service.py`
   - `get_target_trading_date()` 判断目标交易日
   - 支持 akshare / tushare / 简单规则 / 数据库降级

2. **新增收盘行情服务**
   - 文件: `src/services/stock_quote_service.py`
   - `get_daily_quotes()` 批量获取收盘行情
   - 从 StockDaily 表查询，无数据时触发拉取

3. **更新 Schema 定义**
   - 文件: `api/v1/schemas/stocks.py`
   - 新增 DailyQuote 模型
   - 新增 AnalysisSummary 模型
   - 扩展 StockInfoItem 添加 quote 和 analysis 字段
   - 扩展 StockInfoListResponse 添加 targetDate 字段

4. **更新 API 端点**
   - 文件: `api/v1/endpoints/stocks.py`
   - 修改 `_list_stocks_by_status()` 函数
   - 集成 TradingCalendarService 和 StockQuoteService
   - 查询当日分析结果（从 analysis_history）

### 前端任务

5. **更新自选/持仓页面**
   - 文件: `web2.0/src/components/pages/WatchlistPage.js`
   - 删除 `loadQuotesForStocks()` 函数
   - 简化 `loadStocks()` 函数
   - 新增 `handleAnalyze()` 方法（复用 OverviewPage 的分析逻辑）
   - 更新模板：显示行情、分析、操作按钮（分析/移除/加入持仓）

## 风险与降级

1. **交易日历不可用**：降级为简单规则（周一至周五）+ 数据库查询
2. **行情数据源不可用**：返回空行情，前端显示 "-"
3. **分析数据不存在**：返回 null，前端显示 "-" 并可点击触发分析
