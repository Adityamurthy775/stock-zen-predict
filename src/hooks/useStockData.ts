import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchStockQuote, fetchTimeSeries, fetchNews, DEFAULT_STOCKS } from '@/services/stockService';
import { generateMockPrediction, getMockModelMetrics, generatePredictionLine, runBacktest } from '@/services/predictionService';
import { useMarketStatus } from '@/hooks/useMarketStatus';
import { cacheTimeSeriesData, getCachedTimeSeriesData, isOffline } from '@/utils/offlinePrediction';
import { showPriceAlertNotification, initializeNotifications, getNotificationPermission } from '@/utils/pushNotifications';
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
  const [stocksLoading, setStocksLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Track which alerts have triggered notifications
  const notifiedAlertsRef = useRef<Set<string>>(new Set());
  
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

  // Initialize push notifications on mount
  useEffect(() => {
    initializeNotifications();
  }, []);

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

  // Check alerts (both price and deviation) and send push notifications
  useEffect(() => {
    if (stocks.length > 0 && alerts.length > 0) {
      setAlerts(prev => prev.map(alert => {
        const stock = stocks.find(s => s.symbol === alert.symbol);
        if (!stock || !alert.isActive || alert.triggered) return alert;
        
        let triggered = false;
        
        if (alert.type === 'deviation' && alert.predictedPrice && alert.deviationThreshold) {
          // Deviation alert: check if actual price deviates from predicted
          const deviationPercent = Math.abs((stock.price - alert.predictedPrice) / alert.predictedPrice) * 100;
          triggered = deviationPercent >= alert.deviationThreshold;
        } else {
          // Price alert: check if price crossed target
          triggered = alert.condition === 'above' 
            ? stock.price >= alert.targetPrice
            : stock.price <= alert.targetPrice;
        }
        
        // Send push notification for newly triggered alerts
        if (triggered && !notifiedAlertsRef.current.has(alert.id)) {
          notifiedAlertsRef.current.add(alert.id);
          showPriceAlertNotification(
            alert.symbol,
            alert.type,
            stock.price,
            alert.type === 'deviation' ? (alert.predictedPrice || 0) : alert.targetPrice,
            alert.condition,
            alert.currency
          );
        }
        
        return { ...alert, currentPrice: stock.price, triggered };
      }));
    }
  }, [stocks]);

  // Fetch all tracked stocks - parallel for speed
  const fetchAllStocks = useCallback(async () => {
    setLoading(true);
    setStocksLoading(true);
    setLoadingMessage('Loading stocks...');
    setError(null);

    try {
      const allSymbols = [...DEFAULT_STOCKS];

      // Fetch all stocks in parallel for faster loading
      const fetchPromises = allSymbols.map(sym => fetchStockQuote(sym));
      const results = await Promise.all(fetchPromises);
      const validResults = results.filter((quote): quote is Stock => quote !== null);

      setStocks(validResults);

      // Select first stock by default only on initial load
      setSelectedStock(prev => {
        if (prev === null && validResults.length > 0) {
          return validResults[0];
        }
        // Update selected stock with fresh data if it exists
        if (prev) {
          const updated = validResults.find(s => s.symbol === prev.symbol);
          return updated || prev;
        }
        return prev;
      });
    } catch (err) {
      setError('Failed to fetch stock data');
      console.error(err);
    } finally {
      setLoading(false);
      setStocksLoading(false);
      setLoadingMessage('');
    }
  }, []);

  // Fetch time series for selected stock (with caching for offline support)
  const fetchSelectedStockData = useCallback(async () => {
    if (!selectedStock) return;
    
    try {
      let series: TimeSeriesPoint[];
      
      // Check if we're offline and have cached data
      if (isOffline()) {
        const cached = getCachedTimeSeriesData(selectedStock.symbol);
        if (cached) {
          series = cached;
          console.log('Using cached data (offline mode)');
        } else {
          console.warn('No cached data available offline');
          return;
        }
      } else {
        series = await fetchTimeSeries(selectedStock.symbol, '1day', 60);
        // Cache the data for offline use
        cacheTimeSeriesData(selectedStock.symbol, series);
      }
      
      setTimeSeries(series);
      
      // Generate prediction with real data (works offline with cached data)
      const pred = await generateMockPrediction(
        selectedStock.symbol,
        selectedStock.price,
        predictionPeriod,
        series // Pass real time series data for data-driven predictions
      );
      setPrediction(pred);
      
      if (marketStatus.isOpen || isOffline()) {
        // Generate prediction line for chart
        if (series.length > 0) {
          const lastPoint = series[series.length - 1];
          const predLine = generatePredictionLine(lastPoint, pred, predictionPeriod);
          setPredictionLine(predLine);
        }
      } else {
        setPredictionLine([]); // No prediction line on chart when market is closed
      }
      
      // Fetch real news from Finnhub - skip if offline
      if (!isOffline()) {
        try {
          let newsData = await fetchNews(selectedStock.symbol);
          if (!newsData || newsData.length === 0) {
            // Fallback to general market news
            newsData = await fetchNews();
          }
          setNews(newsData);
        } catch (err) {
          console.error('Error fetching news:', err);
          setNews([]);
        }
      }
      
      // Get model metrics with backtest results
      const backtestResult = series.length >= 30 ? runBacktest(series, predictionPeriod) : undefined;
      setModelMetrics(getMockModelMetrics(backtestResult));
    } catch (err) {
      console.error('Error fetching stock details:', err);
      
      // Try to use cached data on error
      const cached = getCachedTimeSeriesData(selectedStock.symbol);
      if (cached) {
        setTimeSeries(cached);
        console.log('Using cached data after fetch error');
      }
    }
  }, [selectedStock, predictionPeriod, marketStatus.isOpen]);

  // Select a stock
  const selectStock = useCallback((stock: Stock) => {
    setSelectedStock(stock);
  }, []);

  // Add a new stock to tracking - optimized for instant feedback
  const addStock = useCallback(async (symbol: string) => {
    // Check if already added
    if (stocks.some(s => s.symbol.toUpperCase() === symbol.toUpperCase())) {
      const existing = stocks.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());
      if (existing) setSelectedStock(existing);
      return;
    }

    // Show brief loading
    setStocksLoading(true);
    setLoadingMessage(`Adding ${symbol}...`);

    // Fetch data (uses cache if available)
    const quote = await fetchStockQuote(symbol);
    if (quote) {
      setStocks(prev => [...prev, quote]);
      setSelectedStock(quote);
    }
    
    setStocksLoading(false);
    setLoadingMessage('');
  }, [stocks]);

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
    stocksLoading,
    loadingMessage,
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
