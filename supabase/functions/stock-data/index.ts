import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type CachedQuote = { expiresAt: number; payload: unknown };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache for quotes (30s TTL)
const quoteCache = new Map<string, CachedQuote>();

// API usage tracking (in-memory, resets on function restart)
const apiUsageTracker = new Map<string, { calls: number; lastReset: number }>();

// Scraping stats tracker
const scrapingStats = { calls: 0, successes: 0, failures: 0, lastUsed: 0 };

// US stocks list for currency detection
const US_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM', 'V', 'KO', 
                   'WMT', 'JNJ', 'PG', 'UNH', 'HD', 'MA', 'DIS', 'NFLX', 'PYPL', 'INTC',
                   'CSCO', 'PEP', 'ADBE', 'CRM', 'NKE', 'CMCSA', 'VZ', 'T', 'BA', 'XOM'];

// Extended Indian stocks list
const INDIA_STOCKS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'SBIN', 
  'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT', 'AXISBANK', 'WIPRO', 'ASIANPAINT', 
  'MARUTI', 'HCLTECH', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO', 'BAJFINANCE',
  'ADANIENT', 'ADANIPORTS', 'TATAMOTORS', 'TATASTEEL', 'POWERGRID', 'NTPC',
  'ONGC', 'COALINDIA', 'BPCL', 'IOC', 'GRASIM', 'TECHM', 'DIVISLAB', 'DRREDDY',
  'CIPLA', 'EICHERMOT', 'M&M', 'HEROMOTOCO', 'BAJAJ-AUTO', 'BRITANNIA',
  'NESTLEIND', 'DABUR', 'PIDILITIND', 'GODREJCP', 'MARICO', 'COLPAL',
  'HAVELLS', 'VOLTAS', 'CROMPTON', 'BLUESTAR', 'TATAPOWER', 'ADANIGREEN',
  'JSWSTEEL', 'HINDALCO', 'VEDL', 'GAIL', 'INDUSINDBK', 'BANDHANBNK',
  'PNB', 'BANKBARODA', 'CANBK', 'SBILIFE', 'HDFCLIFE', 'ICICIPRULI'
];

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

  const exchangePrefix = upper.includes(':') ? upper.split(':')[0] : '';
  const afterPrefix = upper.includes(':') ? upper.split(':').slice(1).join(':') : upper;

  let exchange: IndianExchange | undefined;
  if (exchangePrefix === 'NSE') exchange = 'NSE';
  if (exchangePrefix === 'BSE') exchange = 'BSE';

  let baseSymbol = afterPrefix.replace('.NS', '').replace('.BO', '').replace('.BSE', '');
  if (!exchange) {
    if (afterPrefix.endsWith('.NS')) exchange = 'NSE';
    if (afterPrefix.endsWith('.BO') || afterPrefix.endsWith('.BSE')) exchange = 'BSE';
  }

  const isIndian = Boolean(exchange) || isIndianStock(baseSymbol);
  return { baseSymbol, exchange, isIndian };
};

// Track API usage
const trackApiUsage = (apiName: string) => {
  const now = Date.now();
  const hourAgo = now - 3600000;
  
  const usage = apiUsageTracker.get(apiName) || { calls: 0, lastReset: now };
  
  // Reset counter if more than an hour has passed
  if (usage.lastReset < hourAgo) {
    usage.calls = 1;
    usage.lastReset = now;
  } else {
    usage.calls++;
  }
  
  apiUsageTracker.set(apiName, usage);
  return usage;
};

// Check if API limit is likely exceeded
const isApiLimitExceeded = (apiName: string): boolean => {
  const usage = apiUsageTracker.get(apiName);
  if (!usage) return false;
  
  const limits: Record<string, number> = {
    'alpha_vantage': 25,
    'twelve_data': 800,
    'finnhub': 60,
  };
  
  return usage.calls >= (limits[apiName] || Infinity);
};

