import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TimeSeriesData {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface QuoteData {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  average_volume: string;
  fifty_two_week: {
    low: string;
    high: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get('TWELVE_DATA_API_KEY');
    if (!API_KEY) {
      console.error('TWELVE_DATA_API_KEY not configured');
      throw new Error('API key not configured');
    }

    const { action, symbol, interval, outputsize } = await req.json();
    console.log(`Stock data request: action=${action}, symbol=${symbol}, interval=${interval}`);

    const BASE_URL = 'https://api.twelvedata.com';

    if (action === 'quote') {
      // Get real-time quote for a symbol
      const url = `${BASE_URL}/quote?symbol=${symbol}&apikey=${API_KEY}`;
      console.log(`Fetching quote for ${symbol}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'error' || data.code) {
        console.error('Quote API error:', data.message || data.code);
        throw new Error(data.message || 'Failed to fetch quote');
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'time_series') {
      // Get historical time series data
      const size = outputsize || 100;
      const int = interval || '1day';
      const url = `${BASE_URL}/time_series?symbol=${symbol}&interval=${int}&outputsize=${size}&apikey=${API_KEY}`;
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
      // Search for symbols
      const url = `${BASE_URL}/symbol_search?symbol=${symbol}&apikey=${API_KEY}`;
      console.log(`Searching symbols for ${symbol}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'error' || data.code) {
        console.error('Search API error:', data.message || data.code);
        throw new Error(data.message || 'Failed to search symbols');
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'batch_quote') {
      // Get quotes for multiple symbols
      const symbols = symbol; // comma-separated string
      const url = `${BASE_URL}/quote?symbol=${symbols}&apikey=${API_KEY}`;
      console.log(`Fetching batch quotes for ${symbols}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      return new Response(JSON.stringify(data), {
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
