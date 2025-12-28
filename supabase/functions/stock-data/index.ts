import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type CachedQuote = { expiresAt: number; payload: unknown };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache for quotes (30s TTL)
const quoteCache = new Map<string, CachedQuote>();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STOCKDATA_API_KEY = Deno.env.get('STOCKDATA_API_KEY');
    const TWELVE_DATA_API_KEY = Deno.env.get('TWELVE_DATA_API_KEY');
    const FINNHUB_API_KEY = Deno.env.get('FINNHUB_API_KEY');
    
    const { action, symbol, interval, outputsize, symbols } = await req.json();
    console.log(`Stock data request: action=${action}, symbol=${symbol}, interval=${interval}`);

    const STOCKDATA_URL = 'https://api.stockdata.org/v1';
    const TWELVE_DATA_URL = 'https://api.twelvedata.com';
    const FINNHUB_URL = 'https://finnhub.io/api/v1';

    // Helper to format symbol for stockdata.org
    const formatSymbolForStockData = (sym: string): string => {
      // Remove any existing exchange suffix for stockdata.org format
      const baseSym = sym.split(':')[0].replace('.NS', '').replace('.BO', '');
      // US stocks don't need suffix, Indian stocks need .NS
      const isUSStock = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM', 'V', 'KO', 
                         'WMT', 'JNJ', 'PG', 'UNH', 'HD', 'MA', 'DIS', 'NFLX', 'PYPL', 'INTC',
                         'CSCO', 'PEP', 'ADBE', 'CRM', 'NKE', 'CMCSA', 'VZ', 'T', 'BA', 'XOM'].includes(baseSym);
      return isUSStock ? baseSym : `${baseSym}.NS`;
    };

    if (action === 'quote') {
      // Quote: use stockdata.org as primary source
      if (!STOCKDATA_API_KEY && !TWELVE_DATA_API_KEY) {
        console.error('No market data provider keys configured');
        return new Response(
          JSON.stringify({ error: 'Market data API key not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const now = Date.now();
      const cacheKey = `quote:${symbol}`;
      const cached = quoteCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return new Response(JSON.stringify(cached.payload), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const cacheAndReturn = (payload: unknown) => {
        quoteCache.set(cacheKey, { expiresAt: Date.now() + 30_000, payload });
        return new Response(JSON.stringify(payload), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      };

      // Primary: StockData.org
      if (STOCKDATA_API_KEY) {
        const formattedSymbol = formatSymbolForStockData(symbol);
        const url = `${STOCKDATA_URL}/data/quote?symbols=${encodeURIComponent(formattedSymbol)}&api_token=${STOCKDATA_API_KEY}`;
        console.log(`Fetching quote from stockdata.org for ${formattedSymbol}`);

        try {
          const response = await fetch(url);
          const data = await response.json();
          console.log('StockData response:', JSON.stringify(data).substring(0, 500));

          if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
            const quote = data.data[0];

            // Determine currency based on exchange
            const isUSExchange = ['NYSE', 'NASDAQ', 'US'].includes(quote.exchange_short?.toUpperCase() || '');
            const currency = isUSExchange ? 'USD' : 'INR';

            const transformedQuote = {
              symbol: quote.ticker,
              name: quote.name || quote.ticker,
              exchange: quote.exchange_short || 'NSE',
              currency: currency,
              datetime: quote.last_trade_time || new Date().toISOString(),
              open: quote.day_open,
              high: quote.day_high,
              low: quote.day_low,
              close: quote.price,
              volume: quote.volume,
              previous_close: quote.previous_close_price,
              change: quote.day_change,
              percent_change: quote.change_percent,
              fifty_two_week: {
                low: quote['52_week_low'],
                high: quote['52_week_high'],
              },
              market_cap: quote.market_cap,
              is_market_open: !quote.is_extended_hours_price,
            };

            return cacheAndReturn(transformedQuote);
          }

          // Log error and fall through to Twelve Data
          console.error('StockData empty or error:', data?.error || 'No data');
        } catch (err) {
          console.error('StockData fetch error:', err);
        }
      }

      // Fallback: Twelve Data
      if (TWELVE_DATA_API_KEY) {
        const toTwelveSymbol = (sym: string): string => {
          if (sym.includes(':')) return sym;
          const baseSym = sym.replace('.NS', '').replace('.BO', '');
          const isUSStock = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM', 'V', 'KO',
                            'WMT', 'JNJ', 'PG', 'UNH', 'HD', 'MA', 'DIS', 'NFLX', 'PYPL', 'INTC',
                            'CSCO', 'PEP', 'ADBE', 'CRM', 'NKE', 'CMCSA', 'VZ', 'T', 'BA', 'XOM'].includes(baseSym);
          return isUSStock ? baseSym : `${baseSym}:NSE`;
        };

        const twelveSymbol = toTwelveSymbol(symbol);
        const url = `${TWELVE_DATA_URL}/quote?symbol=${encodeURIComponent(twelveSymbol)}&apikey=${TWELVE_DATA_API_KEY}`;
        console.log(`Fetching fallback quote from Twelve Data for ${twelveSymbol}`);

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'error' || data.code) {
          console.error('Twelve Data quote error:', data.message || data.code);
          return cacheAndReturn({ error: data.message || 'Failed to fetch quote' });
        }

        const transformedQuote = {
          symbol: data.symbol,
          name: data.name,
          exchange: data.exchange,
          currency: data.currency || 'USD',
          datetime: data.datetime,
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: data.volume,
          previous_close: data.previous_close,
          change: data.change,
          percent_change: data.percent_change,
          is_market_open: data.is_market_open,
          fifty_two_week: data.fifty_two_week,
        };

        return cacheAndReturn(transformedQuote);
      }

      return cacheAndReturn({ error: 'No quote providers available' });
    }

    if (action === 'batch_quote') {
      // Batch quote using StockData.org
      const symbolList = symbols || symbol;
      
      if (!STOCKDATA_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'Batch quotes unavailable (API key missing)' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const requested = symbolList.split(',').map((s: string) => s.trim()).filter(Boolean);
      const formattedSymbols = requested.map(formatSymbolForStockData).join(',');
      
      const url = `${STOCKDATA_URL}/data/quote?symbols=${encodeURIComponent(formattedSymbols)}&api_token=${STOCKDATA_API_KEY}`;
      console.log(`Fetching batch quotes from stockdata.org for ${formattedSymbols}`);

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data?.data && Array.isArray(data.data)) {
          const results = data.data.map((quote: any) => {
            const isUSExchange = ['NYSE', 'NASDAQ', 'US'].includes(quote.exchange_short?.toUpperCase() || '');
            const currency = isUSExchange ? 'USD' : 'INR';
            
            return {
              symbol: quote.ticker,
              name: quote.name || quote.ticker,
              exchange: quote.exchange_short || 'NSE',
              currency: currency,
              datetime: quote.last_trade_time || new Date().toISOString(),
              open: quote.day_open,
              high: quote.day_high,
              low: quote.day_low,
              close: quote.price,
              volume: quote.volume,
              previous_close: quote.previous_close_price,
              change: quote.day_change,
              percent_change: quote.change_percent,
              is_market_open: !quote.is_extended_hours_price,
            };
          });

          return new Response(JSON.stringify(results), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (err) {
        console.error('Batch quote error:', err);
      }

      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'time_series' || action === 'history') {
      // Use Twelve Data for historical data
      if (!TWELVE_DATA_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'Historical data API key not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const size = outputsize || 100;
      const int = interval || '1day';
      
      // Format symbol for Twelve Data
      const baseSym = symbol.split(':')[0].replace('.NS', '').replace('.BO', '');
      const isUSStock = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM', 'V', 'KO',
                        'WMT', 'JNJ', 'PG', 'UNH', 'HD', 'MA', 'DIS', 'NFLX', 'PYPL', 'INTC',
                        'CSCO', 'PEP', 'ADBE', 'CRM', 'NKE', 'CMCSA', 'VZ', 'T', 'BA', 'XOM'].includes(baseSym);
      const formattedSymbol = isUSStock ? baseSym : `${baseSym}:NSE`;
      
      const url = `${TWELVE_DATA_URL}/time_series?symbol=${encodeURIComponent(formattedSymbol)}&interval=${encodeURIComponent(int)}&outputsize=${size}&apikey=${TWELVE_DATA_API_KEY}`;
      console.log(`Fetching time series for ${formattedSymbol}, interval=${int}, size=${size}`);

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'error' || data.code) {
        console.error('Time series API error:', data.message || data.code);
        return new Response(
          JSON.stringify({ error: data.message || 'Failed to fetch time series' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'search') {
      // Search using StockData.org
      if (!STOCKDATA_API_KEY && !TWELVE_DATA_API_KEY) {
        return new Response(
          JSON.stringify({ data: [], error: 'Search API key not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (STOCKDATA_API_KEY) {
        const url = `${STOCKDATA_URL}/entity/search?search=${encodeURIComponent(symbol)}&api_token=${STOCKDATA_API_KEY}`;
        console.log(`Searching symbols (stockdata.org) for ${symbol}`);

        try {
          const response = await fetch(url);
          const data = await response.json();

          if (data?.data && !data?.error) {
            const transformedResults = (data.data || []).slice(0, 15).map((item: any) => ({
              symbol: item.symbol,
              name: item.name || item.symbol,
              type: item.type || 'Stock',
              exchange: item.exchange?.short_name || item.exchange_short || 'Unknown',
              country: item.country,
            }));

            return new Response(JSON.stringify({ data: transformedResults }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (err) {
          console.error('StockData search error:', err);
        }
      }

      // Fallback to Twelve Data
      if (TWELVE_DATA_API_KEY) {
        const url = `${TWELVE_DATA_URL}/symbol_search?symbol=${encodeURIComponent(symbol)}&apikey=${TWELVE_DATA_API_KEY}`;
        console.log(`Searching symbols (Twelve Data) for ${symbol}`);

        const response = await fetch(url);
        const data = await response.json();

        const transformedResults = (data.data || []).slice(0, 15).map((item: any) => ({
          symbol: item.symbol,
          name: item.instrument_name,
          type: item.instrument_type,
          exchange: item.exchange,
        }));

        return new Response(JSON.stringify({ data: transformedResults }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'news') {
      // Fetch news from Finnhub
      if (!FINNHUB_API_KEY) {
        console.error('FINNHUB_API_KEY not configured');
        throw new Error('Finnhub API key not configured');
      }

      let url: string;
      if (symbol) {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fromDate = weekAgo.toISOString().split('T')[0];
        const toDate = today.toISOString().split('T')[0];
        
        const baseSymbol = symbol.split(':')[0].replace('.NS', '').replace('.BO', '');
        url = `${FINNHUB_URL}/company-news?symbol=${baseSymbol}&from=${fromDate}&to=${toDate}&token=${FINNHUB_API_KEY}`;
      } else {
        url = `${FINNHUB_URL}/news?category=general&token=${FINNHUB_API_KEY}`;
      }
      
      console.log(`Fetching news for ${symbol || 'general market'}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      const transformedNews = Array.isArray(data) ? data.slice(0, 10).map((item: any, index: number) => ({
        id: `news-${item.id || index}`,
        title: item.headline || '',
        summary: item.summary || '',
        source: item.source || 'Unknown',
        category: categorizeNews(item.category || ''),
        sentiment: analyzeSentiment(item.headline || '', item.summary || ''),
        publishedAt: new Date(item.datetime * 1000).toISOString(),
        url: item.url || '#',
        image: item.image || null,
      })) : [];

      return new Response(JSON.stringify(transformedNews), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action specified');

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to categorize news
function categorizeNews(category: string): 'earnings' | 'products' | 'market' | 'analyst' {
  const lowerCategory = category.toLowerCase();
  if (lowerCategory.includes('earn') || lowerCategory.includes('financ')) return 'earnings';
  if (lowerCategory.includes('product') || lowerCategory.includes('launch')) return 'products';
  if (lowerCategory.includes('analyst') || lowerCategory.includes('rating')) return 'analyst';
  return 'market';
}

// Simple sentiment analysis based on keywords
function analyzeSentiment(headline: string, summary: string): 'positive' | 'negative' | 'neutral' {
  const text = (headline + ' ' + summary).toLowerCase();
  
  const positiveWords = ['surge', 'soar', 'gain', 'rise', 'up', 'high', 'growth', 'profit', 'beat', 'bullish', 'upgrade', 'strong', 'record', 'boost'];
  const negativeWords = ['fall', 'drop', 'decline', 'down', 'low', 'loss', 'miss', 'bearish', 'downgrade', 'weak', 'concern', 'fear', 'crash', 'plunge'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (text.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (text.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}