// Get remaining API calls (estimated)
const getApiLimits = () => {
  const alphaVantage = apiUsageTracker.get('alpha_vantage') || { calls: 0, lastReset: Date.now() };
  const twelveData = apiUsageTracker.get('twelve_data') || { calls: 0, lastReset: Date.now() };
  const finnhub = apiUsageTracker.get('finnhub') || { calls: 0, lastReset: Date.now() };
  
  return {
    alpha_vantage: {
      used: alphaVantage.calls,
      limit: 25,
      remaining: Math.max(0, 25 - alphaVantage.calls),
      resetIn: Math.max(0, Math.ceil((alphaVantage.lastReset + 3600000 - Date.now()) / 60000)),
    },
    twelve_data: {
      used: twelveData.calls,
      limit: 800,
      remaining: Math.max(0, 800 - twelveData.calls),
      resetIn: Math.max(0, Math.ceil((twelveData.lastReset + 3600000 - Date.now()) / 60000)),
    },
    finnhub: {
      used: finnhub.calls,
      limit: 60,
      remaining: Math.max(0, 60 - finnhub.calls),
      resetIn: Math.max(0, Math.ceil((finnhub.lastReset + 60000 - Date.now()) / 1000)),
    },
    scraping: {
      calls: scrapingStats.calls,
      successes: scrapingStats.successes,
      failures: scrapingStats.failures,
      lastUsed: scrapingStats.lastUsed ? new Date(scrapingStats.lastUsed).toISOString() : null,
      status: 'unlimited',
    },
  };
};

// ============ YAHOO FINANCE WEB SCRAPING FALLBACK ============

// Format symbol for Yahoo Finance
const formatSymbolForYahoo = (sym: string): string => {
  const { baseSymbol, isIndian } = normalizeSymbol(sym);
  if (isIndian) {
    return `${baseSymbol}.NS`; // Yahoo uses .NS for NSE
  }
  return baseSymbol;
};

