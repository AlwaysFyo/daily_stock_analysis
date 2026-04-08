# -*- coding: utf-8 -*-
"""
===================================
股票数据接口
===================================

职责：
1. POST /api/v1/stocks/extract-from-image 从图片提取股票代码
2. POST /api/v1/stocks/parse-import 解析 CSV/Excel/剪贴板
3. GET /api/v1/stocks/{code}/quote 实时行情接口
4. GET /api/v1/stocks/{code}/history 历史行情接口
"""

import logging
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile

from api.v1.schemas.common import ErrorResponse
from api.v1.schemas.stocks import (
    AddStockRequest,
    AddStockResponse,
    ExtractFromImageResponse,
    ExtractItem,
    KLineData,
    StockHistoryResponse,
    StockInfoItem,
    StockInfoListResponse,
    StockQuote,
    UpdateStatusRequest,
)
from src.services.image_stock_extractor import (
    ALLOWED_MIME,
    MAX_SIZE_BYTES,
    extract_stock_codes_from_image,
)
from src.services.import_parser import (
    MAX_FILE_BYTES,
    parse_import_from_bytes,
    parse_import_from_text,
)
from src.services.stock_service import StockService

logger = logging.getLogger(__name__)

router = APIRouter()

# 须在 /{stock_code} 路由之前定义
ALLOWED_MIME_STR = ", ".join(ALLOWED_MIME)


