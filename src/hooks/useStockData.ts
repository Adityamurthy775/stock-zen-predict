import { useState, useEffect, useCallback } from 'react';
import { fetchStockQuote, fetchTimeSeries, fetchNews, DEFAULT_STOCKS } from '@/services/stockService';
import { generateMockPrediction, getMockModelMetrics, generatePredictionLine } from '@/services/predictionService';
import { useMarketStatus } from '@/hooks/useMarketStatus';
import type { Stock, TimeSeriesPoint, Prediction, ModelMetrics, NewsItem, PredictionPeriod } from '@/types/stock';
import type { PortfolioItem } from '@/components/Portfolio';
import type { PriceAlert } from '@/components/Alerts';

export function useStockData() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [predictionPeriod, setPredictionPeriod] = useState<PredictionPeriod>('1d');
  const [predictionLine, setPredictionLine] = useState<Array<{ datetime: string; predicted: number }>>([]);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Portfolio state
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => {
    const saved = localStorage.getItem('stockPortfolio');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Alerts state
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    const saved = localStorage.getItem('stockAlerts');
    return saved ? JSON.parse(saved) : [];
  });
  
  const marketStatus = useMarketStatus();

  // Save portfolio to localStorage
  useEffect(() => {
    localStorage.setItem('stockPortfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  // Save alerts to localStorage
  useEffect(() => {
    localStorage.setItem('stockAlerts', JSON.stringify(alerts));
  }, [alerts]);

  // Update portfolio current prices
  useEffect(() => {
    if (stocks.length > 0 && portfolio.length > 0) {
      setPortfolio(prev => prev.map(item => {
        const stock = stocks.find(s => s.symbol === item.symbol);
        return stock ? { ...item, currentPrice: stock.price } : item;
      }));
    }
  }, [stocks]);

  // Check alerts
  useEffect(() => {
    if (stocks.length > 0 && alerts.length > 0) {
      setAlerts(prev => prev.map(alert => {
        const stock = stocks.find(s => s.symbol === alert.symbol);
        if (!stock || !alert.isActive || alert.triggered) return alert;
        
        const triggered = alert.condition === 'above' 
          ? stock.price >= alert.targetPrice
          : stock.price <= alert.targetPrice;
        
        return { ...alert, currentPrice: stock.price, triggered };
      }));
    }
  }, [stocks]);

  // Fetch all tracked stocks
  const fetchAllStocks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const allSymbols = [...DEFAULT_STOCKS];

      // Reduce API usage by fetching sequentially (prevents provider rate-limit bursts)
      const results: Stock[] = [];
      for (const sym of allSymbols) {
        const quote = await fetchStockQuote(sym);
        if (quote) results.push(quote);
      }

      setStocks(results);

      // Select first stock by default
      if (results.length > 0 && !selectedStock) {
        setSelectedStock(results[0]);
      }
    } catch (err) {
      setError('Failed to fetch stock data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedStock]);

  // Fetch time series for selected stock
  const fetchSelectedStockData = useCallback(async () => {
    if (!selectedStock) return;
    
    try {
      const series = await fetchTimeSeries(selectedStock.symbol, '1day', 60);
      setTimeSeries(series);
      
      // Generate prediction only if market is open
      if (marketStatus.isOpen) {
        const pred = generateMockPrediction(
          selectedStock.symbol,
          selectedStock.price,
          predictionPeriod
        );
        setPrediction(pred);
        
        // Generate prediction line for chart
        if (series.length > 0) {
          const lastPoint = series[series.length - 1];
          const predLine = generatePredictionLine(lastPoint, pred, predictionPeriod);
          setPredictionLine(predLine);
        }
      } else {
        // Market closed - show prediction panel but not on chart
        const pred = generateMockPrediction(
          selectedStock.symbol,
          selectedStock.price,
          predictionPeriod
        );
        setPrediction(pred);
        setPredictionLine([]); // No prediction line on chart when market is closed
      }
      
      // Fetch real news from Finnhub
      const newsData = await fetchNews(selectedStock.symbol);
      setNews(newsData);
      
      // Get model metrics
      setModelMetrics(getMockModelMetrics());
    } catch (err) {
      console.error('Error fetching stock details:', err);
    }
  }, [selectedStock, predictionPeriod, marketStatus.isOpen]);

  // Select a stock
  const selectStock = useCallback((stock: Stock) => {
    setSelectedStock(stock);
  }, []);

  // Add a new stock to tracking
  const addStock = useCallback(async (symbol: string) => {
    const quote = await fetchStockQuote(symbol);
    if (quote) {
      setStocks(prev => {
        // Check if already exists
        if (prev.some(s => s.symbol === quote.symbol)) {
          return prev;
        }
        return [...prev, quote];
      });
    }
  }, []);

  // Remove a stock from tracking
  const removeStock = useCallback((symbol: string) => {
    setStocks(prev => prev.filter(s => s.symbol !== symbol));
    if (selectedStock?.symbol === symbol) {
      setSelectedStock(stocks.find(s => s.symbol !== symbol) || null);
    }
  }, [selectedStock, stocks]);

  // Update prediction period
  const changePredictionPeriod = useCallback((period: PredictionPeriod) => {
    setPredictionPeriod(period);
  }, []);

  // Portfolio management
  const addToPortfolio = useCallback((item: Omit<PortfolioItem, 'currentPrice'>) => {
    const stock = stocks.find(s => s.symbol === item.symbol);
    setPortfolio(prev => [
      ...prev,
      { ...item, currentPrice: stock?.price || item.buyPrice }
    ]);
  }, [stocks]);

  const removeFromPortfolio = useCallback((symbol: string) => {
    setPortfolio(prev => prev.filter(item => item.symbol !== symbol));
  }, []);

  // Alerts management
  const addAlert = useCallback((alert: Omit<PriceAlert, 'id' | 'currentPrice' | 'triggered'>) => {
    const stock = stocks.find(s => s.symbol === alert.symbol);
    setAlerts(prev => [
      ...prev,
      {
        ...alert,
        id: `alert-${Date.now()}`,
        currentPrice: stock?.price || 0,
        triggered: false,
      }
    ]);
  }, [stocks]);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  const toggleAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, isActive: !alert.isActive } : alert
    ));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAllStocks();
  }, [fetchAllStocks]);

  // Fetch data when selected stock changes
  useEffect(() => {
    fetchSelectedStockData();
  }, [fetchSelectedStockData]);

  // Refresh data periodically (every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllStocks();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [fetchAllStocks]);

  return {
    stocks,
    selectedStock,
    timeSeries,
    prediction,
    predictionPeriod,
    predictionLine,
    modelMetrics,
    news,
    loading,
    error,
    marketStatus,
    selectStock,
    addStock,
    removeStock,
    changePredictionPeriod,
    refreshData: fetchAllStocks,
    // Portfolio
    portfolio,
    addToPortfolio,
    removeFromPortfolio,
    // Alerts
    alerts,
    addAlert,
    removeAlert,
    toggleAlert,
  };
}