// Scrape stock quote from Yahoo Finance
const scrapeYahooQuote = async (symbol: string): Promise<any> => {
  const yahooSymbol = formatSymbolForYahoo(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`;
  
  console.log(`[SCRAPING] Fetching quote from Yahoo Finance for ${yahooSymbol}`);
  scrapingStats.calls++;
  scrapingStats.lastUsed = Date.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`[SCRAPING] Yahoo Finance HTTP error: ${response.status}`);
      scrapingStats.failures++;
      return null;
    }
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result) {
      console.error('[SCRAPING] Yahoo Finance: No result data');
      scrapingStats.failures++;
      return null;
    }
    
    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];
    const timestamps = result.timestamp;
    
    if (!meta || !quotes || !timestamps || timestamps.length === 0) {
      console.error('[SCRAPING] Yahoo Finance: Incomplete data');
      scrapingStats.failures++;
      return null;
    }
    
    // Get latest data point
    const lastIdx = timestamps.length - 1;
    const price = meta.regularMarketPrice || quotes.close?.[lastIdx] || 0;
    const previousClose = meta.previousClose || meta.chartPreviousClose || 0;
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
    
    const baseSym = symbol.split(':')[0].replace('.NS', '').replace('.BO', '').replace('.BSE', '');
    const currency = meta.currency || (isIndianStock(baseSym) ? 'INR' : 'USD');
    
    const transformedQuote = {
      symbol: baseSym,
      name: meta.shortName || meta.longName || baseSym,
      exchange: meta.exchangeName || (isIndianStock(baseSym) ? 'NSE' : 'NYSE'),
      currency: currency,
      datetime: new Date(timestamps[lastIdx] * 1000).toISOString(),
      open: quotes.open?.[lastIdx] || 0,
      high: quotes.high?.[lastIdx] || 0,
      low: quotes.low?.[lastIdx] || 0,
      close: price,
      volume: quotes.volume?.[lastIdx] || 0,
      previous_close: previousClose,
      change: parseFloat(change.toFixed(2)),
      percent_change: parseFloat(changePercent.toFixed(2)),
      is_market_open: meta.regularMarketTime ? (Date.now() / 1000 - meta.regularMarketTime < 300) : false,
      source: 'yahoo_scraping',
    };
    
    console.log(`[SCRAPING] Yahoo Finance quote success: ${baseSym} = ${price} ${currency}`);
    scrapingStats.successes++;
    return transformedQuote;
  } catch (err) {
    console.error('[SCRAPING] Yahoo Finance fetch error:', err);
    scrapingStats.failures++;
    return null;
  }
};

// Scrape time series from Yahoo Finance
const scrapeYahooTimeSeries = async (symbol: string, outputsize: number = 60): Promise<any> => {
  const yahooSymbol = formatSymbolForYahoo(symbol);
  // Get enough days of data
  const range = outputsize > 100 ? '1y' : outputsize > 30 ? '6mo' : '3mo';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=${range}`;
  
  console.log(`[SCRAPING] Fetching time series from Yahoo Finance for ${yahooSymbol}, range=${range}`);
  scrapingStats.calls++;
  scrapingStats.lastUsed = Date.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`[SCRAPING] Yahoo Finance time series HTTP error: ${response.status}`);
      scrapingStats.failures++;
      return null;
    }
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result) {
      console.error('[SCRAPING] Yahoo Finance time series: No result data');
      scrapingStats.failures++;
      return null;
    }
    
    const quotes = result.indicators?.quote?.[0];
    const timestamps = result.timestamp;
    
    if (!quotes || !timestamps) {
      console.error('[SCRAPING] Yahoo Finance time series: Incomplete data');
      scrapingStats.failures++;
      return null;
    }
    
    const values = [];
    for (let i = 0; i < timestamps.length && values.length < outputsize; i++) {
      const open = quotes.open?.[i];
      const high = quotes.high?.[i];
      const low = quotes.low?.[i];
      const close = quotes.close?.[i];
      const volume = quotes.volume?.[i];
      
      // Skip null/invalid entries
      if (open == null || high == null || low == null || close == null) continue;
      
      values.push({
        datetime: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: volume?.toString() || '0',
      });
    }
    
    // Yahoo returns oldest first, reverse for newest first
    values.reverse();
    
    console.log(`[SCRAPING] Yahoo Finance time series success: ${values.length} data points`);
    scrapingStats.successes++;
    return { values, source: 'yahoo_scraping' };
  } catch (err) {
    console.error('[SCRAPING] Yahoo Finance time series error:', err);
    scrapingStats.failures++;
    return null;
  }
};

