# -*- coding: utf-8 -*-
"""
收盘行情服务

职责：
1. 从 StockDaily 表批量获取收盘行情
2. 若数据库无数据，触发数据拉取并存储
"""

import logging
from datetime import date, datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class DailyQuote:
    """收盘行情数据"""
    date: str
    close: float
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    volume: Optional[int] = None
    amount: Optional[float] = None
    pct_chg: Optional[float] = None
    prev_close: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "date": self.date,
            "close": self.close,
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "volume": self.volume,
            "amount": self.amount,
            "pct_chg": self.pct_chg,
            "prev_close": self.prev_close,
        }


class StockQuoteService:
    """
    收盘行情服务
    
    从数据库批量获取收盘行情，无数据时触发拉取
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def get_instance(cls) -> "StockQuoteService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def get_daily_quotes(
        self,
        codes: List[str],
        target_date: str,
    ) -> Dict[str, DailyQuote]:
        """
        批量获取收盘行情
        
        Args:
            codes: 股票代码列表
            target_date: 目标交易日（YYYYMMDD 格式）
        
        Returns:
            Dict[code, DailyQuote]
        """
        if not codes or not target_date:
            return {}
        
        quotes: Dict[str, DailyQuote] = {}
        codes_to_fetch: List[str] = []
        
        try:
            from src.storage import DatabaseManager, StockDaily
            from sqlalchemy import select, and_
            
            date_obj = datetime.strptime(target_date, "%Y%m%d").date()
            
            db = DatabaseManager.get_instance()
            with db.get_session() as session:
                results = session.execute(
                    select(StockDaily).where(
                        and_(
                            StockDaily.code.in_(codes),
                            StockDaily.date == date_obj
                        )
                    )
                ).scalars().all()
                
                for row in results:
                    quotes[row.code] = DailyQuote(
                        date=row.date.strftime("%Y-%m-%d"),
                        close=row.close or 0.0,
                        open=row.open,
                        high=row.high,
                        low=row.low,
                        volume=int(row.volume) if row.volume else None,
                        amount=row.amount,
                        pct_chg=row.pct_chg,
                        prev_close=None,
                    )
                
                codes_to_fetch = [c for c in codes if c not in quotes]
        except Exception as e:
            logger.error(f"[收盘行情] 查询数据库失败: {e}")
            codes_to_fetch = codes
        
        if codes_to_fetch:
            fetched = self._fetch_and_store_quotes(codes_to_fetch, target_date)
            quotes.update(fetched)
        
        for code in codes:
            if code in quotes and quotes[code].prev_close is None:
                quotes[code].prev_close = self._get_prev_close(code, target_date)
        
        return quotes
    
    def _fetch_and_store_quotes(
        self,
        codes: List[str],
        target_date: str,
    ) -> Dict[str, DailyQuote]:
        """
        从数据源拉取行情并存储到数据库
        
        Args:
            codes: 股票代码列表
            target_date: 目标交易日
        
        Returns:
            Dict[code, DailyQuote]
        """
        quotes: Dict[str, DailyQuote] = {}
        
        try:
            from data_provider.base import DataFetcherManager
            
            manager = DataFetcherManager()
            date_obj = datetime.strptime(target_date, "%Y%m%d").date()
            
            for code in codes:
                try:
                    df, source = manager.get_daily_data(code, days=1)
                    
                    if df is None or df.empty:
                        logger.warning(f"[收盘行情] 无法获取 {code} 行情数据")
                        continue
                    
                    row = df.iloc[-1]
                    quote = DailyQuote(
                        date=date_obj.strftime("%Y-%m-%d"),
                        close=float(row.get("close", 0)),
                        open=float(row.get("open", 0)) if row.get("open") else None,
                        high=float(row.get("high", 0)) if row.get("high") else None,
                        low=float(row.get("low", 0)) if row.get("low") else None,
                        volume=int(row.get("volume", 0)) if row.get("volume") else None,
                        amount=float(row.get("amount", 0)) if row.get("amount") else None,
                        pct_chg=float(row.get("pct_chg", 0)) if row.get("pct_chg") else None,
                        prev_close=None,
                    )
                    quotes[code] = quote
                    
                    self._store_quote(code, date_obj, row, source)
                    
                except Exception as e:
                    logger.warning(f"[收盘行情] 获取 {code} 行情失败: {e}")
                    continue
        except ImportError:
            logger.warning("[收盘行情] DataFetcherManager 未找到")
        except Exception as e:
            logger.error(f"[收盘行情] 批量获取行情失败: {e}")
        
        return quotes
    
    def _store_quote(
        self,
        code: str,
        date_obj: date,
        row: Any,
        source: str,
    ) -> bool:
        """存储行情到数据库"""
        try:
            from src.storage import DatabaseManager, StockDaily
            from sqlalchemy import select, and_
            
            db = DatabaseManager.get_instance()
            with db.get_session() as session:
                existing = session.execute(
                    select(StockDaily).where(
                        and_(StockDaily.code == code, StockDaily.date == date_obj)
                    )
                ).scalar_one_or_none()
                
                if existing:
                    return True
                
                record = StockDaily(
                    code=code,
                    date=date_obj,
                    open=float(row.get("open", 0)) if row.get("open") else None,
                    high=float(row.get("high", 0)) if row.get("high") else None,
                    low=float(row.get("low", 0)) if row.get("low") else None,
                    close=float(row.get("close", 0)),
                    volume=float(row.get("volume", 0)) if row.get("volume") else None,
                    amount=float(row.get("amount", 0)) if row.get("amount") else None,
                    pct_chg=float(row.get("pct_chg", 0)) if row.get("pct_chg") else None,
                    data_source=source,
                )
                session.add(record)
                session.commit()
                logger.debug(f"[收盘行情] 已存储 {code} {date_obj} 行情")
                return True
        except Exception as e:
            logger.warning(f"[收盘行情] 存储 {code} 行情失败: {e}")
            return False
    
    def _get_prev_close(self, code: str, target_date: str) -> Optional[float]:
        """获取前一日收盘价"""
        try:
            from src.storage import DatabaseManager, StockDaily
            from sqlalchemy import select, desc, and_
            
            date_obj = datetime.strptime(target_date, "%Y%m%d").date()
            
            db = DatabaseManager.get_instance()
            with db.get_session() as session:
                result = session.execute(
                    select(StockDaily.close)
                    .where(
                        and_(
                            StockDaily.code == code,
                            StockDaily.date < date_obj
                        )
                    )
                    .order_by(desc(StockDaily.date))
                    .limit(1)
                ).scalar_one_or_none()
                
                return float(result) if result else None
        except Exception:
            return None
