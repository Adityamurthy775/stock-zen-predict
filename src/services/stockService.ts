import { supabase } from "@/integrations/supabase/client";
import type { Stock, TimeSeriesPoint } from "@/types/stock";

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
        symbol: symbol.toUpperCase(),
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
      price: parseFloat(data.close),
      change: parseFloat(data.change),
      changePercent: parseFloat(data.percent_change),
      volume: parseInt(data.volume),
      previousClose: parseFloat(data.previous_close),
      open: parseFloat(data.open),
      high: parseFloat(data.high),
      low: parseFloat(data.low),
      currency: data.currency || 'USD',
    };
  } catch (error) {
    console.error('Error fetching stock quote:', error);
    return null;
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
        symbol: symbol.toUpperCase(),
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

    return data.data.slice(0, 10).map((item: any) => ({
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

// Default stocks to track
export const DEFAULT_STOCKS = [
  'AAPL',
  'GOOGL', 
  'MSFT',
  'TSLA',
  'AMZN',
  'NVDA',
  'META',
  'NFLX',
];

// Commodities
export const COMMODITIES = [
  'XAU/USD', // Gold
  'XAG/USD', // Silver
];
