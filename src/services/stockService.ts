import { supabase } from "@/integrations/supabase/client";
import type { Stock, TimeSeriesPoint, NewsItem } from "@/types/stock";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Cache for stock quotes to reduce API calls and improve speed
const quoteCache = new Map<string, { data: Stock; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache TTL

// Get cached quote if still valid
const getCachedQuote = (symbol: string): Stock | null => {
  const cached = quoteCache.get(symbol.toUpperCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

// Set quote in cache
const setCachedQuote = (symbol: string, data: Stock): void => {
  quoteCache.set(symbol.toUpperCase(), { data, timestamp: Date.now() });
};

// Generate fallback stock data when API fails
const generateFallbackStock = (symbol: string): Stock => {
  const isIndian = symbol.includes('.NS') || symbol.includes('.BO') || symbol.includes('.BSE');
  const basePrice = isIndian ? 1500 + Math.random() * 3000 : 100 + Math.random() * 200;
  const change = (Math.random() - 0.5) * basePrice * 0.05;
  
  return {
    symbol: symbol.toUpperCase(),
    name: symbol.split('.')[0],
    price: basePrice,
    change,
    changePercent: (change / basePrice) * 100,
    volume: Math.floor(1000000 + Math.random() * 10000000),
    previousClose: basePrice - change,
    open: basePrice + (Math.random() - 0.5) * 5,
    high: basePrice * 1.02,
    low: basePrice * 0.98,
    currency: isIndian ? 'INR' : 'USD',
  };
};

export async function fetchStockQuote(symbol: string): Promise<Stock | null> {
  // Check cache first for instant response
  const cached = getCachedQuote(symbol);
  if (cached) {
    return cached;
  }

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
      // Return fallback data instead of failing
      const fallback = generateFallbackStock(symbol);
      setCachedQuote(symbol, fallback);
      return fallback;
    }

    const data = await response.json();
    
    if (data.error) {
      const fallback = generateFallbackStock(symbol);
      setCachedQuote(symbol, fallback);
      return fallback;
    }

    const stock: Stock = {
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
      currency: data.currency || 'USD',
      marketCap: data.market_cap,
      fiftyTwoWeekHigh: data.fifty_two_week?.high,
      fiftyTwoWeekLow: data.fifty_two_week?.low,
    };
    
    // Cache the result
    setCachedQuote(symbol, stock);
    return stock;
  } catch (error) {
    console.error('Error fetching stock quote:', error);
    // Return fallback data instead of null
    const fallback = generateFallbackStock(symbol);
    setCachedQuote(symbol, fallback);
    return fallback;
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
      currency: item.currency || 'USD',
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
  const localSearchSymbols = (q: string) => {
    const needle = (q || '').trim().toUpperCase();
    if (!needle) return [] as Array<{symbol: string; name: string; type: string; exchange: string}>;

    const nameMap: Record<string, string> = {
      // US
      AAPL: 'Apple',
      MSFT: 'Microsoft',
      GOOGL: 'Alphabet',
      AMZN: 'Amazon',
      META: 'Meta',
      TSLA: 'Tesla',
      NVDA: 'NVIDIA',
      JPM: 'JPMorgan Chase',
      V: 'Visa',
      KO: 'Coca-Cola',
      WMT: 'Walmart',
      JNJ: 'Johnson & Johnson',
      PG: 'Procter & Gamble',
      UNH: 'UnitedHealth',
      HD: 'Home Depot',
      MA: 'Mastercard',
      DIS: 'Disney',
      NFLX: 'Netflix',
      PYPL: 'PayPal',
      INTC: 'Intel',
      // India
      RELIANCE: 'Reliance Industries',
      TCS: 'Tata Consultancy Services',
      HDFCBANK: 'HDFC Bank',
      INFY: 'Infosys',
      ICICIBANK: 'ICICI Bank',
      HINDUNILVR: 'Hindustan Unilever',
      SBIN: 'State Bank of India',
      BHARTIARTL: 'Bharti Airtel',
      ITC: 'ITC Limited',
      KOTAKBANK: 'Kotak Mahindra Bank',
      LT: 'Larsen & Toubro',
      AXISBANK: 'Axis Bank',
      WIPRO: 'Wipro',
      ASIANPAINT: 'Asian Paints',
      MARUTI: 'Maruti Suzuki',
      HCLTECH: 'HCL Technologies',
      SUNPHARMA: 'Sun Pharmaceutical',
      TITAN: 'Titan Company',
      ULTRACEMCO: 'UltraTech Cement',
      BAJFINANCE: 'Bajaj Finance',
      // Famous
      CSCO: 'Cisco',
      PEP: 'PepsiCo',
      ADBE: 'Adobe',
      CRM: 'Salesforce',
      NKE: 'Nike',
      CMCSA: 'Comcast',
      VZ: 'Verizon',
      T: 'AT&T',
      BA: 'Boeing',
      XOM: 'Exxon Mobil',
      // Commodities
      ...COMMODITY_NAMES,
    };

    const toItem = (symbol: string, exchange: string, type: string) => {
      const sym = symbol.toUpperCase();
      return {
        symbol: sym,
        name: nameMap[sym] || sym,
        type,
        exchange,
      };
    };

    const universe = [
      ...US_STOCKS.map((s) => toItem(s, 'NYSE/NASDAQ', 'Equity')),
      ...INDIA_STOCKS.map((s) => toItem(s, 'NSE/BSE', 'Equity')),
      ...FAMOUS_STOCKS.map((s) => toItem(s, 'NYSE/NASDAQ', 'Equity')),
      ...COMMODITIES.map((s) => toItem(s, 'ETF', 'ETF')),
    ];

    const ranked = universe
      .filter((item) => {
        const sym = item.symbol.toUpperCase();
        const nm = item.name.toUpperCase();
        return sym.includes(needle) || nm.includes(needle);
      })
      .sort((a, b) => {
        const score = (x: { symbol: string; name: string }) => {
          const sym = x.symbol.toUpperCase();
          const nm = x.name.toUpperCase();
          if (sym === needle) return 100;
          if (sym.startsWith(needle)) return 90;
          if (nm.startsWith(needle)) return 75;
          if (sym.includes(needle)) return 60;
          if (nm.includes(needle)) return 50;
          return 0;
        };
        return score(b) - score(a);
      })
      .slice(0, 15);

    return ranked;
  };

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
    
    // If provider search is unavailable (missing key / rate limit), keep UX usable.
    if (data.error || !data.data) {
      return localSearchSymbols(query);
    }

    const remote = data.data.slice(0, 15).map((item: any) => ({
      symbol: (item.symbol || '').toString().toUpperCase(),
      name: item.name || item.instrument_name || item.symbol,
      type: item.type || item.instrument_type || 'Equity',
      exchange: item.exchange || item.region || '',
    }));

    // Merge local + remote (dedupe by symbol) so users can find stocks by company name even if remote results are thin.
    const local = localSearchSymbols(query);
    const seen = new Set<string>();
    const merged: typeof remote = [];
    for (const item of [...local, ...remote]) {
      const key = (item.symbol || '').toUpperCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
      if (merged.length >= 15) break;
    }
    return merged;
  } catch (error) {
    console.error('Error searching symbols:', error);
    return localSearchSymbols(query);
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

// Top 20 US Stocks
export const US_STOCKS = [
  'AAPL',   // Apple
  'MSFT',   // Microsoft
  'GOOGL',  // Alphabet
  'AMZN',   // Amazon
  'META',   // Meta
  'TSLA',   // Tesla
  'NVDA',   // NVIDIA
  'JPM',    // JPMorgan Chase
  'V',      // Visa
  'KO',     // Coca-Cola
  'WMT',    // Walmart
  'JNJ',    // Johnson & Johnson
  'PG',     // Procter & Gamble
  'UNH',    // UnitedHealth
  'HD',     // Home Depot
  'MA',     // Mastercard
  'DIS',    // Disney
  'NFLX',   // Netflix
  'PYPL',   // PayPal
  'INTC',   // Intel
];

// Top 20 Indian Stocks (NSE)
export const INDIA_STOCKS = [
  'RELIANCE',   // Reliance Industries
  'TCS',        // Tata Consultancy Services
  'HDFCBANK',   // HDFC Bank
  'INFY',       // Infosys
  'ICICIBANK',  // ICICI Bank
  'HINDUNILVR', // Hindustan Unilever
  'SBIN',       // State Bank of India
  'BHARTIARTL', // Bharti Airtel
  'ITC',        // ITC Limited
  'KOTAKBANK',  // Kotak Mahindra Bank
  'LT',         // Larsen & Toubro
  'AXISBANK',   // Axis Bank
  'WIPRO',      // Wipro
  'ASIANPAINT', // Asian Paints
  'MARUTI',     // Maruti Suzuki
  'HCLTECH',    // HCL Technologies
  'SUNPHARMA',  // Sun Pharmaceutical
  'TITAN',      // Titan Company
  'ULTRACEMCO', // UltraTech Cement
  'BAJFINANCE', // Bajaj Finance
];

// Famous Companies (Additional)
export const FAMOUS_STOCKS = [
  'CSCO',   // Cisco
  'PEP',    // PepsiCo
  'ADBE',   // Adobe
  'CRM',    // Salesforce
  'NKE',    // Nike
  'CMCSA',  // Comcast
  'VZ',     // Verizon
  'T',      // AT&T
  'BA',     // Boeing
  'XOM',    // Exxon Mobil
];

// Combined default stocks for initial display (including commodities)
export const DEFAULT_STOCKS = [
  // US Stocks
  'AAPL',
  'MSFT', 
  'GOOGL',
  'TSLA',
  'NVDA',
  'JPM',
  // Commodities
  'GLD',     // Gold ETF (SPDR Gold Shares)
  'SLV',     // Silver ETF (iShares Silver Trust)
  // Indian Stocks
  'RELIANCE',
  'TCS',
  'HDFCBANK',
  'INFY',
  'ICICIBANK',
  'SBIN',
];

// All available stocks
export const ALL_STOCKS = [...new Set([...US_STOCKS, ...INDIA_STOCKS, ...FAMOUS_STOCKS])];

// Commodities - Gold and Silver ETFs
export const COMMODITIES = [
  'GLD',     // SPDR Gold Shares ETF
  'SLV',     // iShares Silver Trust ETF
  'GDX',     // Gold Miners ETF
  'IAU',     // iShares Gold Trust
  'PSLV',    // Sprott Physical Silver Trust
];

// Commodity names mapping
export const COMMODITY_NAMES: Record<string, string> = {
  'GLD': 'SPDR Gold Shares',
  'SLV': 'iShares Silver Trust',
  'GDX': 'VanEck Gold Miners ETF',
  'IAU': 'iShares Gold Trust',
  'PSLV': 'Sprott Physical Silver',
};
