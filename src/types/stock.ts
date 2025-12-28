// Stock and prediction types for the application

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  currency: string;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export interface TimeSeriesPoint {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Prediction {
  targetDate: string;
  predictedPrice: number;
  currentPrice: number;
  priceChange: number;
  changePercent: number;
  confidence: number;
  lowerBound: number;
  upperBound: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface ModelMetrics {
  name: string;
  description: string;
  accuracy: number;
  mse: number;
  mae: number;
  r2Score: number;
  lastTrained: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: 'earnings' | 'products' | 'market' | 'analyst';
  sentiment: 'positive' | 'negative' | 'neutral';
  publishedAt: string;
  url: string;
  image?: string | null;
}

// Updated prediction periods: 1 day, 5 days, half month (15 days), quarterly (90 days)
export type PredictionPeriod = '1d' | '5d' | '15d' | '3m';

export interface MarketStatus {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  nextOpenIn?: string;
  market: string;
}
