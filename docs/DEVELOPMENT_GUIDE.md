# Daily Stock Analysis - 开发指南

## 目录

1. [项目概述](#项目概述)
2. [环境搭建](#环境搭建)
3. [项目架构](#项目架构)
4. [开发流程](#开发流程)
5. [API 接口说明](#api-接口说明)
6. [前端开发](#前端开发)
7. [测试指南](#测试指南)
8. [部署说明](#部署说明)

---

## 项目概述

Daily Stock Analysis 是一个基于 AI 大模型的 A股/港股/美股自选股智能分析系统。项目采用前后端分离架构，后端使用 FastAPI 框架，前端支持两种模式：

- **web2.0**: Vue 3 + Bootstrap 5，无需构建，直接运行
- **dsa-web**: React + Vite + Tailwind CSS，需要构建

### 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | FastAPI + Uvicorn |
| AI/LLM | LiteLLM (支持 Gemini/OpenAI/DeepSeek/Claude 等) |
| 数据源 | AkShare/Tushare/Pytdx/YFinance |
| 数据库 | SQLite (SQLAlchemy ORM) |
| 前端 (web2.0) | Vue 3 + Bootstrap 5 + Axios |
| 前端 (dsa-web) | React + Vite + Tailwind CSS |
| 依赖管理 | uv (Python) / npm (Node.js) |

---

## 环境搭建

### 前置要求

- Python 3.10+
- Node.js 18+ (仅 dsa-web 前端需要)
- uv 工具

### 安装 uv

**Windows:**
```powershell
pip install uv
```

**macOS/Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 快速开始

1. **克隆项目**
```bash
git clone https://github.com/ZhuLinsen/daily_stock_analysis.git
cd daily_stock_analysis
```

2. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，配置 API Key 等
```

3. **同步依赖**
```bash
uv sync
```

4. **启动开发服务器**

使用 web2.0 前端（推荐，无需构建）：
```bash
uv run python scripts/dev_server.py --web2
```

使用 dsa-web 前端：
```bash
uv run python scripts/dev_server.py --dsa-web --build
```

或直接使用主程序：
```bash
# web2.0 前端
WEBUI_FRONTEND=web2.0 uv run python main.py --serve-only

# dsa-web 前端
uv run python main.py --serve-only
```

5. **访问应用**
- Web 界面: http://127.0.0.1:8000
- API 文档: http://127.0.0.1:8000/docs
- ReDoc 文档: http://127.0.0.1:8000/redoc

---

## 项目架构

### 目录结构

```
daily_stock_analysis/
├── api/                    # FastAPI 后端
│   ├── app.py              # 应用工厂
│   ├── deps.py             # 依赖注入
│   ├── middlewares/        # 中间件
│   │   ├── auth.py         # 认证中间件
│   │   └── error_handler.py
│   └── v1/                 # API v1
│       ├── endpoints/      # 端点实现
│       ├── schemas/        # 数据模型
│       └── router.py       # 路由聚合
├── src/                    # 核心业务逻辑
│   ├── agent/              # Agent 多智能体
│   ├── core/               # 核心模块
│   ├── data/               # 数据处理
│   ├── services/           # 业务服务
│   └── utils/              # 工具函数
├── web2.0/                 # Vue 3 前端（无需构建）
│   ├── index.html          # 入口页面
│   ├── src/
│   │   ├── api/            # API 客户端
│   │   ├── components/     # Vue 组件
│   │   ├── stores/         # 状态管理
│   │   └── router/         # 路由配置
│   └── server.py           # 开发服务器
├── apps/dsa-web/           # React 前端（需构建）
├── data_provider/          # 数据源适配器
├── bot/                    # 机器人平台
├── tests/                  # 测试文件
├── scripts/                # 脚本工具
├── docs/                   # 文档
├── pyproject.toml          # 项目配置（uv）
├── requirements.txt        # 依赖列表（兼容）
├── main.py                 # 主入口
└── server.py               # FastAPI 入口
```

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
├─────────────────────────────┬───────────────────────────────┤
│     web2.0 (Vue 3)          │      dsa-web (React)          │
│     - 无需构建               │      - Vite 构建              │
│     - Bootstrap 5           │      - Tailwind CSS           │
└─────────────────────────────┴───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (FastAPI)                      │
├─────────────────────────────────────────────────────────────┤
│  /api/v1/analysis   /api/v1/stocks    /api/v1/agent         │
│  /api/v1/history    /api/v1/portfolio /api/v1/system        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
├─────────────────────────────────────────────────────────────┤
│  AnalysisService  StockService  PortfolioService            │
│  AgentOrchestrator  SearchService  NotificationService      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
├─────────────────────────────────────────────────────────────┤
│  SQLite (SQLAlchemy)  │  External APIs (AkShare/YFinance)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 开发流程

### 添加新的 API 端点

1. 在 `api/v1/schemas/` 创建数据模型
2. 在 `api/v1/endpoints/` 创建端点文件
3. 在 `api/v1/router.py` 注册路由

示例：

```python
# api/v1/endpoints/example.py
from fastapi import APIRouter, Depends
from api.deps import get_config

router = APIRouter()

@router.get("/example")
async def get_example(config = Depends(get_config)):
    return {"message": "Hello World"}
```

```python
# api/v1/router.py
from api.v1.endpoints import example

router.include_router(
    example.router,
    prefix="/example",
    tags=["Example"]
)
```

### 添加新的前端页面 (web2.0)

1. 在 `web2.0/src/components/pages/` 创建页面组件
2. 在 `web2.0/src/router/index.js` 添加路由
3. 在 `web2.0/src/components/layout/Navbar.js` 添加导航项

---

## API 接口说明

### 认证

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "password": "your_password"
}
```

### 股票分析

```http
POST /api/v1/analysis/analyze
Content-Type: application/json

{
  "stock_code": "600519",
  "report_type": "detailed",
  "async_mode": true
}
```

### Agent 对话

```http
POST /api/v1/agent/chat
Content-Type: application/json

{
  "message": "用缠论分析 600519",
  "strategy": "chan_theory",
  "stream": true
}
```

### 投资组合

```http
GET /api/v1/portfolio/snapshot
```

---

## 前端开发

### web2.0 开发

web2.0 前端使用 Vue 3 + Bootstrap 5，无需构建工具，直接修改文件即可。

**目录结构：**
```
web2.0/
├── index.html              # 入口 HTML
├── src/
│   ├── main.js             # 应用入口
│   ├── api/                # API 客户端
│   │   ├── index.js        # API 初始化
│   │   ├── analysis.js     # 分析 API
│   │   ├── stocks.js       # 股票 API
│   │   └── config.js       # 配置
│   ├── components/
│   │   ├── common/         # 通用组件
│   │   ├── layout/         # 布局组件
│   │   └── pages/          # 页面组件
│   ├── stores/
│   │   └── appStore.js     # 全局状态
│   ├── router/
│   │   └── index.js        # 路由配置
│   └── assets/
│       └── css/            # 样式文件
└── server.py               # 开发服务器
```

**启动开发服务器：**
```bash
python web2.0/server.py
# 前端: http://localhost:8080
# 后端: http://127.0.0.1:8000
```

### dsa-web 开发

```bash
cd apps/dsa-web
npm install
npm run dev    # 开发模式
npm run build  # 构建
```

---

## 测试指南

### 运行测试

```bash
# 运行所有测试
uv run pytest

# 运行特定测试
uv run pytest tests/test_analysis_api_contract.py

# 运行带网络标记的测试
uv run pytest -m network

# 运行并显示覆盖率
uv run pytest --cov=src tests/
```

### 代码检查

```bash
# 语法检查
uv run python -m py_compile src/**/*.py

# Flake8 检查
uv run flake8 src/ api/ tests/

# 类型检查
uv run mypy src/
```

---

## 部署说明

### Docker 部署

```bash
# 构建镜像
docker build -t daily-stock-analysis -f docker/Dockerfile .

# 运行容器
docker run -d \
  -p 8000:8000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/.env:/app/.env \
  daily-stock-analysis
```

### Docker Compose

```bash
docker-compose -f docker/docker-compose.yml up -d
```

### 环境变量

关键环境变量：

| 变量 | 说明 | 必填 |
|------|------|:----:|
| `GEMINI_API_KEY` | Gemini API Key | 可选 |
| `OPENAI_API_KEY` | OpenAI 兼容 API Key | 可选 |
| `STOCK_LIST` | 自选股列表 | ✅ |
| `WEBUI_FRONTEND` | 前端类型 (web2.0/dsa-web) | 可选 |
| `ADMIN_AUTH_ENABLED` | 启用认证 | 可选 |

---

## 常见问题

### Q: 如何切换前端？

设置环境变量 `WEBUI_FRONTEND`：
```bash
# 使用 web2.0 前端
WEBUI_FRONTEND=web2.0 uv run python main.py --serve-only

# 使用 dsa-web 前端
WEBUI_FRONTEND=dsa-web uv run python main.py --serve-only
```

### Q: 如何添加新的 LLM 模型？

在 `.env` 中配置：
```env
LLM_CHANNELS=openai,deepseek
LLM_OPENAI_API_KEY=sk-xxx
LLM_OPENAI_MODELS=gpt-4o
LLM_DEEPSEEK_API_KEY=sk-xxx
LLM_DEEPSEEK_MODELS=deepseek-chat
```

### Q: 如何调试 API？

访问 http://127.0.0.1:8000/docs 使用 Swagger UI 进行交互式调试。

---

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

请确保：
- 代码通过 `./scripts/ci_gate.sh` 检查
- 新功能有对应测试
- 文档已更新

---

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件