@router.post(
    "/extract-from-image",
    response_model=ExtractFromImageResponse,
    responses={
        200: {"description": "提取的股票代码"},
        400: {"description": "图片无效", "model": ErrorResponse},
        500: {"description": "服务器错误", "model": ErrorResponse},
    },
    summary="从图片提取股票代码",
    description="上传截图/图片，通过 Vision LLM 提取股票代码。支持 JPEG、PNG、WebP、GIF，最大 5MB。",
)
def extract_from_image(
    file: Optional[UploadFile] = File(None, description="图片文件（表单字段名 file）"),
    include_raw: bool = Query(False, description="是否在结果中包含原始 LLM 响应"),
) -> ExtractFromImageResponse:
    """
    从上传的图片中提取股票代码（使用 Vision LLM）。

    表单字段请使用 file 上传图片。优先级：Gemini / Anthropic / OpenAI（首个可用）。
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "bad_request",
                "message": "未提供文件，请使用表单字段 file 上传图片",
            },
        )

    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "unsupported_type",
                "message": f"不支持的类型: {content_type}。允许: {ALLOWED_MIME_STR}",
            },
        )

    try:
        # 先读取限定大小，再检查是否还有剩余（语义清晰：超出则拒绝）
        data = file.file.read(MAX_SIZE_BYTES)
        if file.file.read(1):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "file_too_large",
                    "message": f"图片超过 {MAX_SIZE_BYTES // (1024 * 1024)}MB 限制",
                },
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"读取上传文件失败: {e}")
        raise HTTPException(
            status_code=400,
            detail={"error": "read_failed", "message": "读取上传文件失败"},
        )

    try:
        items, raw_text = extract_stock_codes_from_image(data, content_type)
        extract_items = [
            ExtractItem(code=code, name=name, confidence=conf)
            for code, name, conf in items
        ]
        codes = [i.code for i in extract_items]
        return ExtractFromImageResponse(
            codes=codes,
            items=extract_items,
            raw_text=raw_text if include_raw else None,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400, detail={"error": "extract_failed", "message": str(e)}
        )
    except Exception as e:
        logger.error(f"图片提取失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "internal_error", "message": "图片提取失败"},
        )


@router.post(
    "/parse-import",
    response_model=ExtractFromImageResponse,
    responses={
        200: {"description": "解析结果"},
        400: {"description": "未提供数据或解析失败", "model": ErrorResponse},
        500: {"description": "服务器错误", "model": ErrorResponse},
    },
    summary="解析 CSV/Excel/剪贴板",
    description="上传 CSV/Excel 文件或粘贴文本，自动解析股票代码。文件上限 2MB，文本上限 100KB。",
)
async def parse_import(request: Request) -> ExtractFromImageResponse:
    """
    解析 CSV/Excel 文件或剪贴板文本。

    - multipart/form-data + file: 上传文件
    - application/json + {"text": "..."}: 粘贴文本
    - 优先使用 file，若同时提供则忽略 text
    """
    content_type = (request.headers.get("content-type") or "").lower()

    if "application/json" in content_type:
        try:
            body = await request.json()
        except Exception as e:
            logger.warning("[parse_import] JSON parse failed: %s", e)
            raise HTTPException(
                status_code=400,
                detail={"error": "invalid_json", "message": f"JSON 解析失败: {e}"},
            )
        text = body.get("text") if isinstance(body, dict) else None
        if not text or not isinstance(text, str):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "bad_request",
                    "message": '未提供 text，请使用 {"text": "..."}',
                },
            )
        try:
            items = parse_import_from_text(text)
        except ValueError as e:
            text_bytes = len(text.encode("utf-8"))
            logger.warning(
                "[parse_import] parse_import_from_text failed: text_bytes=%d, error=%s",
                text_bytes,
                e,
            )
            raise HTTPException(
                status_code=400, detail={"error": "parse_failed", "message": str(e)}
            )
    elif "multipart" in content_type:
        form = await request.form()
        file = form.get("file")
        if not file or not hasattr(file, "read"):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "bad_request",
                    "message": "未提供文件，请使用表单字段 file",
                },
            )
        file_size = getattr(file, "size", None)
        if isinstance(file_size, int) and file_size > MAX_FILE_BYTES:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "file_too_large",
                    "message": f"文件超过 {MAX_FILE_BYTES // (1024 * 1024)}MB 限制",
                },
            )
        try:
            data = file.file.read(MAX_FILE_BYTES)
            if file.file.read(1):
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "file_too_large",
                        "message": f"文件超过 {MAX_FILE_BYTES // (1024 * 1024)}MB 限制",
                    },
                )
        except HTTPException:
            raise
        except Exception as e:
            filename = getattr(file, "filename", None) or ""
            size = getattr(file, "size", None)
            logger.warning(
                "[parse_import] file read failed: filename=%r, size=%s, error=%s",
                filename,
                size,
                e,
            )
            raise HTTPException(
                status_code=400,
                detail={"error": "read_failed", "message": "读取文件失败"},
            )
        filename = getattr(file, "filename", None) or ""
        try:
            items = parse_import_from_bytes(data, filename=filename)
        except ValueError as e:
            ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
            logger.warning(
                "[parse_import] parse_import_from_bytes failed: filename=%r, ext=%r, bytes=%d, error=%s",
                filename,
                ext,
                len(data),
                e,
            )
            raise HTTPException(
                status_code=400, detail={"error": "parse_failed", "message": str(e)}
            )
    else:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "bad_request",
                "message": '请使用 multipart/form-data 上传文件，或 application/json 提交 {"text": "..."}',
            },
        )

    extract_items = [
        ExtractItem(code=code, name=name, confidence=conf) for code, name, conf in items
    ]
    codes = list(dict.fromkeys(i.code for i in extract_items if i.code))
    return ExtractFromImageResponse(codes=codes, items=extract_items, raw_text=None)


@router.get(
    "/{stock_code}/quote",
    response_model=StockQuote,
    responses={
        200: {"description": "行情数据"},
        404: {"description": "股票不存在", "model": ErrorResponse},
        500: {"description": "服务器错误", "model": ErrorResponse},
    },
    summary="获取股票实时行情",
    description="获取指定股票的最新行情数据",
)
def get_stock_quote(stock_code: str) -> StockQuote:
    """
    获取股票实时行情

    获取指定股票的最新行情数据

    Args:
        stock_code: 股票代码（如 600519、00700、AAPL）

    Returns:
        StockQuote: 实时行情数据

    Raises:
        HTTPException: 404 - 股票不存在
    """
    try:
        service = StockService()

        # 使用 def 而非 async def，FastAPI 自动在线程池中执行
        result = service.get_realtime_quote(stock_code)

        if result is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "not_found",
                    "message": f"未找到股票 {stock_code} 的行情数据",
                },
            )

        return StockQuote(
            stock_code=result.get("stock_code", stock_code),
            stock_name=result.get("stock_name"),
            current_price=result.get("current_price", 0.0),
            change=result.get("change"),
            change_percent=result.get("change_percent"),
            open=result.get("open"),
            high=result.get("high"),
            low=result.get("low"),
            prev_close=result.get("prev_close"),
            volume=result.get("volume"),
            amount=result.get("amount"),
            update_time=result.get("update_time"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取实时行情失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_error",
                "message": f"获取实时行情失败: {str(e)}",
            },
        )


@router.get(
    "/{stock_code}/history",
    response_model=StockHistoryResponse,
    responses={
        200: {"description": "历史行情数据"},
        422: {"description": "不支持的周期参数", "model": ErrorResponse},
        500: {"description": "服务器错误", "model": ErrorResponse},
    },
    summary="获取股票历史行情",
    description="获取指定股票的历史 K 线数据",
)
def get_stock_history(
    stock_code: str,
    period: str = Query(
        "daily", description="K 线周期", pattern="^(daily|weekly|monthly)$"
    ),
    days: int = Query(30, ge=1, le=365, description="获取天数"),
) -> StockHistoryResponse:
    """
    获取股票历史行情

    获取指定股票的历史 K 线数据

    Args:
        stock_code: 股票代码
        period: K 线周期 (daily/weekly/monthly)
        days: 获取天数

    Returns:
        StockHistoryResponse: 历史行情数据
    """
    try:
        service = StockService()

        # 使用 def 而非 async def，FastAPI 自动在线程池中执行
        result = service.get_history_data(
            stock_code=stock_code, period=period, days=days
        )

        # 转换为响应模型
        data = [
            KLineData(
                date=item.get("date"),
                open=item.get("open"),
                high=item.get("high"),
                low=item.get("low"),
                close=item.get("close"),
                volume=item.get("volume"),
                amount=item.get("amount"),
                change_percent=item.get("change_percent"),
            )
            for item in result.get("data", [])
        ]

        return StockHistoryResponse(
            stock_code=stock_code,
            stock_name=result.get("stock_name"),
            period=period,
            data=data,
        )

    except ValueError as e:
        # period 参数不支持的错误（如 weekly/monthly）
        raise HTTPException(
            status_code=422, detail={"error": "unsupported_period", "message": str(e)}
        )
    except Exception as e:
        logger.error(f"获取历史行情失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_error",
                "message": f"获取历史行情失败: {str(e)}",
            },
        )


# ============================================================
# 自选股/持仓管理 API
# ============================================================


@router.post(
    "/watchlist/add",
    response_model=AddStockResponse,
    responses={
        200: {"description": "添加成功"},
        400: {"description": "参数错误", "model": ErrorResponse},
        500: {"description": "服务器错误", "model": ErrorResponse},
    },
    summary="添加自选股",
    description="添加股票到自选列表，自动获取股票名称等信息",
)
def add_to_watchlist(request: AddStockRequest) -> AddStockResponse:
    """
    添加股票到自选列表

    - 自动获取股票名称、市场等信息
    - 如果股票已存在，更新状态为自选
    """
    return _add_or_update_stock(request.code, "watchlist", request.stock_type)


@router.post(
    "/holding/add",
    response_model=AddStockResponse,
    responses={
        200: {"description": "添加成功"},
        400: {"description": "参数错误", "model": ErrorResponse},
        500: {"description": "服务器错误", "model": ErrorResponse},
    },
    summary="添加持仓股",
    description="添加股票到持仓列表，自动获取股票名称等信息",
)
def add_to_holding(request: AddStockRequest) -> AddStockResponse:
    """
    添加股票到持仓列表

    - 自动获取股票名称、市场等信息
    - 如果股票已存在，更新状态为持仓
    """
    return _add_or_update_stock(request.code, "holding", request.stock_type)


@router.get(
    "/watchlist",
    response_model=StockInfoListResponse,
    responses={500: {"model": ErrorResponse}},
    summary="获取自选股列表",
    description="获取当前用户的所有自选股",
)
def list_watchlist() -> StockInfoListResponse:
    """获取自选股列表"""
    return _list_stocks_by_status("watchlist")


@router.get(
    "/holding",
    response_model=StockInfoListResponse,
    responses={500: {"model": ErrorResponse}},
    summary="获取持仓列表",
    description="获取当前用户的所有持仓股",
)
def list_holding() -> StockInfoListResponse:
    """获取持仓列表"""
    return _list_stocks_by_status("holding")


@router.get(
    "/top-decisions",
    response_model=StockInfoListResponse,
    responses={500: {"model": ErrorResponse}},
    summary="获取最新决策 TopN",
    description="获取自选+持仓中评分最高的 N 只股票",
)
def get_top_decisions(
    limit: int = Query(3, description="返回数量", ge=1, le=10),
) -> StockInfoListResponse:
    """
    获取最新决策 TopN

    从自选+持仓中按评分降序返回 TopN 股票
    """
    from datetime import datetime

    from sqlalchemy import and_, desc, select

    from src.storage import AnalysisHistory, DatabaseManager, StockInfo

    db = DatabaseManager.get_instance()

    try:
        with db.get_session() as session:
            today = datetime.now().date()

            # 查询自选+持仓的股票
            stocks = (
                session.execute(
                    select(StockInfo).where(
                        StockInfo.status.in_(["watchlist", "holding"])
                    )
                )
                .scalars()
                .all()
            )

            if not stocks:
                return StockInfoListResponse(items=[], total=0)

            # 获取每只股票的最新分析结果
            stock_analyses = {}
            for stock in stocks:
                analysis = session.execute(
                    select(AnalysisHistory)
                    .where(
                        and_(
                            AnalysisHistory.code == stock.code,
                            AnalysisHistory.created_at
                            >= datetime.combine(today, datetime.min.time()),
                        )
                    )
                    .order_by(desc(AnalysisHistory.created_at))
                    .limit(1)
                ).scalar_one_or_none()

                if analysis and analysis.sentiment_score is not None:
                    stock_analyses[stock.code] = {
                        "stock": stock,
                        "analysis": analysis,
                        "score": analysis.sentiment_score,
                    }

            # 按评分降序排序，取 TopN
            sorted_items = sorted(
                stock_analyses.values(), key=lambda x: x["score"], reverse=True
            )[:limit]

            # 构建响应
            items = []
            for item in sorted_items:
                stock = item["stock"]
                analysis = item["analysis"]

                from api.v1.schemas.stocks import AnalysisSummary

                items.append(
                    StockInfoItem(
                        code=stock.code,
                        name=stock.name,
                        stock_type=stock.stock_type,
                        status=stock.status,
                        market=stock.market,
                        industry=stock.industry,
                        sector=stock.sector,
                        created_at=stock.created_at.isoformat()
                        if stock.created_at
                        else None,
                        updated_at=stock.updated_at.isoformat()
                        if stock.updated_at
                        else None,
                        analysis=AnalysisSummary(
                            score=analysis.sentiment_score or 0,
                            advice=analysis.operation_advice or "-",
                            trend=analysis.trend_prediction or "-",
                            analysis_id=analysis.id,
                            analyzed_at=analysis.created_at.isoformat()
                            if analysis.created_at
                            else "",
                            ideal_buy=analysis.ideal_buy,
                            secondary_buy=analysis.secondary_buy,
                            stop_loss=analysis.stop_loss,
                            take_profit=analysis.take_profit,
                        ),
                    )
                )

            return StockInfoListResponse(items=items, total=len(items))

    except Exception as e:
        logger.error(f"获取 TopN 决策失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_error",
                "message": f"获取 TopN 决策失败: {str(e)}",
            },
        )


@router.delete(
    "/{stock_code}",
    response_model=AddStockResponse,
    responses={
        200: {"description": "删除成功"},
        404: {"description": "股票不存在", "model": ErrorResponse},
    },
    summary="移除股票",
    description="从自选/持仓列表中移除股票",
)
def remove_stock(stock_code: str) -> AddStockResponse:
    """从自选/持仓列表中移除股票"""
    from sqlalchemy import delete

    from src.storage import DatabaseManager, StockInfo

    db = DatabaseManager.get_instance()

    try:
        with db.get_session() as session:
            result = session.execute(
                delete(StockInfo).where(StockInfo.code == stock_code)
            )
            session.commit()

            if result.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail={
                        "error": "not_found",
                        "message": f"股票 {stock_code} 不存在",
                    },
                )

            return AddStockResponse(success=True, message=f"已移除股票 {stock_code}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"移除股票失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "internal_error", "message": f"移除股票失败: {str(e)}"},
        )


@router.put(
    "/{stock_code}/status",
    response_model=AddStockResponse,
    responses={
        200: {"description": "更新成功"},
        400: {"description": "参数错误", "model": ErrorResponse},
        404: {"description": "股票不存在", "model": ErrorResponse},
    },
    summary="更新股票状态",
    description="切换股票状态：自选 ↔ 持仓",
)
def update_stock_status(
    stock_code: str, request: UpdateStatusRequest
) -> AddStockResponse:
    """
    更新股票状态

    - watchlist → holding: 自选股加入持仓
    - holding → watchlist: 持仓移到自选
    """
    from sqlalchemy import select

    from src.storage import DatabaseManager, StockInfo

    if request.status not in ("watchlist", "holding"):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_status",
                "message": "状态必须是 watchlist 或 holding",
            },
        )

    db = DatabaseManager.get_instance()

    try:
        with db.get_session() as session:
            stock = session.execute(
                select(StockInfo).where(StockInfo.code == stock_code)
            ).scalar_one_or_none()

            if not stock:
                raise HTTPException(
                    status_code=404,
                    detail={
                        "error": "not_found",
                        "message": f"股票 {stock_code} 不存在",
                    },
                )

            old_status = stock.status
            stock.status = request.status
            session.commit()

            status_names = {"watchlist": "自选", "holding": "持仓"}

            return AddStockResponse(
                success=True,
                message=f"已将 {stock.name}({stock_code}) 从{status_names.get(old_status, old_status)}移到{status_names.get(request.status, request.status)}",
                stock=StockInfoItem(
                    code=stock.code,
                    name=stock.name,
                    stock_type=stock.stock_type,
                    status=stock.status,
                    market=stock.market,
                    industry=stock.industry,
                    sector=stock.sector,
                    created_at=stock.created_at.isoformat()
                    if stock.created_at
                    else None,
                    updated_at=stock.updated_at.isoformat()
                    if stock.updated_at
                    else None,
                ),
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新股票状态失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_error",
                "message": f"更新股票状态失败: {str(e)}",
            },
        )


def _add_or_update_stock(
    code: str, status: str, stock_type: Optional[str] = None
) -> AddStockResponse:
    """
    添加或更新股票信息

    自动获取股票名称等信息后保存
    """
    from src.storage import DatabaseManager

    db = DatabaseManager.get_instance()

    try:
        stock_name = None
        market = "cn"

        try:
            from data_provider.base import DataFetcherManager

            manager = DataFetcherManager()
            stock_name = manager.get_stock_name(code)
        except ImportError:
            logger.warning("DataFetcherManager 未找到，使用代码作为名称")
        except Exception as e:
            logger.warning(f"获取股票名称失败: {e}")

        if not stock_name:
            stock_name = code

        final_stock_type = stock_type or "stock"

        success = db.save_stock_info(
            code=code,
            name=stock_name,
            stock_type=final_stock_type,
            status=status,
            market=market,
        )

        if not success:
            raise HTTPException(
                status_code=500,
                detail={"error": "save_failed", "message": "保存股票信息失败"},
            )

        stock = db.get_stock_info(code)

        return AddStockResponse(
            success=True,
            message=f"已添加 {stock_name}({code}) 到{'自选' if status == 'watchlist' else '持仓'}列表",
            stock=StockInfoItem(
                code=stock.code,
                name=stock.name,
                stock_type=stock.stock_type,
                status=stock.status,
                market=stock.market,
                industry=stock.industry,
                sector=stock.sector,
                created_at=stock.created_at.isoformat() if stock.created_at else None,
                updated_at=stock.updated_at.isoformat() if stock.updated_at else None,
            )
            if stock
            else None,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"添加股票失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "internal_error", "message": f"添加股票失败: {str(e)}"},
        )


def _list_stocks_by_status(status: str) -> StockInfoListResponse:
    """按状态获取股票列表（含行情和分析数据）"""
    from datetime import datetime

    from sqlalchemy import and_, desc, select

    from src.services.stock_quote_service import StockQuoteService
    from src.services.trading_calendar_service import TradingCalendarService
    from src.storage import AnalysisHistory, DatabaseManager, StockInfo

    db = DatabaseManager.get_instance()
    calendar_svc = TradingCalendarService.get_instance()
    quote_svc = StockQuoteService.get_instance()

    try:
        with db.get_session() as session:
            results = (
                session.execute(
                    select(StockInfo)
                    .where(StockInfo.status == status)
                    .order_by(StockInfo.updated_at.desc())
                )
                .scalars()
                .all()
            )

            if not results:
                return StockInfoListResponse(items=[], total=0, target_date=None)

            codes = [stock.code for stock in results]

            target_date_str = calendar_svc.get_target_trading_date_for_codes(codes)
            target_date_display = None
            quotes_dict = {}

            if target_date_str:
                target_date_display = datetime.strptime(
                    target_date_str, "%Y%m%d"
                ).strftime("%Y-%m-%d")
                quotes_dict = quote_svc.get_daily_quotes(codes, target_date_str)

            today = datetime.now().date()
            analysis_dict = {}

            try:
                for stock in results:
                    analysis = session.execute(
                        select(AnalysisHistory)
                        .where(
                            and_(
                                AnalysisHistory.code == stock.code,
                                AnalysisHistory.created_at
                                >= datetime.combine(today, datetime.min.time()),
                            )
                        )
                        .order_by(desc(AnalysisHistory.created_at))
                        .limit(1)
                    ).scalar_one_or_none()

                    if analysis:
                        from api.v1.schemas.stocks import AnalysisSummary

                        analysis_dict[stock.code] = AnalysisSummary(
                            score=analysis.sentiment_score or 0,
                            advice=analysis.operation_advice or "-",
                            trend=analysis.trend_prediction or "-",
                            analysis_id=analysis.id,
                            analyzed_at=analysis.created_at.isoformat()
                            if analysis.created_at
                            else "",
                        )
            except Exception as e:
                logger.warning(f"获取分析结果失败: {e}")

            items = []
            for stock in results:
                quote_data = quotes_dict.get(stock.code)
                quote_model = None
                if quote_data:
                    from api.v1.schemas.stocks import DailyQuote

                    quote_model = DailyQuote(**quote_data.to_dict())

                items.append(
                    StockInfoItem(
                        code=stock.code,
                        name=stock.name,
                        stock_type=stock.stock_type,
                        status=stock.status,
                        market=stock.market,
                        industry=stock.industry,
                        sector=stock.sector,
                        created_at=stock.created_at.isoformat()
                        if stock.created_at
                        else None,
                        updated_at=stock.updated_at.isoformat()
                        if stock.updated_at
                        else None,
                        quote=quote_model,
                        analysis=analysis_dict.get(stock.code),
                    )
                )

            return StockInfoListResponse(
                items=items, total=len(items), target_date=target_date_display
            )

    except Exception as e:
        logger.error(f"获取股票列表失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_error",
                "message": f"获取股票列表失败: {str(e)}",
            },
        )
