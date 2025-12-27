import { supabase } from "@/integrations/supabase/client";
import type { Stock, TimeSeriesPoint, NewsItem } from "@/types/stock";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function fetchStockQuote(symbol: string): Promise<Stock | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stock-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'quote',
        symbol: symbol,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch quote');
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return {
      symbol: data.symbol,
      name: data.name,
      price: parseFloat(data.close) || 0,
      change: parseFloat(data.change) || 0,
      changePercent: parseFloat(data.percent_change) || 0,
      volume: parseInt(data.volume) || 0,
      previousClose: parseFloat(data.previous_close) || 0,
      open: parseFloat(data.open) || 0,
      high: parseFloat(data.high) || 0,
      low: parseFloat(data.low) || 0,
      currency: data.currency || 'INR',
      marketCap: data.market_cap,
      fiftyTwoWeekHigh: data.fifty_two_week?.high,
      fiftyTwoWeekLow: data.fifty_two_week?.low,
    };
  } catch (error) {
    console.error('Error fetching stock quote:', error);
    return null;
  }
}

export async function fetchBatchQuotes(symbols: string[]): Promise<Stock[]> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stock-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'batch_quote',
        symbols: symbols.join(','),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch batch quotes');
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return (Array.isArray(data) ? data : []).map((item: any) => ({
      symbol: item.symbol,
      name: item.name,
      price: parseFloat(item.close) || 0,
      change: parseFloat(item.change) || 0,
      changePercent: parseFloat(item.percent_change) || 0,
      volume: parseInt(item.volume) || 0,
      previousClose: parseFloat(item.previous_close) || 0,
      open: parseFloat(item.open) || 0,
      high: parseFloat(item.high) || 0,
      low: parseFloat(item.low) || 0,
      currency: item.currency || 'INR',
    }));
  } catch (error) {
    console.error('Error fetching batch quotes:', error);
    return [];
  }
}

export async function fetchTimeSeries(
  symbol: string,
  interval: string = '1day',
  outputsize: number = 100
): Promise<TimeSeriesPoint[]> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stock-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'time_series',
        symbol: symbol,
        interval,
        outputsize,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch time series');
    }

    const data = await response.json();
    
    if (data.error || !data.values) {
      return [];
    }

    return data.values.map((point: any) => ({
      datetime: point.datetime,
      open: parseFloat(point.open),
      high: parseFloat(point.high),
      low: parseFloat(point.low),
      close: parseFloat(point.close),
      volume: parseInt(point.volume),
    })).reverse(); // Reverse to get chronological order
  } catch (error) {
    console.error('Error fetching time series:', error);
    return [];
  }
}

export async function searchSymbols(query: string): Promise<Array<{symbol: string; name: string; type: string; exchange: string}>> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stock-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'search',
        symbol: query,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to search symbols');
    }

    const data = await response.json();
    
    if (data.error || !data.data) {
      return [];
    }

    return data.data.slice(0, 15).map((item: any) => ({
      symbol: item.symbol,
      name: item.instrument_name,
      type: item.instrument_type,
      exchange: item.exchange,
    }));
  } catch (error) {
    console.error('Error searching symbols:', error);
    return [];
  }
}

export async function fetchNews(symbol?: string): Promise<NewsItem[]> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stock-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'news',
        symbol: symbol,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch news');
    }

    const data = await response.json();
    
    if (data.error) {
      console.error('News API error:', data.error);
      return [];
    }

    return data;
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

// Default Indian stocks to track
export const DEFAULT_STOCKS = [
  'INFY',
  'HDFCBANK', 
  'TCS',
  'RELIANCE',
  'ICICIBANK',
  'WIPRO',
  'SBIN',
  'BHARTIARTL',
];

// Commodities with INR pricing
export const COMMODITIES = [
  'XAU/INR', // Gold in INR
  'XAG/INR', // Silver in INR
];
