import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { timeSeries, symbol, days = 14 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!timeSeries || timeSeries.length < 5) {
      return new Response(
        JSON.stringify({ error: 'Insufficient time series data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare data summary for AI
    const recentData = timeSeries.slice(0, Math.min(30, timeSeries.length));
    const dataForAnalysis = recentData.map((point: any) => ({
      date: point.datetime,
      open: parseFloat(point.open),
      high: parseFloat(point.high),
      low: parseFloat(point.low),
      close: parseFloat(point.close),
      volume: parseInt(point.volume),
    }));

    // Calculate technical indicators for context
    const closes = dataForAnalysis.map((d: any) => d.close);
    const avgPrice = closes.reduce((a: number, b: number) => a + b, 0) / closes.length;
    const volatility = Math.sqrt(closes.reduce((sum: number, c: number) => sum + Math.pow(c - avgPrice, 2), 0) / closes.length);
    const trend = closes[0] > closes[closes.length - 1] ? 'upward' : 'downward';
    const priceRange = Math.max(...closes) - Math.min(...closes);

    const systemPrompt = `You are an advanced stock price prediction AI. Analyze historical stock data and predict future closing prices.

Your predictions should be based on:
1. Recent price trends and momentum
2. Price volatility patterns
3. Support and resistance levels
4. Volume analysis
5. Mean reversion tendencies

Respond with a JSON array of predictions. Each prediction should have:
- date: the prediction date
- predictedClose: your predicted closing price
- confidence: your confidence level (0-100)
- reasoning: brief explanation

Be realistic and factor in:
- Historical volatility (typically ±${(volatility / avgPrice * 100).toFixed(2)}% for this stock)
- Recent trend: ${trend}
- Average price: ${avgPrice.toFixed(2)}
- Price range: ${priceRange.toFixed(2)}`;

    const userPrompt = `Analyze this stock data for ${symbol} and provide predictions for the next ${days} trading days.

Recent historical data (most recent first):
${JSON.stringify(dataForAnalysis.slice(0, 15), null, 2)}

Technical Summary:
- Current price: ${closes[0].toFixed(2)}
- 5-day average: ${closes.slice(0, 5).reduce((a: number, b: number) => a + b, 0) / 5}
- 10-day average: ${closes.slice(0, 10).reduce((a: number, b: number) => a + b, 0) / Math.min(10, closes.length)}
- Volatility: ${(volatility / avgPrice * 100).toFixed(2)}%
- Trend: ${trend}

Generate ${days} daily predictions starting from the day after the most recent data point.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_predictions',
              description: 'Generate stock price predictions',
              parameters: {
                type: 'object',
                properties: {
                  predictions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        date: { type: 'string', description: 'Prediction date in YYYY-MM-DD format' },
                        predictedClose: { type: 'number', description: 'Predicted closing price' },
                        confidence: { type: 'number', description: 'Confidence level 0-100' },
                        reasoning: { type: 'string', description: 'Brief explanation for this prediction' }
                      },
                      required: ['date', 'predictedClose', 'confidence'],
                      additionalProperties: false
                    }
                  },
                  overallAnalysis: {
                    type: 'string',
                    description: 'Overall market analysis and prediction summary'
                  }
                },
                required: ['predictions'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_predictions' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI response received');

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error('Invalid AI response format');
    }

    const predictions = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ 
        predictions: predictions.predictions,
        overallAnalysis: predictions.overallAnalysis,
        modelUsed: 'AI-Enhanced Technical Analysis',
        generatedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Stock prediction error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