// ============ MAIN SERVER ============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let ALPHA_VANTAGE_API_KEY = Deno.env.get('ALPHA_VANTAGE_API_KEY');
    let FINNHUB_API_KEY = Deno.env.get('FINNHUB_API_KEY');
    let TWELVE_DATA_API_KEY = Deno.env.get('TWELVE_DATA_API_KEY');
    
    const { action, symbol, interval, outputsize, symbols, userApiKeys } = await req.json();
    console.log(`Stock data request: action=${action}, symbol=${symbol}, interval=${interval}`);
    
    // Override with user-provided API keys if available
    if (userApiKeys) {
      if (userApiKeys.ALPHA_VANTAGE_API_KEY) {
        ALPHA_VANTAGE_API_KEY = userApiKeys.ALPHA_VANTAGE_API_KEY;
        console.log('Using user-provided Alpha Vantage API key');
      }
      if (userApiKeys.FINNHUB_API_KEY) {
        FINNHUB_API_KEY = userApiKeys.FINNHUB_API_KEY;
        console.log('Using user-provided Finnhub API key');
      }
      if (userApiKeys.TWELVE_DATA_API_KEY) {
        TWELVE_DATA_API_KEY = userApiKeys.TWELVE_DATA_API_KEY;
        console.log('Using user-provided Twelve Data API key');
      }
    }

    const ALPHA_VANTAGE_URL = 'https://www.alphavantage.co/query';
    const FINNHUB_URL = 'https://finnhub.io/api/v1';
    const TWELVE_DATA_URL = 'https://api.twelvedata.com';

    // Return API usage stats
    if (action === 'api_usage') {
      return new Response(JSON.stringify(getApiLimits()), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Reset API usage counters (called when user saves new API keys)
    if (action === 'reset_usage') {
      apiUsageTracker.clear();
      scrapingStats.calls = 0;
      scrapingStats.successes = 0;
      scrapingStats.failures = 0;
      scrapingStats.lastUsed = 0;
      return new Response(JSON.stringify({ success: true, message: 'Usage counters reset' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Helper to format symbol for Alpha Vantage
    const formatSymbolForAlphaVantage = (sym: string): string => {
      const { baseSymbol, exchange, isIndian } = normalizeSymbol(sym);
      if (isIndian) {
        return exchange === 'NSE' ? `${baseSymbol}.NSE` : `${baseSymbol}.BSE`;
      }
      return baseSymbol;
    };

    if (action === 'quote') {
      if (!ALPHA_VANTAGE_API_KEY && !TWELVE_DATA_API_KEY) {
        // No API keys at all — go straight to scraping
        console.log('[QUOTE] No API keys configured, using Yahoo Finance scraping');
        const scraped = await scrapeYahooQuote(symbol);
        if (scraped) {
          return new Response(JSON.stringify(scraped), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({ error: 'No API keys configured and scraping failed' }),
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

      // PRIMARY: Alpha Vantage (skip if limit exceeded)
      if (ALPHA_VANTAGE_API_KEY && !isApiLimitExceeded('alpha_vantage')) {
        const formattedSymbol = formatSymbolForAlphaVantage(symbol);
        const url = `${ALPHA_VANTAGE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(formattedSymbol)}&apikey=${ALPHA_VANTAGE_API_KEY}`;
        console.log(`Fetching quote from Alpha Vantage (PRIMARY) for ${formattedSymbol}`);

        try {
          trackApiUsage('alpha_vantage');
          const response = await fetch(url);
          const data = await response.json();
          console.log('Alpha Vantage response:', JSON.stringify(data).substring(0, 500));

          // Check for rate limit message
          if (data['Note'] || data['Information']?.includes('rate limit')) {
            console.warn('Alpha Vantage rate limit hit, marking as exceeded');
            const usage = apiUsageTracker.get('alpha_vantage');
            if (usage) usage.calls = 25; // Mark as exceeded
          } else if (data['Global Quote'] && Object.keys(data['Global Quote']).length > 0) {
            const quote = data['Global Quote'];
            
            const baseSym = symbol.split(':')[0].replace('.NS', '').replace('.BO', '').replace('.BSE', '');
            const currency = isIndianStock(baseSym) ? 'INR' : 'USD';

            const price = parseFloat(quote['05. price']) || 0;
            const previousClose = parseFloat(quote['08. previous close']) || 0;
            const change = parseFloat(quote['09. change']) || 0;
            const changePercent = parseFloat(quote['10. change percent']?.replace('%', '')) || 0;

            const transformedQuote = {
              symbol: quote['01. symbol']?.replace('.BSE', '').replace('.NSE', '') || symbol,
              name: quote['01. symbol']?.replace('.BSE', '').replace('.NSE', '') || symbol,
              exchange: isIndianStock(baseSym) ? 'NSE' : 'NYSE',
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
        } catch (err) {
          console.error('Alpha Vantage fetch error:', err);
        }
      } else if (isApiLimitExceeded('alpha_vantage')) {
        console.log('[QUOTE] Alpha Vantage limit exceeded, skipping');
      }

      // FALLBACK 1: Twelve Data (skip if limit exceeded)
      if (TWELVE_DATA_API_KEY && !isApiLimitExceeded('twelve_data')) {
        try {
          trackApiUsage('twelve_data');
          const baseSym = symbol.split(':')[0].replace('.NS', '').replace('.BO', '').replace('.BSE', '');
          const tdUrl = `${TWELVE_DATA_URL}/quote?symbol=${encodeURIComponent(baseSym)}&apikey=${TWELVE_DATA_API_KEY}`;
          
          const response = await fetch(tdUrl);
          const data = await response.json();
          
          if (response.ok && data && !data.code && data.close) {
            const currency = isIndianStock(baseSym) ? 'INR' : 'USD';
            const transformedQuote = {
              symbol: data.symbol || baseSym,
              name: data.name || baseSym,
              exchange: data.exchange || 'NYSE',
              currency: currency,
              datetime: data.datetime || new Date().toISOString(),
              open: data.open,
              high: data.high,
              low: data.low,
              close: data.close,
              volume: data.volume,
              previous_close: data.previous_close,
              change: data.change,
              percent_change: data.percent_change,
              is_market_open: data.is_market_open ?? true,
              fifty_two_week: data.fifty_two_week,
            };
            return cacheAndReturn(transformedQuote);
          }
          
          // Check for rate limit
          if (data?.code === 429 || data?.message?.includes('limit')) {
            console.warn('Twelve Data rate limit hit');
            const usage = apiUsageTracker.get('twelve_data');
            if (usage) usage.calls = 800;
          }
          
          console.error('Twelve Data quote error:', data?.message || data?.code || 'Unknown error');
        } catch (err) {
          console.error('Twelve Data fetch error:', err);
        }
      } else if (isApiLimitExceeded('twelve_data')) {
        console.log('[QUOTE] Twelve Data limit exceeded, skipping');
      }

      // FALLBACK 2: Yahoo Finance Web Scraping (no limit!)
      console.log('[QUOTE] All APIs exhausted or failed, falling back to Yahoo Finance scraping');
      const scraped = await scrapeYahooQuote(symbol);
      if (scraped) {
        return cacheAndReturn(scraped);
      }

      return cacheAndReturn({ error: 'All data sources failed (APIs + scraping)' });
    }

    if (action === 'batch_quote') {
      const symbolList = symbols || symbol;
      const requested = symbolList.split(',').map((s: string) => s.trim()).filter(Boolean);
      console.log(`Fetching batch quotes for ${requested.length} symbols`);

      const results: any[] = [];
      
      // Try Alpha Vantage first if available
      if (ALPHA_VANTAGE_API_KEY && !isApiLimitExceeded('alpha_vantage')) {
        for (const sym of requested.slice(0, 5)) {
          trackApiUsage('alpha_vantage');
          const formattedSymbol = formatSymbolForAlphaVantage(sym);
          const url = `${ALPHA_VANTAGE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(formattedSymbol)}&apikey=${ALPHA_VANTAGE_API_KEY}`;
          
          try {
            const response = await fetch(url);
            const data = await response.json();

            if (data['Note'] || data['Information']?.includes('rate limit')) {
              console.warn('Alpha Vantage rate limit hit during batch');
              const usage = apiUsageTracker.get('alpha_vantage');
              if (usage) usage.calls = 25;
              break; // Stop trying Alpha Vantage
            }

            if (data['Global Quote'] && Object.keys(data['Global Quote']).length > 0) {
              const quote = data['Global Quote'];
              const baseSym = sym.split(':')[0].replace('.NS', '').replace('.BO', '').replace('.BSE', '');
              const currency = isIndianStock(baseSym) ? 'INR' : 'USD';

              results.push({
                symbol: baseSym,
                name: baseSym,
                exchange: isIndianStock(baseSym) ? 'NSE' : 'NYSE',
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
            
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (err) {
            console.error(`Error fetching quote for ${sym}:`, err);
          }
        }
      }

      // For any remaining symbols not fetched, use Yahoo Finance scraping
      const fetchedSymbols = new Set(results.map(r => r.symbol.toUpperCase()));
      const remaining = requested.filter(sym => {
        const baseSym = sym.split(':')[0].replace('.NS', '').replace('.BO', '').replace('.BSE', '').toUpperCase();
        return !fetchedSymbols.has(baseSym);
      });

      if (remaining.length > 0) {
        console.log(`[BATCH] Scraping ${remaining.length} remaining symbols from Yahoo Finance`);
        for (const sym of remaining) {
          const scraped = await scrapeYahooQuote(sym);
          if (scraped) {
            results.push(scraped);
          }
          // Small delay to be polite
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'time_series' || action === 'history') {
      const size = outputsize || 100;
      const int = interval || '1day';
      
      // PRIMARY: Alpha Vantage for time series (skip if limit exceeded)
      if (ALPHA_VANTAGE_API_KEY && !isApiLimitExceeded('alpha_vantage')) {
        trackApiUsage('alpha_vantage');
        const formattedSymbol = formatSymbolForAlphaVantage(symbol);
        
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
        
        console.log(`Fetching time series from Alpha Vantage (PRIMARY) for ${formattedSymbol}`);

        try {
          const response = await fetch(url);
          const data = await response.json();

          // Check for rate limit
          if (data['Note'] || data['Information']?.includes('rate limit')) {
            console.warn('Alpha Vantage rate limit hit on time_series');
            const usage = apiUsageTracker.get('alpha_vantage');
            if (usage) usage.calls = 25;
          } else {
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
          }

          console.error('Alpha Vantage time series error:', data['Note'] || data['Error Message'] || 'No data');
        } catch (err) {
          console.error('Alpha Vantage time series error:', err);
        }
      } else if (isApiLimitExceeded('alpha_vantage')) {
        console.log('[TIME_SERIES] Alpha Vantage limit exceeded, skipping');
      }

      // FALLBACK 1: Twelve Data (skip if limit exceeded)
      if (TWELVE_DATA_API_KEY && !isApiLimitExceeded('twelve_data')) {
        try {
          trackApiUsage('twelve_data');
          const baseSym = symbol.split(':')[0].replace('.NS', '').replace('.BO', '').replace('.BSE', '');
          const intervalMap: Record<string, string> = {
            '1day': '1day',
            '1week': '1week',
            '1month': '1month',
            '1h': '1h',
            '4h': '4h',
          };
          const tdInterval = intervalMap[int] || '1day';
          
          const url = `${TWELVE_DATA_URL}/time_series?symbol=${encodeURIComponent(baseSym)}&interval=${tdInterval}&outputsize=${size}&apikey=${TWELVE_DATA_API_KEY}`;
          
          const response = await fetch(url);
          const data = await response.json();
          
          if (response.ok && data?.values && Array.isArray(data.values)) {
            return new Response(JSON.stringify({ values: data.values }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          if (data?.code === 429 || data?.message?.includes('limit')) {
            console.warn('Twelve Data rate limit on time_series');
            const usage = apiUsageTracker.get('twelve_data');
            if (usage) usage.calls = 800;
          }
          
          console.error('Twelve Data time series error:', data?.message || 'No data');
        } catch (err) {
          console.error('Twelve Data time series fetch error:', err);
        }
      } else if (isApiLimitExceeded('twelve_data')) {
        console.log('[TIME_SERIES] Twelve Data limit exceeded, skipping');
      }

      // FALLBACK 2: Yahoo Finance Web Scraping
      console.log('[TIME_SERIES] All APIs exhausted, falling back to Yahoo Finance scraping');
      const scraped = await scrapeYahooTimeSeries(symbol, size);
      if (scraped) {
        return new Response(JSON.stringify(scraped), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({ error: 'All data sources failed for time series (APIs + scraping)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'search') {
      if (!ALPHA_VANTAGE_API_KEY) {
        return new Response(
          JSON.stringify({ data: [], error: 'Search API key not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      trackApiUsage('alpha_vantage');
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
      if (!FINNHUB_API_KEY) {
        console.error('FINNHUB_API_KEY not configured');
        return new Response(JSON.stringify(getMockNews(symbol)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        trackApiUsage('finnhub');
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

function categorizeNews(category: string): 'earnings' | 'products' | 'market' | 'analyst' {
  const lowerCategory = category.toLowerCase();
  if (lowerCategory.includes('earn') || lowerCategory.includes('financ')) return 'earnings';
  if (lowerCategory.includes('product') || lowerCategory.includes('launch')) return 'products';
  if (lowerCategory.includes('analyst') || lowerCategory.includes('rating')) return 'analyst';
  return 'market';
}

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
