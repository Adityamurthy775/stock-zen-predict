import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    if (action === 'quote') {
      // Use stockdata.org for accurate quotes
      if (!STOCKDATA_API_KEY) {
        console.error('STOCKDATA_API_KEY not configured');
        throw new Error('StockData API key not configured');
      }
      
      const url = `${STOCKDATA_URL}/data/quote?symbols=${symbol}&api_token=${STOCKDATA_API_KEY}`;
      console.log(`Fetching quote from stockdata.org for ${symbol}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error || !data.data || data.data.length === 0) {
        console.error('StockData API error:', data.error || 'No data returned');
        throw new Error(data.error?.message || 'Failed to fetch quote');
      }

      const quote = data.data[0];
      
      // Transform to our format
      const transformedQuote = {
        symbol: quote.ticker,
        name: quote.name || quote.ticker,
        exchange: quote.exchange_short || 'NSE',
        currency: quote.currency || 'INR',
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
        is_market_open: quote.is_extended_hours_price ? false : true,
      };

      return new Response(JSON.stringify(transformedQuote), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'batch_quote') {
      // Batch quote from stockdata.org
      if (!STOCKDATA_API_KEY) {
        throw new Error('StockData API key not configured');
      }
      
      const symbolList = symbols || symbol;
      const url = `${STOCKDATA_URL}/data/quote?symbols=${symbolList}&api_token=${STOCKDATA_API_KEY}`;
      console.log(`Fetching batch quotes for ${symbolList}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Failed to fetch batch quotes');
      }

      // Transform all quotes
      const transformedQuotes = (data.data || []).map((quote: any) => ({
        symbol: quote.ticker,
        name: quote.name || quote.ticker,
        exchange: quote.exchange_short || 'NSE',
        currency: quote.currency || 'INR',
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
      }));

      return new Response(JSON.stringify(transformedQuotes), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'time_series' || action === 'history') {
      // Use Twelve Data for historical data (stockdata.org requires paid plan for EOD)
      if (!TWELVE_DATA_API_KEY) {
        throw new Error('Twelve Data API key not configured');
      }
      
      const size = outputsize || 100;
      const int = interval || '1day';
      const url = `${TWELVE_DATA_URL}/time_series?symbol=${symbol}&interval=${int}&outputsize=${size}&apikey=${TWELVE_DATA_API_KEY}`;
      console.log(`Fetching time series for ${symbol}, interval=${int}, size=${size}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'error' || data.code) {
        console.error('Time series API error:', data.message || data.code);
        throw new Error(data.message || 'Failed to fetch time series');
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'search') {
      // Search symbols using stockdata.org
      if (!STOCKDATA_API_KEY) {
        throw new Error('StockData API key not configured');
      }
      
      const url = `${STOCKDATA_URL}/entity/search?search=${symbol}&api_token=${STOCKDATA_API_KEY}`;
      console.log(`Searching symbols for ${symbol}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        console.error('Search API error:', data.error);
        throw new Error(data.error.message || 'Failed to search symbols');
      }

      // Transform search results
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

    if (action === 'news') {
      // Fetch news from Finnhub
      if (!FINNHUB_API_KEY) {
        console.error('FINNHUB_API_KEY not configured');
        throw new Error('Finnhub API key not configured');
      }

      // Get general market news or company news
      let url: string;
      if (symbol) {
        // Company news - last 7 days
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fromDate = weekAgo.toISOString().split('T')[0];
        const toDate = today.toISOString().split('T')[0];
        
        // Extract base symbol for news (remove exchange suffix)
        const baseSymbol = symbol.split(':')[0];
        url = `${FINNHUB_URL}/company-news?symbol=${baseSymbol}&from=${fromDate}&to=${toDate}&token=${FINNHUB_API_KEY}`;
      } else {
        // General market news
        url = `${FINNHUB_URL}/news?category=general&token=${FINNHUB_API_KEY}`;
      }
      
      console.log(`Fetching news for ${symbol || 'general market'}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      // Transform Finnhub news format to our format
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
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
