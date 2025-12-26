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

export type PredictionPeriod = '1d' | '5d' | '1m' | '3m' | '6m';

export interface MarketStatus {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  nextOpenIn?: string;
  market: string;
}
