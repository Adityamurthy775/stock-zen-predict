// Offline prediction model using technical analysis
// Works without external API calls

import type { TimeSeriesPoint } from '@/types/stock';

export interface OfflinePrediction {
  date: string;
  predictedClose: number;
  confidence: number;
  reasoning: string;
  indicators: {
    rsi: number;
    macd: number;
    sma5: number;
    sma20: number;
    bollingerPosition: number;
    momentum: number;
  };
}

// Cache for storing time series data
const dataCache = new Map<string, { data: TimeSeriesPoint[]; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function cacheTimeSeriesData(symbol: string, data: TimeSeriesPoint[]) {
  dataCache.set(symbol, { data, timestamp: Date.now() });
  // Also persist to localStorage for true offline support
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`stock_cache_${symbol}`, JSON.stringify(cacheData));
  } catch (e) {
    console.warn('Failed to cache to localStorage:', e);
  }
}

export function getCachedTimeSeriesData(symbol: string): TimeSeriesPoint[] | null {
  // Try memory cache first
  const cached = dataCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  // Try localStorage
  try {
    const stored = localStorage.getItem(`stock_cache_${symbol}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        dataCache.set(symbol, parsed);
        return parsed.data;
      }
    }
  } catch (e) {
    console.warn('Failed to read from localStorage:', e);
  }
  
  return null;
}

// Calculate RSI
function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
}

// Calculate EMA
function calculateEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  
  const k = 2 / (period + 1);
  const result: number[] = [data[0]];
  
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  
  return result;
}

// Calculate SMA
function calculateSMA(data: number[], period: number): number {
  if (data.length < period) {
    return data.reduce((a, b) => a + b, 0) / data.length;
  }
  return data.slice(0, period).reduce((a, b) => a + b, 0) / period;
}

// Calculate Bollinger Band position (0-1, 0 = lower band, 1 = upper band)
function calculateBollingerPosition(closes: number[], period = 20): number {
  if (closes.length < period) return 0.5;
  
  const slice = closes.slice(0, period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  const upper = mean + 2 * stdDev;
  const lower = mean - 2 * stdDev;
  
  if (upper === lower) return 0.5;
  return (closes[0] - lower) / (upper - lower);
}

// Generate offline predictions
export function generateOfflinePredictions(
  timeSeries: TimeSeriesPoint[],
  symbol: string,
  days: number = 14
): OfflinePrediction[] {
  if (!timeSeries || timeSeries.length < 10) {
    return [];
  }
  
  const closes = timeSeries.map(p => p.close);
  const predictions: OfflinePrediction[] = [];
  
  // Calculate base indicators
  const rsi = calculateRSI(closes);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd = ema12.length > 0 && ema26.length > 0 ? ema12[0] - ema26[0] : 0;
  const sma5 = calculateSMA(closes, 5);
  const sma20 = calculateSMA(closes, 20);
  const bollingerPosition = calculateBollingerPosition(closes);
  
  // Calculate momentum (5-day price change percentage)
  const momentum = closes.length >= 5 
    ? ((closes[0] - closes[4]) / closes[4]) * 100 
    : 0;
  
  // Calculate average volatility
  const volatility = calculateVolatility(closes);
  
  // Get the last date
  const lastDate = new Date(timeSeries[0].datetime);
  let currentPrice = closes[0];
  
  for (let i = 1; i <= days; i++) {
    const predictionDate = new Date(lastDate);
    predictionDate.setDate(predictionDate.getDate() + i);
    
    // Skip weekends
    const dayOfWeek = predictionDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }
    
    // Calculate prediction bias based on indicators
    let bias = 0;
    let confidence = 60;
    const reasons: string[] = [];
    
    // RSI signals
    if (rsi < 30) {
      bias += 0.015;
      confidence += 8;
      reasons.push('Oversold RSI indicates potential bounce');
    } else if (rsi > 70) {
      bias -= 0.015;
      confidence += 8;
      reasons.push('Overbought RSI suggests pullback');
    } else {
      reasons.push('RSI in neutral zone');
    }
    
    // MACD signals
    if (macd > 0) {
      bias += 0.008;
      confidence += 5;
      reasons.push('Positive MACD momentum');
    } else if (macd < 0) {
      bias -= 0.008;
      confidence += 5;
      reasons.push('Negative MACD momentum');
    }
    
    // Moving average crossover
    if (sma5 > sma20) {
      bias += 0.005;
      confidence += 3;
      reasons.push('Bullish SMA crossover');
    } else {
      bias -= 0.005;
      confidence += 3;
      reasons.push('Bearish SMA crossover');
    }
    
    // Bollinger Band mean reversion
    if (bollingerPosition < 0.2) {
      bias += 0.012;
      confidence += 6;
      reasons.push('Price near lower Bollinger Band');
    } else if (bollingerPosition > 0.8) {
      bias -= 0.012;
      confidence += 6;
      reasons.push('Price near upper Bollinger Band');
    }
    
    // Momentum factor (with decay over prediction horizon)
    const decayFactor = Math.pow(0.9, i);
    bias += (momentum * 0.001) * decayFactor;
    
    // Add some controlled randomness for realistic variation
    const randomFactor = (Math.random() - 0.5) * volatility * 0.3;
    
    // Calculate predicted price
    const predictedPrice = currentPrice * (1 + bias + randomFactor);
    
    // Reduce confidence for further out predictions
    confidence = Math.max(40, confidence - (i * 2));
    confidence = Math.min(90, confidence);
    
    predictions.push({
      date: predictionDate.toISOString().split('T')[0],
      predictedClose: Math.round(predictedPrice * 100) / 100,
      confidence: Math.round(confidence),
      reasoning: reasons.slice(0, 2).join('. '),
      indicators: {
        rsi: Math.round(rsi * 10) / 10,
        macd: Math.round(macd * 100) / 100,
        sma5: Math.round(sma5 * 100) / 100,
        sma20: Math.round(sma20 * 100) / 100,
        bollingerPosition: Math.round(bollingerPosition * 100) / 100,
        momentum: Math.round(momentum * 100) / 100,
      },
    });
    
    // Use predicted price for next day's calculation
    currentPrice = predictedPrice;
  }
  
  return predictions;
}

// Calculate historical volatility
function calculateVolatility(closes: number[]): number {
  if (closes.length < 2) return 0.02;
  
  const returns: number[] = [];
  for (let i = 0; i < closes.length - 1; i++) {
    returns.push((closes[i] - closes[i + 1]) / closes[i + 1]);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance);
}

// Check if we're offline
export function isOffline(): boolean {
  return !navigator.onLine;
}
