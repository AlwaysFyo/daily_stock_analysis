# -*- coding: utf-8 -*-
"""
测试交易日历服务
"""

import pytest
from datetime import date, datetime
from unittest.mock import patch, MagicMock


class TestTradingCalendarService:
    """测试 TradingCalendarService"""
    
    @pytest.fixture
    def service(self):
        from src.services.trading_calendar_service import TradingCalendarService
        TradingCalendarService._instance = None
        TradingCalendarService._trade_dates_cache = None
        TradingCalendarService._cache_timestamp = 0
        return TradingCalendarService()
    
    def test_singleton_pattern(self, service):
        """测试单例模式"""
        from src.services.trading_calendar_service import TradingCalendarService
        service2 = TradingCalendarService.get_instance()
        assert service is service2
    
    def test_get_china_now(self, service):
        """测试获取中国时区当前时间"""
        now = service._get_china_now()
        assert now is not None
        assert now.tzinfo is not None
    
    def test_get_trade_dates_simple(self, service):
        """测试简单规则获取交易日"""
        dates = service._get_trade_dates_simple()
        assert len(dates) > 0
        assert all(len(d) == 8 for d in dates)
    
    @patch('src.services.trading_calendar_service.TradingCalendarService._get_trade_dates_from_akshare')
    def test_get_trade_dates_fallback_to_simple(self, mock_akshare, service):
        """测试交易日历降级到简单规则"""
        mock_akshare.return_value = None
        
        with patch.object(service, '_get_trade_dates_from_tushare', return_value=None):
            dates = service.get_trade_dates()
            assert len(dates) > 0
    
    def test_is_trading_day_with_known_date(self, service):
        """测试已知交易日判断"""
        with patch.object(service, 'get_trade_dates', return_value=['20260327', '20260326', '20260325']):
            assert service.is_trading_day(date(2026, 3, 27)) is True
            assert service.is_trading_day(date(2026, 3, 28)) is False
    
    def test_get_target_trading_date_non_trading_day(self, service):
        """测试非交易日返回最近交易日"""
        with patch.object(service, '_get_china_now') as mock_now:
            mock_now.return_value = datetime(2026, 3, 28, 10, 0)
            with patch.object(service, 'get_trade_dates', return_value=['20260327', '20260326', '20260325']):
                result = service.get_target_trading_date()
                assert result == '20260327'
    
    def test_get_target_trading_date_before_close(self, service):
        """测试收盘前返回上一交易日"""
        with patch.object(service, '_get_china_now') as mock_now:
            mock_now.return_value = datetime(2026, 3, 27, 10, 0)
            with patch.object(service, 'get_trade_dates', return_value=['20260327', '20260326', '20260325']):
                result = service.get_target_trading_date()
                assert result == '20260326'
    
    def test_get_target_trading_date_after_close(self, service):
        """测试收盘后返回当日"""
        with patch.object(service, '_get_china_now') as mock_now:
            mock_now.return_value = datetime(2026, 3, 27, 16, 0)
            with patch.object(service, 'get_trade_dates', return_value=['20260327', '20260326', '20260325']):
                result = service.get_target_trading_date()
                assert result == '20260327'
    
    def test_get_target_trading_date_for_codes_with_db_fallback(self, service):
        """测试数据库降级"""
        with patch.object(service, 'get_target_trading_date', return_value=None):
            with patch.object(service, '_get_trade_dates_from_db', return_value='20260320'):
                result = service.get_target_trading_date_for_codes(['600519'])
                assert result == '20260320'


