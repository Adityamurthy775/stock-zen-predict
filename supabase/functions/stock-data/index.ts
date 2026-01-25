import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type CachedQuote = { expiresAt: number; payload: unknown };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache for quotes (30s TTL)
const quoteCache = new Map<string, CachedQuote>();

// US stocks list for currency detection
const US_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM', 'V', 'KO', 
                   'WMT', 'JNJ', 'PG', 'UNH', 'HD', 'MA', 'DIS', 'NFLX', 'PYPL', 'INTC',
                   'CSCO', 'PEP', 'ADBE', 'CRM', 'NKE', 'CMCSA', 'VZ', 'T', 'BA', 'XOM'];

// Indian stocks list
const INDIA_STOCKS = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'SBIN', 
                      'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT', 'AXISBANK', 'WIPRO', 'ASIANPAINT', 
                      'MARUTI', 'HCLTECH', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO', 'BAJFINANCE'];

const isUSStock = (sym: string): boolean => {
  const baseSym = sym.split(':')[0].replace('.NS', '').replace('.BO', '').replace('.BSE', '');
  return US_STOCKS.includes(baseSym);
};

const isIndianStock = (sym: string): boolean => {
  const baseSym = sym.split(':')[0].replace('.NS', '').replace('.BO', '').replace('.BSE', '');
  return INDIA_STOCKS.includes(baseSym);
};

type IndianExchange = 'NSE' | 'BSE';

