import { useState } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Bar, Line } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Stock, TimeSeriesPoint } from '@/types/stock';
import { cn } from '@/lib/utils';

interface StockChartProps {
  stock: Stock;
  timeSeries: TimeSeriesPoint[];
  predictionLine: Array<{ datetime: string; predicted: number }>;
  isMarketClosed?: boolean;
}

// Known Indian stock symbols
const INDIAN_STOCK_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'SBIN',
  'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT', 'AXISBANK', 'WIPRO', 'ASIANPAINT',
  'MARUTI', 'HCLTECH', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO', 'BAJFINANCE'
];

const isIndianStock = (symbol: string) => {
  const upperSymbol = symbol.toUpperCase();
  return symbol.includes('.NS') || symbol.includes('.BSE') || symbol.includes('.BO') || 
         symbol.includes('NSE:') || symbol.includes('BSE:') ||
         INDIAN_STOCK_SYMBOLS.includes(upperSymbol) ||
         INDIAN_STOCK_SYMBOLS.some(s => upperSymbol.includes(s));
};

export function StockChart({ stock, timeSeries, predictionLine, isMarketClosed }: StockChartProps) {
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('candlestick');
  
  const isPositive = stock.changePercent >= 0;
  const currencySymbol = isIndianStock(stock.symbol) ? '₹' : '$';
  
  // Prepare candlestick data with OHLC
  const candlestickData = timeSeries.map(point => ({
    datetime: point.datetime,
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close,
    volume: point.volume,
    bodyHeight: Math.abs(point.close - point.open),
    bodyBase: Math.min(point.open, point.close),
    isGreen: point.close >= point.open,
  }));

  // Get last actual price for connecting line
  const lastActualPrice = timeSeries.length > 0 ? timeSeries[timeSeries.length - 1] : null;
  const lastActualDate = lastActualPrice?.datetime || '';
  const lastActualClose = lastActualPrice?.close || 0;

  // Combine data for line chart with connection point between actual and predicted
  const lineChartData = [
    ...timeSeries.map(point => ({
      datetime: point.datetime,
      close: point.close,
      predicted: null as number | null,
      connectionPoint: null as number | null,
    })),
    // Add connection point - this creates the dotted line from last actual to first prediction
    ...(predictionLine.length > 0 && lastActualPrice ? [{
      datetime: lastActualDate,
      close: null as number | null,
      predicted: null as number | null,
      connectionPoint: lastActualClose,
    }] : []),
    ...predictionLine.map((point, idx) => ({
      datetime: point.datetime,
      close: null as number | null,
      predicted: point.predicted,
      connectionPoint: idx === 0 ? point.predicted : null,
    })),
  ];

  const formatPrice = (price: number) => `${currencySymbol}${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Calculate Y domain for candlestick
  const allPrices = timeSeries.flatMap(p => [p.high, p.low]);
  const predictionPrices = predictionLine.map(p => p.predicted);
  const allChartPrices = [...allPrices, ...predictionPrices].filter(Boolean);
  const minPrice = allChartPrices.length > 0 ? Math.min(...allChartPrices) * 0.995 : 0;
  const maxPrice = allChartPrices.length > 0 ? Math.max(...allChartPrices) * 1.005 : 100;

  const CustomCandlestickTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-2">{data.datetime}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Open:</span>
            <span className="font-mono text-foreground">{currencySymbol}{data.open?.toFixed(2)}</span>
            <span className="text-muted-foreground">High:</span>
            <span className="font-mono text-gain">{currencySymbol}{data.high?.toFixed(2)}</span>
            <span className="text-muted-foreground">Low:</span>
            <span className="font-mono text-loss">{currencySymbol}{data.low?.toFixed(2)}</span>
            <span className="text-muted-foreground">Close:</span>
            <span className={cn("font-mono", data.isGreen ? "text-gain" : "text-loss")}>
              {currencySymbol}{data.close?.toFixed(2)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      const isPrediction = data.predicted !== null;
      const price = data.close || data.predicted;
      
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">{data.datetime}</p>
          <p className="font-mono text-foreground text-lg">
            {currencySymbol}{price?.toFixed(2)}
          </p>
          {isPrediction && (
            <span className="text-xs text-chartPrediction font-medium">Predicted</span>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-foreground">{stock.symbol.split(':')[0].replace('.NS', '')}</h2>
            <span className="text-sm text-muted-foreground">{stock.name}</span>
            {isMarketClosed && (
              <span className="px-2 py-1 rounded bg-loss/20 text-loss text-xs font-medium">
                Market Closed
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-3xl font-bold font-mono tabular-nums text-foreground">
              {formatPrice(stock.price)}
            </span>
            <span className={cn(
              "flex items-center text-lg font-semibold",
              isPositive ? "text-gain" : "text-loss"
            )}>
              {isPositive ? <TrendingUp className="w-5 h-5 mr-1" /> : <TrendingDown className="w-5 h-5 mr-1" />}
              {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Prev Close: <span className="font-mono">{formatPrice(stock.previousClose)}</span>
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={chartType === 'line' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('line')}
          >
            Line
          </Button>
          <Button
            variant={chartType === 'candlestick' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('candlestick')}
          >
            Candlestick
          </Button>
        </div>
      </div>
      
      <div className="h-[350px]">
        {chartType === 'candlestick' ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={candlestickData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <XAxis 
                dataKey="datetime" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => value.slice(5, 10)}
              />
              <YAxis 
                domain={[minPrice, maxPrice]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => `${currencySymbol}${value}`}
                orientation="right"
              />
              <Tooltip content={<CustomCandlestickTooltip />} />
              
              {/* Candlestick wicks and bodies using Bar */}
              <Bar 
                dataKey="bodyHeight" 
                fill="transparent"
                shape={(props: any) => {
                  const { x, y, width, payload } = props;
                  if (!payload) return null;
                  
                  const isGreen = payload.close >= payload.open;
                  const color = isGreen ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)';
                  
                  const yAxisHeight = 350 - 40;
                  const priceRange = maxPrice - minPrice;
                  const yScale = (price: number) => {
                    return 10 + ((maxPrice - price) / priceRange) * yAxisHeight;
                  };
                  
                  const highY = yScale(payload.high);
                  const lowY = yScale(payload.low);
                  const openY = yScale(payload.open);
                  const closeY = yScale(payload.close);
                  const bodyTop = Math.min(openY, closeY);
                  const bodyHeight = Math.max(Math.abs(openY - closeY), 1);
                  
                  return (
                    <g>
                      {/* Wick */}
                      <line
                        x1={x + width / 2}
                        y1={highY}
                        x2={x + width / 2}
                        y2={lowY}
                        stroke={color}
                        strokeWidth={1}
                      />
                      {/* Body */}
                      <rect
                        x={x + 1}
                        y={bodyTop}
                        width={Math.max(width - 2, 3)}
                        height={bodyHeight}
                        fill={color}
                        stroke={color}
                      />
                    </g>
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={lineChartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <XAxis 
                dataKey="datetime" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => value.slice(5, 10)}
              />
              <YAxis 
                domain={[minPrice, maxPrice]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => `${currencySymbol}${value}`}
                orientation="right"
              />
              <Tooltip content={<CustomLineTooltip />} />
              
              {/* Historical price line - solid */}
              <Line
                type="monotone"
                dataKey="close"
                stroke="hsl(var(--chart-line))"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              
              {/* Connection line between actual and predicted - dotted */}
              <Line
                type="monotone"
                dataKey="connectionPoint"
                stroke="hsl(var(--chart-prediction))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={true}
              />
              
              {/* Predicted price line - dotted */}
              {predictionLine.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="hsl(var(--chart-prediction))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: 'hsl(var(--chart-prediction))', strokeWidth: 0, r: 3 }}
                  connectNulls={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      
      <div className="flex items-center gap-6 mt-4 text-sm">
        {chartType === 'candlestick' ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gain rounded-sm" />
              <span className="text-muted-foreground">Bullish (Close &gt; Open)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-loss rounded-sm" />
              <span className="text-muted-foreground">Bearish (Close &lt; Open)</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-[hsl(var(--chart-line))]" />
              <span className="text-muted-foreground">Historical Price</span>
            </div>
            {predictionLine.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 border-t-2 border-dashed border-[hsl(var(--chart-prediction))]" />
                <span className="text-muted-foreground">Predicted Price</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
