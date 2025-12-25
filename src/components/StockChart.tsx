import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Stock, TimeSeriesPoint } from '@/types/stock';
import { cn } from '@/lib/utils';

interface StockChartProps {
  stock: Stock;
  timeSeries: TimeSeriesPoint[];
  predictionLine: Array<{ datetime: string; predicted: number }>;
}

export function StockChart({ stock, timeSeries, predictionLine }: StockChartProps) {
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');
  
  const isPositive = stock.changePercent >= 0;
  
  // Combine historical and prediction data
  const chartData = [
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

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{stock.symbol}</h2>
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
      
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
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
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke="hsl(var(--chart-line))"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="hsl(var(--chart-prediction))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-chartLine" />
          <span className="text-muted-foreground">Historical Price</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-chartPrediction" style={{ borderTop: '2px dashed' }} />
          <span className="text-muted-foreground">Predicted Price</span>
        </div>
      </div>
    </div>
  );
}
