import { useState } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Bar, Cell, Line, ReferenceLine } from 'recharts';
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

// Custom candlestick shape
const CandlestickBar = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;
  
  const { open, close, high, low } = payload;
  const isGreen = close >= open;
  const color = isGreen ? 'hsl(var(--gain))' : 'hsl(var(--loss))';
  
  const bodyTop = Math.min(open, close);
  const bodyBottom = Math.max(open, close);
  
  // Calculate positions relative to the chart
  const yScale = props.yScale || ((v: number) => v);
  
  return (
    <g>
      {/* Wick (high to low line) */}
      <line
        x1={x + width / 2}
        y1={yScale(high)}
        x2={x + width / 2}
        y2={yScale(low)}
        stroke={color}
        strokeWidth={1}
      />
      {/* Body */}
      <rect
        x={x + 2}
        y={yScale(bodyBottom)}
        width={Math.max(width - 4, 2)}
        height={Math.max(Math.abs(yScale(bodyTop) - yScale(bodyBottom)), 1)}
        fill={isGreen ? color : color}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};

export function StockChart({ stock, timeSeries, predictionLine, isMarketClosed }: StockChartProps) {
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('candlestick');
  
  const isPositive = stock.changePercent >= 0;
  
  // Prepare candlestick data with OHLC
  const candlestickData = timeSeries.map(point => ({
    datetime: point.datetime,
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close,
    volume: point.volume,
    // For candlestick bar height (body)
    bodyHeight: Math.abs(point.close - point.open),
    bodyBase: Math.min(point.open, point.close),
    isGreen: point.close >= point.open,
  }));

  // Combine for line chart mode
  const lineChartData = [
    ...timeSeries.map(point => ({
      datetime: point.datetime,
      close: point.close,
      predicted: null as number | null,
    })),
    ...predictionLine.map(point => ({
      datetime: point.datetime,
      close: null as number | null,
      predicted: point.predicted,
    })),
  ];

  const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Calculate Y domain for candlestick
  const allPrices = timeSeries.flatMap(p => [p.high, p.low]);
  const minPrice = Math.min(...allPrices) * 0.995;
  const maxPrice = Math.max(...allPrices) * 1.005;

  const CustomCandlestickTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-2">{data.datetime}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Open:</span>
            <span className="font-mono text-foreground">₹{data.open?.toFixed(2)}</span>
            <span className="text-muted-foreground">High:</span>
            <span className="font-mono text-gain">₹{data.high?.toFixed(2)}</span>
            <span className="text-muted-foreground">Low:</span>
            <span className="font-mono text-loss">₹{data.low?.toFixed(2)}</span>
            <span className="text-muted-foreground">Close:</span>
            <span className={cn("font-mono", data.isGreen ? "text-gain" : "text-loss")}>
              ₹{data.close?.toFixed(2)}
            </span>
          </div>
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
            <h2 className="text-2xl font-bold text-foreground">{stock.symbol.split(':')[0]}</h2>
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
                tickFormatter={(value) => `₹${value}`}
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
                  
                  // Get the Y scale from the chart
                  const yAxisHeight = 350 - 40; // Approximate chart height minus margins
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
            <ComposedChart data={lineChartData}>
              <XAxis 
                dataKey="datetime" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => value.slice(5, 10)}
              />
              <YAxis 
                domain={['auto', 'auto']}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => `₹${value}`}
                orientation="right"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number, name: string) => [
                  `₹${value?.toFixed(2)}`,
                  name === 'close' ? 'Price' : 'Predicted'
                ]}
              />
              <Line
                type="monotone"
                dataKey="close"
                stroke="hsl(var(--chart-line))"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              {!isMarketClosed && predictionLine.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="hsl(var(--chart-prediction))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
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
              <div className="w-4 h-0.5 bg-chartLine" />
              <span className="text-muted-foreground">Historical Price</span>
            </div>
            {!isMarketClosed && predictionLine.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-chartPrediction" style={{ borderTop: '2px dashed' }} />
                <span className="text-muted-foreground">Predicted Price</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