class TestStockQuoteService:
    """测试 StockQuoteService"""
    
    @pytest.fixture
    def service(self):
        from src.services.stock_quote_service import StockQuoteService
        StockQuoteService._instance = None
        return StockQuoteService()
    
    def test_singleton_pattern(self, service):
        """测试单例模式"""
        from src.services.stock_quote_service import StockQuoteService
        service2 = StockQuoteService.get_instance()
        assert service is service2
    
    def test_daily_quote_dataclass(self):
        """测试 DailyQuote 数据类"""
        from src.services.stock_quote_service import DailyQuote
        
        quote = DailyQuote(
            date='2026-03-27',
            close=1523.60,
            open=1510.00,
            high=1530.00,
            low=1505.00,
            volume=2850000,
            amount=4325000000,
            pct_chg=1.25,
            prev_close=1504.80
        )
        
        assert quote.date == '2026-03-27'
        assert quote.close == 1523.60
        assert quote.pct_chg == 1.25
        
        quote_dict = quote.to_dict()
        assert quote_dict['date'] == '2026-03-27'
        assert quote_dict['close'] == 1523.60
    
    def test_get_daily_quotes_empty_codes(self, service):
        """测试空代码列表"""
        result = service.get_daily_quotes([], '20260327')
        assert result == {}
    
    def test_get_daily_quotes_empty_date(self, service):
        """测试空日期"""
        result = service.get_daily_quotes(['600519'], '')
        assert result == {}
    
    def test_get_daily_quotes_no_data(self, service):
        """测试数据库无数据时的处理"""
        result = service.get_daily_quotes(['NONEXIST'], '20260327')
        assert 'NONEXIST' not in result


class TestStockInfoItemSchema:
    """测试 StockInfoItem Schema"""
    
    def test_daily_quote_schema(self):
        """测试 DailyQuote Schema"""
        from api.v1.schemas.stocks import DailyQuote
        
        quote = DailyQuote(
            date='2026-03-27',
            close=1523.60,
            open=1510.00,
            high=1530.00,
            low=1505.00,
            volume=2850000,
            amount=4325000000.0,
            pct_chg=1.25,
            prev_close=1504.80
        )
        
        assert quote.date == '2026-03-27'
        assert quote.close == 1523.60
    
    def test_analysis_summary_schema(self):
        """测试 AnalysisSummary Schema"""
        from api.v1.schemas.stocks import AnalysisSummary
        
        summary = AnalysisSummary(
            score=85,
            advice='买入',
            trend='震荡上行',
            analysis_id=12345,
            analyzed_at='2026-03-27T10:30:00'
        )
        
        assert summary.score == 85
        assert summary.advice == '买入'
        assert summary.trend == '震荡上行'
    
    def test_stock_info_item_with_quote_and_analysis(self):
        """测试 StockInfoItem 包含行情和分析"""
        from api.v1.schemas.stocks import StockInfoItem, DailyQuote, AnalysisSummary
        
        item = StockInfoItem(
            code='600519',
            name='贵州茅台',
            stock_type='stock',
            status='watchlist',
            market='cn',
            industry='白酒',
            sector='消费',
            created_at='2026-01-01T00:00:00',
            updated_at='2026-03-27T10:00:00',
            quote=DailyQuote(
                date='2026-03-27',
                close=1523.60,
                pct_chg=1.25
            ),
            analysis=AnalysisSummary(
                score=85,
                advice='买入',
                trend='震荡上行',
                analysis_id=12345,
                analyzed_at='2026-03-27T10:30:00'
            )
        )
        
        assert item.code == '600519'
        assert item.quote is not None
        assert item.quote.close == 1523.60
        assert item.analysis is not None
        assert item.analysis.score == 85
    
    def test_stock_info_list_response_with_target_date(self):
        """测试 StockInfoListResponse 包含 targetDate"""
        from api.v1.schemas.stocks import StockInfoListResponse, StockInfoItem
        
        response = StockInfoListResponse(
            items=[
                StockInfoItem(
                    code='600519',
                    name='贵州茅台',
                    stock_type='stock',
                    status='watchlist'
                )
            ],
            total=1,
            target_date='2026-03-27'
        )
        
        assert response.total == 1
        assert response.target_date == '2026-03-27'
