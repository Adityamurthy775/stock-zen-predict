import { useState, useEffect, useCallback } from 'react';
import { fetchStockQuote, fetchTimeSeries, fetchNews, DEFAULT_STOCKS } from '@/services/stockService';
import { generateMockPrediction, getMockModelMetrics, generatePredictionLine } from '@/services/predictionService';
import { useMarketStatus } from '@/hooks/useMarketStatus';
import type { Stock, TimeSeriesPoint, Prediction, ModelMetrics, NewsItem, PredictionPeriod } from '@/types/stock';

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
  
  const marketStatus = useMarketStatus();

  // Fetch all tracked stocks
  const fetchAllStocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const allSymbols = [...DEFAULT_STOCKS];
      const stockPromises = allSymbols.map(symbol => fetchStockQuote(symbol));
      const results = await Promise.all(stockPromises);
      
      const validStocks = results.filter((stock): stock is Stock => stock !== null);
      setStocks(validStocks);
      
      // Select first stock by default
      if (validStocks.length > 0 && !selectedStock) {
        setSelectedStock(validStocks[0]);
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
  };
}