const normalizeSymbol = (sym: string): { baseSymbol: string; exchange?: IndianExchange; isIndian: boolean } => {
  const raw = (sym || '').trim();
  const upper = raw.toUpperCase();

  // Accept forms like NSE:RELIANCE, BSE:ADANIENT
  const exchangePrefix = upper.includes(':') ? upper.split(':')[0] : '';
  const afterPrefix = upper.includes(':') ? upper.split(':').slice(1).join(':') : upper;

  let exchange: IndianExchange | undefined;
  if (exchangePrefix === 'NSE') exchange = 'NSE';
  if (exchangePrefix === 'BSE') exchange = 'BSE';

  // Accept forms like RELIANCE.NS / ADANIENT.BSE / INFY.BO
  let baseSymbol = afterPrefix.replace('.NS', '').replace('.BO', '').replace('.BSE', '');
  if (!exchange) {
    if (afterPrefix.endsWith('.NS')) exchange = 'NSE';
    if (afterPrefix.endsWith('.BO') || afterPrefix.endsWith('.BSE')) exchange = 'BSE';
  }

  // Decide “Indian” if either suffix/prefix suggests it OR it's in our India list.
  const isIndian = Boolean(exchange) || isIndianStock(baseSymbol);
  return { baseSymbol, exchange, isIndian };
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ALPHA_VANTAGE_API_KEY = Deno.env.get('ALPHA_VANTAGE_API_KEY');
    const FINNHUB_API_KEY = Deno.env.get('FINNHUB_API_KEY');
    const TWELVE_DATA_API_KEY = Deno.env.get('TWELVE_DATA_API_KEY');
    
    const { action, symbol, interval, outputsize, symbols } = await req.json();
    console.log(`Stock data request: action=${action}, symbol=${symbol}, interval=${interval}`);

    const ALPHA_VANTAGE_URL = 'https://www.alphavantage.co/query';
    const FINNHUB_URL = 'https://finnhub.io/api/v1';
    const TWELVE_DATA_URL = 'https://api.twelvedata.com';

    // Helper to format symbol for Alpha Vantage
    const formatSymbolForAlphaVantage = (sym: string): string => {
      const { baseSymbol, exchange, isIndian } = normalizeSymbol(sym);
      // Alpha Vantage support for Indian equities is spotty; keep legacy mapping as fallback.
      if (isIndian) {
        // Prefer BSE only when explicitly requested; otherwise keep BSE legacy for backward compatibility.
        return exchange === 'NSE' ? `${baseSymbol}.NSE` : `${baseSymbol}.BSE`;
      }
      return baseSymbol;
    };

    const fetchTwelveDataQuote = async (sym: string) => {
      if (!TWELVE_DATA_API_KEY) return { ok: false as const, error: 'Twelve Data API key not configured' };
      const { baseSymbol, exchange } = normalizeSymbol(sym);
      const params = new URLSearchParams({
        symbol: baseSymbol,
        apikey: TWELVE_DATA_API_KEY,
      });
      if (exchange) params.set('exchange', exchange);
      const url = `${TWELVE_DATA_URL}/quote?${params.toString()}`;

      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || data?.status === 'error') {
        return { ok: false as const, error: data?.message || 'Failed to fetch quote' };
      }
      return { ok: true as const, data };
    };

    const fetchTwelveDataTimeSeries = async (sym: string, int: string, size: number) => {
      if (!TWELVE_DATA_API_KEY) return { ok: false as const, error: 'Twelve Data API key not configured' };
      const { baseSymbol, exchange } = normalizeSymbol(sym);

      // Map our intervals to Twelve Data intervals
      const intervalMap: Record<string, string> = {
        '1day': '1day',
        '1week': '1week',
        '1month': '1month',
        '1h': '1h',
        '4h': '4h',
      };
      const tdInterval = intervalMap[int] || int;

      const params = new URLSearchParams({
        symbol: baseSymbol,
        interval: tdInterval,
        outputsize: String(size),
        apikey: TWELVE_DATA_API_KEY,
      });
      if (exchange) params.set('exchange', exchange);
      const url = `${TWELVE_DATA_URL}/time_series?${params.toString()}`;

      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || data?.status === 'error' || !data?.values) {
        return { ok: false as const, error: data?.message || 'Failed to fetch time series' };
      }
      return { ok: true as const, data };
    };

    if (action === 'quote') {
      // Quote: use Alpha Vantage as primary source
      if (!ALPHA_VANTAGE_API_KEY) {
        console.error('Alpha Vantage API key not configured');
        return new Response(
          JSON.stringify({ error: 'Alpha Vantage API key not configured' }),
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

      // Prefer Twelve Data for Indian symbols (supports NSE/BSE more reliably than Alpha Vantage).
      const { baseSymbol, exchange, isIndian } = normalizeSymbol(symbol);
      if (isIndian && TWELVE_DATA_API_KEY) {
        try {
          const td = await fetchTwelveDataQuote(symbol);
          if (td.ok) {
            const q = td.data;
            const transformedQuote = {
              symbol: baseSymbol,
              name: q.name || baseSymbol,
              exchange: exchange || q.exchange || 'NSE',
              currency: q.currency || 'INR',
              datetime: q.datetime || new Date().toISOString(),
              open: q.open,
              high: q.high,
              low: q.low,
              close: q.close,
              volume: q.volume,
              previous_close: q.previous_close,
              change: q.change,
              percent_change: q.percent_change,
              is_market_open: q.is_market_open ?? true,
              market_cap: q.market_cap,
              fifty_two_week: q.fifty_two_week,
            };
            return cacheAndReturn(transformedQuote);
          }
          console.error('Twelve Data quote error:', td.error);
        } catch (err) {
          console.error('Twelve Data quote fetch error:', err);
        }
      }

      const formattedSymbol = formatSymbolForAlphaVantage(symbol);
      const url = `${ALPHA_VANTAGE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(formattedSymbol)}&apikey=${ALPHA_VANTAGE_API_KEY}`;
      console.log(`Fetching quote from Alpha Vantage for ${formattedSymbol}`);

      try {
        const response = await fetch(url);
        const data = await response.json();
        console.log('Alpha Vantage response:', JSON.stringify(data).substring(0, 500));

        if (data['Global Quote'] && Object.keys(data['Global Quote']).length > 0) {
          const quote = data['Global Quote'];
          
          // Determine currency based on stock type
          const { baseSymbol: baseSym } = normalizeSymbol(symbol);
          const currency = normalizeSymbol(symbol).isIndian ? 'INR' : 'USD';

          const price = parseFloat(quote['05. price']) || 0;
          const previousClose = parseFloat(quote['08. previous close']) || 0;
          const change = parseFloat(quote['09. change']) || 0;
          const changePercent = parseFloat(quote['10. change percent']?.replace('%', '')) || 0;

          const transformedQuote = {
            symbol: quote['01. symbol']?.replace('.BSE', '') || symbol,
            name: quote['01. symbol']?.replace('.BSE', '') || symbol,
            exchange: normalizeSymbol(symbol).isIndian ? 'BSE' : 'NYSE',
            currency: currency,
            datetime: quote['07. latest trading day'] || new Date().toISOString(),
            open: parseFloat(quote['02. open']) || 0,
            high: parseFloat(quote['03. high']) || 0,
            low: parseFloat(quote['04. low']) || 0,
            close: price,
            volume: parseInt(quote['06. volume']) || 0,
            previous_close: previousClose,
            change: change,
            percent_change: changePercent,
            is_market_open: true,
          };

          return cacheAndReturn(transformedQuote);
        }

        console.error('Alpha Vantage empty or error:', data['Note'] || data['Error Message'] || 'No data');
        return cacheAndReturn({ error: data['Note'] || data['Error Message'] || 'Failed to fetch quote' });
      } catch (err) {
        console.error('Alpha Vantage fetch error:', err);
        return cacheAndReturn({ error: 'Failed to fetch quote' });
      }
    }

    if (action === 'batch_quote') {
      // Batch quote using Alpha Vantage (fetch one by one due to API limits)
      const symbolList = symbols || symbol;
      
      if (!ALPHA_VANTAGE_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'Batch quotes unavailable (API key missing)' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const requested = symbolList.split(',').map((s: string) => s.trim()).filter(Boolean);
      console.log(`Fetching batch quotes from Alpha Vantage for ${requested.length} symbols`);

      const results: any[] = [];
      
      // Fetch quotes sequentially to avoid rate limits (Alpha Vantage has 5 calls/min on free tier)
      for (const sym of requested.slice(0, 5)) { // Limit to 5 to avoid rate limits
        const formattedSymbol = formatSymbolForAlphaVantage(sym);
        const url = `${ALPHA_VANTAGE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(formattedSymbol)}&apikey=${ALPHA_VANTAGE_API_KEY}`;
        
        try {
          const response = await fetch(url);
          const data = await response.json();

          if (data['Global Quote'] && Object.keys(data['Global Quote']).length > 0) {
            const quote = data['Global Quote'];
            const baseSym = sym.split(':')[0].replace('.NS', '').replace('.BO', '').replace('.BSE', '');
            const currency = isIndianStock(baseSym) ? 'INR' : 'USD';

            results.push({
              symbol: baseSym,
              name: baseSym,
              exchange: isIndianStock(baseSym) ? 'BSE' : 'NYSE',
              currency: currency,
              datetime: quote['07. latest trading day'] || new Date().toISOString(),
              open: parseFloat(quote['02. open']) || 0,
              high: parseFloat(quote['03. high']) || 0,
              low: parseFloat(quote['04. low']) || 0,
              close: parseFloat(quote['05. price']) || 0,
              volume: parseInt(quote['06. volume']) || 0,
              previous_close: parseFloat(quote['08. previous close']) || 0,
              change: parseFloat(quote['09. change']) || 0,
              percent_change: parseFloat(quote['10. change percent']?.replace('%', '')) || 0,
              is_market_open: true,
            });
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
          console.error(`Error fetching quote for ${sym}:`, err);
        }
      }

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'time_series' || action === 'history') {
      // Use Alpha Vantage for historical data
      if (!ALPHA_VANTAGE_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'Historical data API key not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const size = outputsize || 100;
      const int = interval || '1day';

      // Prefer Twelve Data for Indian symbols (NSE/BSE).
      const norm = normalizeSymbol(symbol);
      if (norm.isIndian && TWELVE_DATA_API_KEY) {
        try {
          const td = await fetchTwelveDataTimeSeries(symbol, int, size);
          if (td.ok) {
            // Twelve Data already returns { values: [...] }
            return new Response(JSON.stringify({ values: td.data.values }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          console.error('Twelve Data time series error:', td.error);
        } catch (err) {
          console.error('Twelve Data time series fetch error:', err);
        }
      }
      
      const formattedSymbol = formatSymbolForAlphaVantage(symbol);
      
      // Determine function based on interval
      let func = 'TIME_SERIES_DAILY';
      if (int.includes('min') || int === '1h' || int === '4h') {
        func = 'TIME_SERIES_INTRADAY';
      } else if (int === '1week') {
        func = 'TIME_SERIES_WEEKLY';
      } else if (int === '1month') {
        func = 'TIME_SERIES_MONTHLY';
      }
      
      let url = `${ALPHA_VANTAGE_URL}?function=${func}&symbol=${encodeURIComponent(formattedSymbol)}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=compact`;
      if (func === 'TIME_SERIES_INTRADAY') {
        url += `&interval=5min`;
      }
      
      console.log(`Fetching time series from Alpha Vantage for ${formattedSymbol}`);

      try {
        const response = await fetch(url);
        const data = await response.json();

        // Find the time series key in the response
        const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));
        
        if (timeSeriesKey && data[timeSeriesKey]) {
          const timeSeries = data[timeSeriesKey];
          const values = Object.entries(timeSeries).slice(0, size).map(([datetime, values]: [string, any]) => ({
            datetime,
            open: values['1. open'],
            high: values['2. high'],
            low: values['3. low'],
            close: values['4. close'],
            volume: values['5. volume'] || values['6. volume'] || '0',
          }));

          return new Response(JSON.stringify({ values }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.error('Alpha Vantage time series error:', data['Note'] || data['Error Message'] || 'No data');
        return new Response(
          JSON.stringify({ error: data['Note'] || data['Error Message'] || 'Failed to fetch time series' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('Alpha Vantage time series error:', err);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch time series' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'search') {
      // Search using Alpha Vantage
      if (!ALPHA_VANTAGE_API_KEY) {
        return new Response(
          JSON.stringify({ data: [], error: 'Search API key not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const url = `${ALPHA_VANTAGE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(symbol)}&apikey=${ALPHA_VANTAGE_API_KEY}`;
      console.log(`Searching symbols (Alpha Vantage) for ${symbol}`);

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.bestMatches && Array.isArray(data.bestMatches)) {
          const transformedResults = data.bestMatches.slice(0, 15).map((item: any) => ({
            symbol: item['1. symbol'],
            name: item['2. name'],
            type: item['3. type'],
            exchange: item['4. region'],
          }));

          return new Response(JSON.stringify({ data: transformedResults }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (err) {
        console.error('Alpha Vantage search error:', err);
      }

      return new Response(JSON.stringify({ data: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'news') {
      // Fetch news from Finnhub
      if (!FINNHUB_API_KEY) {
        console.error('FINNHUB_API_KEY not configured');
        // Return mock news if no API key
        return new Response(JSON.stringify(getMockNews(symbol)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
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
        
        console.log(`Fetching news from Finnhub for ${symbol || 'general market'}`);
        
        const response = await fetch(url);
        const data = await response.json();
        console.log(`Finnhub news response: ${Array.isArray(data) ? data.length + ' items' : 'error'}`);
        
        if (Array.isArray(data) && data.length > 0) {
          const transformedNews = data.slice(0, 10).map((item: any, index: number) => ({
            id: `news-${item.id || index}`,
            title: item.headline || '',
            summary: item.summary || '',
            source: item.source || 'Unknown',
            category: categorizeNews(item.category || ''),
            sentiment: analyzeSentiment(item.headline || '', item.summary || ''),
            publishedAt: new Date(item.datetime * 1000).toISOString(),
            url: item.url || '#',
            image: item.image || null,
          }));

          return new Response(JSON.stringify(transformedNews), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Fallback to general market news if stock-specific is empty
        if (symbol) {
          console.log('No company-specific news, trying general market news');
          const generalUrl = `${FINNHUB_URL}/news?category=general&token=${FINNHUB_API_KEY}`;
          const generalResponse = await fetch(generalUrl);
          const generalData = await generalResponse.json();
          
          if (Array.isArray(generalData) && generalData.length > 0) {
            const transformedNews = generalData.slice(0, 10).map((item: any, index: number) => ({
              id: `news-${item.id || index}`,
              title: item.headline || '',
              summary: item.summary || '',
              source: item.source || 'Unknown',
              category: categorizeNews(item.category || ''),
              sentiment: analyzeSentiment(item.headline || '', item.summary || ''),
              publishedAt: new Date(item.datetime * 1000).toISOString(),
              url: item.url || '#',
              image: item.image || null,
            }));

            return new Response(JSON.stringify(transformedNews), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
        
        // Return mock news as final fallback
        console.log('No news from Finnhub, returning mock news');
        return new Response(JSON.stringify(getMockNews(symbol)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.error('Finnhub news error:', err);
        return new Response(JSON.stringify(getMockNews(symbol)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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

// Generate mock news when API is unavailable
function getMockNews(symbol?: string): any[] {
  const stockName = symbol?.split(':')[0].replace('.NS', '').replace('.BO', '') || 'Market';
  const now = new Date();
  
  return [
    {
      id: 'news-1',
      title: `${stockName} Shows Strong Technical Momentum in Morning Trading`,
      summary: `Technical indicators suggest bullish momentum for ${stockName} as the stock approaches key resistance levels. Analysts are watching closely for potential breakout patterns.`,
      source: 'Market Watch',
      category: 'market',
      sentiment: 'positive',
      publishedAt: new Date(now.getTime() - 30 * 60000).toISOString(),
      url: 'https://www.marketwatch.com',
    },
    {
      id: 'news-2',
      title: `Analysts Update ${stockName} Price Target Amid Market Volatility`,
      summary: `Several Wall Street analysts have revised their outlook on ${stockName}, citing changing market conditions and sector rotation trends.`,
      source: 'Bloomberg',
      category: 'analyst',
      sentiment: 'neutral',
      publishedAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
      url: 'https://www.bloomberg.com',
    },
    {
      id: 'news-3',
      title: `${stockName} Quarterly Earnings Preview: What Investors Should Know`,
      summary: `As earnings season approaches, here's what analysts expect from ${stockName}'s upcoming quarterly report and key metrics to watch.`,
      source: 'Reuters',
      category: 'earnings',
      sentiment: 'neutral',
      publishedAt: new Date(now.getTime() - 4 * 3600000).toISOString(),
      url: 'https://www.reuters.com',
    },
    {
      id: 'news-4',
      title: `Global Markets Rally: ${stockName} Among Top Gainers`,
      summary: `Strong economic data and positive sentiment drove markets higher today, with ${stockName} posting significant gains amid broad market strength.`,
      source: 'CNBC',
      category: 'market',
      sentiment: 'positive',
      publishedAt: new Date(now.getTime() - 6 * 3600000).toISOString(),
      url: 'https://www.cnbc.com',
    },
    {
      id: 'news-5',
      title: `Institutional Investors Increase Stakes in ${stockName}`,
      summary: `Recent SEC filings reveal major institutional investors have been accumulating shares in ${stockName}, signaling confidence in the company's long-term prospects.`,
      source: 'Financial Times',
      category: 'market',
      sentiment: 'positive',
      publishedAt: new Date(now.getTime() - 12 * 3600000).toISOString(),
      url: 'https://www.ft.com',
    },
  ];
}
