# -*- coding: utf-8 -*-
"""
交易日历服务

职责：
1. 判断当前应获取哪一天的行情数据
2. 支持多数据源：akshare → tushare → 简单规则 → 数据库降级
"""

import logging
from datetime import date, datetime, timedelta
from typing import List, Optional
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)


class TradingCalendarService:
    """
    交易日历服务
    
    根据当前时间判断应获取哪一天的行情数据
    """
    
    CACHE_TTL_SECONDS = 3600
    
    _instance = None
    _trade_dates_cache: Optional[List[str]] = None
    _cache_timestamp: float = 0
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def get_instance(cls) -> "TradingCalendarService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def _get_china_now(self) -> datetime:
        """返回上海时区当前时间"""
        return datetime.now(ZoneInfo("Asia/Shanghai"))
    
    def _get_trade_dates_from_akshare(self) -> Optional[List[str]]:
        """从 akshare 获取交易日历（免费，无需 Token）"""
        try:
            import akshare as ak
            
            df = ak.tool_trade_date_hist_sina()
            if df is None or df.empty:
                return None
            
            trade_dates = df['trade_date'].astype(str).tolist()
            normalized = []
            for d in trade_dates:
                if '-' in d:
                    normalized.append(d.replace('-', ''))
                else:
                    normalized.append(d)
            return sorted(normalized, reverse=True)
        except ImportError:
            logger.debug("[交易日历] akshare 未安装")
            return None
        except Exception as e:
            logger.warning(f"[交易日历] akshare 获取交易日历失败: {e}")
            return None
    
    def _get_trade_dates_from_tushare(self) -> Optional[List[str]]:
        """从 tushare 获取交易日历（需 Token）"""
        try:
            from data_provider.tushare_fetcher import TushareFetcher
            from src.config import get_config
            
            config = get_config()
            if not config.tushare_token:
                return None
            
            fetcher = TushareFetcher(token=config.tushare_token)
            trade_dates = fetcher._get_trade_dates()
            return trade_dates
        except ImportError:
            logger.debug("[交易日历] tushare 未配置")
            return None
        except Exception as e:
            logger.warning(f"[交易日历] tushare 获取交易日历失败: {e}")
            return None
    
    def _get_trade_dates_simple(self) -> List[str]:
        """简单规则：最近 30 天的周一至周五"""
        china_now = self._get_china_now()
        dates = []
        for i in range(30):
            d = china_now.date() - timedelta(days=i)
            if d.weekday() < 5:
                dates.append(d.strftime("%Y%m%d"))
        return dates
    
    def _get_trade_dates_from_db(self, codes: List[str]) -> Optional[str]:
        """从数据库获取最近交易日"""
        if not codes:
            return None
        
        try:
            from src.storage import DatabaseManager, StockDaily
            from sqlalchemy import select, desc
            
            db = DatabaseManager.get_instance()
            with db.get_session() as session:
                result = session.execute(
                    select(StockDaily.date)
                    .where(StockDaily.code.in_(codes))
                    .order_by(desc(StockDaily.date))
                    .limit(1)
                ).scalar_one_or_none()
                
                if result:
                    if isinstance(result, str):
                        return result.replace('-', '')
                    elif hasattr(result, 'strftime'):
                        return result.strftime("%Y%m%d")
                    return str(result)
        except Exception as e:
            logger.warning(f"[交易日历] 从数据库获取交易日失败: {e}")
        
        return None
    
    def get_trade_dates(self) -> List[str]:
        """获取交易日列表（倒序，最新日期在前）"""
        import time
        
        current_time = time.time()
        if (self._trade_dates_cache is not None and 
            current_time - self._cache_timestamp < self.CACHE_TTL_SECONDS):
            return self._trade_dates_cache
        
        trade_dates = self._get_trade_dates_from_akshare()
        if trade_dates:
            logger.info("[交易日历] 使用 akshare 交易日历")
            self._trade_dates_cache = trade_dates
            self._cache_timestamp = current_time
            return trade_dates
        
        trade_dates = self._get_trade_dates_from_tushare()
        if trade_dates:
            logger.info("[交易日历] 使用 tushare 交易日历")
            self._trade_dates_cache = trade_dates
            self._cache_timestamp = current_time
            return trade_dates
        
        logger.info("[交易日历] 使用简单规则（周一至周五）")
        trade_dates = self._get_trade_dates_simple()
        self._trade_dates_cache = trade_dates
        self._cache_timestamp = current_time
        return trade_dates
    
    def is_trading_day(self, check_date: Optional[date] = None) -> bool:
        """判断是否为交易日"""
        if check_date is None:
            check_date = self._get_china_now().date()
        
        date_str = check_date.strftime("%Y%m%d")
        trade_dates = self.get_trade_dates()
        return date_str in trade_dates
    
    def get_target_trading_date(
        self,
        codes: Optional[List[str]] = None,
        market_close_hour: int = 15,
    ) -> Optional[str]:
        """
        获取目标交易日
        
        判断逻辑：
        - 周六/周日/节假日：最近一个交易日
        - 工作日 15:00 前：上一交易日
        - 工作日 15:00 后：当日（如果是交易日）或最近一个交易日
        
        Args:
            codes: 股票代码列表（用于数据库降级）
            market_close_hour: 收盘时间（默认 15:00）
        
        Returns:
            目标交易日字符串（YYYYMMDD 格式）
        """
        china_now = self._get_china_now()
        today_str = china_now.strftime("%Y%m%d")
        current_hour = china_now.hour
        
        trade_dates = self.get_trade_dates()
        
        if not trade_dates:
            logger.warning("[交易日历] 无法获取交易日历，尝试数据库降级")
            return self._get_trade_dates_from_db(codes) or today_str
        
        today_is_trading = today_str in trade_dates
        
        if not today_is_trading:
            for d in trade_dates:
                if d < today_str:
                    logger.info(f"[交易日历] 今日非交易日，返回最近交易日 {d}")
                    return d
            return trade_dates[0] if trade_dates else today_str
        
        if current_hour < market_close_hour:
            for d in trade_dates:
                if d < today_str:
                    logger.info(f"[交易日历] 收盘前，返回上一交易日 {d}")
                    return d
            return today_str
        else:
            logger.info(f"[交易日历] 收盘后，返回当日 {today_str}")
            return today_str
    
    def get_target_trading_date_for_codes(
        self,
        codes: List[str],
        market_close_hour: int = 15,
    ) -> Optional[str]:
        """
        获取目标交易日（带数据库降级）
        
        Args:
            codes: 股票代码列表
            market_close_hour: 收盘时间
        
        Returns:
            目标交易日字符串
        """
        target_date = self.get_target_trading_date(codes, market_close_hour)
        
        if target_date:
            return target_date
        
        return self._get_trade_dates_from_db(codes)
