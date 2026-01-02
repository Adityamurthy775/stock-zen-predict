import { useState, useMemo } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Bar, Line, ReferenceLine, Area } from 'recharts';
import { TrendingUp, TrendingDown, Activity, BarChart3, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Stock, TimeSeriesPoint } from '@/types/stock';
import { cn } from '@/lib/utils';
import { calculateIndicators } from '@/utils/technicalIndicators';

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

type IndicatorType = 'none' | 'rsi' | 'macd' | 'bollinger';

export function StockChart({ stock, timeSeries, predictionLine, isMarketClosed }: StockChartProps) {
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('candlestick');
  const [activeIndicator, setActiveIndicator] = useState<IndicatorType>('none');
  
  const isPositive = stock.changePercent >= 0;
  const currencySymbol = isIndianStock(stock.symbol) ? '₹' : '$';

  // Calculate technical indicators
  const indicators = useMemo(() => {
    if (timeSeries.length < 30) return null;
    return calculateIndicators(timeSeries);
  }, [timeSeries]);
  
  // Prepare candlestick data with OHLC and Bollinger Bands
  const candlestickData = useMemo(() => {
    return timeSeries.map((point, i) => ({
      datetime: point.datetime,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
      bodyHeight: Math.abs(point.close - point.open),
      bodyBase: Math.min(point.open, point.close),
      isGreen: point.close >= point.open,
      bollingerUpper: indicators?.bollinger[i]?.upper || null,
      bollingerMiddle: indicators?.bollinger[i]?.middle || null,
      bollingerLower: indicators?.bollinger[i]?.lower || null,
    }));
  }, [timeSeries, indicators]);

  // Get last actual price for connecting line
  const lastActualPrice = timeSeries.length > 0 ? timeSeries[timeSeries.length - 1] : null;
  const lastActualDate = lastActualPrice?.datetime || '';
  const lastActualClose = lastActualPrice?.close || 0;

  // Combine data for line chart with connection point between actual and predicted
  const lineChartData = useMemo(() => [
    ...timeSeries.map((point, i) => ({
      datetime: point.datetime,
      close: point.close,
      predicted: null as number | null,
      connectionPoint: null as number | null,
      bollingerUpper: indicators?.bollinger[i]?.upper || null,
      bollingerMiddle: indicators?.bollinger[i]?.middle || null,
      bollingerLower: indicators?.bollinger[i]?.lower || null,
    })),
    // Add connection point - this creates the dotted line from last actual to first prediction
    ...(predictionLine.length > 0 && lastActualPrice ? [{
      datetime: lastActualDate,
      close: null as number | null,
      predicted: null as number | null,
      connectionPoint: lastActualClose,
      bollingerUpper: null,
      bollingerMiddle: null,
      bollingerLower: null,
    }] : []),
    ...predictionLine.map((point, idx) => ({
      datetime: point.datetime,
      close: null as number | null,
      predicted: point.predicted,
      connectionPoint: idx === 0 ? point.predicted : null,
      bollingerUpper: null,
      bollingerMiddle: null,
      bollingerLower: null,
    })),
  ], [timeSeries, predictionLine, indicators, lastActualPrice, lastActualDate, lastActualClose]);

  const formatPrice = (price: number) => `${currencySymbol}${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Calculate Y domain for candlestick
  const allPrices = timeSeries.flatMap(p => [p.high, p.low]);
  const predictionPrices = predictionLine.map(p => p.predicted);
  const bollingerPrices = indicators?.bollinger.flatMap(b => [b.upper, b.lower]).filter(Boolean) || [];
  const allChartPrices = [...allPrices, ...predictionPrices, ...bollingerPrices].filter(Boolean) as number[];
  const minPrice = allChartPrices.length > 0 ? Math.min(...allChartPrices) * 0.995 : 0;
  const maxPrice = allChartPrices.length > 0 ? Math.max(...allChartPrices) * 1.005 : 100;

  // Latest indicator values
  const latestRSI = indicators?.rsi.filter(r => r.value !== null).slice(-1)[0]?.value;
  const latestMACD = indicators?.macd.filter(m => m.macd !== null).slice(-1)[0];

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
            {data.bollingerUpper && (
              <>
                <span className="text-muted-foreground">BB Upper:</span>
                <span className="font-mono text-blue-400">{currencySymbol}{data.bollingerUpper?.toFixed(2)}</span>
                <span className="text-muted-foreground">BB Lower:</span>
                <span className="font-mono text-blue-400">{currencySymbol}{data.bollingerLower?.toFixed(2)}</span>
              </>
            )}
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
          {data.bollingerUpper && (
            <div className="mt-2 text-xs">
              <p className="text-blue-400">BB: {currencySymbol}{data.bollingerLower?.toFixed(2)} - {currencySymbol}{data.bollingerUpper?.toFixed(2)}</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const RSITooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      const rsiValue = data.value;
      
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">{data.datetime}</p>
          <p className={cn(
            "font-mono text-lg font-bold",
            rsiValue > 70 ? "text-loss" : rsiValue < 30 ? "text-gain" : "text-foreground"
          )}>
            RSI: {rsiValue?.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">
            {rsiValue > 70 ? "Overbought" : rsiValue < 30 ? "Oversold" : "Neutral"}
          </p>
        </div>
      );
    }
    return null;
  };

  const MACDTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">{data.datetime}</p>
          <div className="space-y-1 text-sm">
            <p className="font-mono"><span className="text-blue-400">MACD:</span> {data.macd?.toFixed(4)}</p>
            <p className="font-mono"><span className="text-orange-400">Signal:</span> {data.signal?.toFixed(4)}</p>
            <p className={cn("font-mono", data.histogram > 0 ? "text-gain" : "text-loss")}>
              Histogram: {data.histogram?.toFixed(4)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const getRSIColor = (value: number) => {
    if (value > 70) return 'hsl(0, 72%, 51%)';
    if (value < 30) return 'hsl(152, 69%, 45%)';
    return 'hsl(45, 93%, 58%)';
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

      {/* Technical Indicators Tabs */}
      <div className="mb-4">
        <Tabs value={activeIndicator} onValueChange={(v) => setActiveIndicator(v as IndicatorType)}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="none" className="text-xs">Price Only</TabsTrigger>
            <TabsTrigger value="bollinger" className="text-xs gap-1">
              <Waves className="w-3 h-3" /> Bollinger
            </TabsTrigger>
            <TabsTrigger value="rsi" className="text-xs gap-1">
              <Activity className="w-3 h-3" /> RSI
            </TabsTrigger>
            <TabsTrigger value="macd" className="text-xs gap-1">
              <BarChart3 className="w-3 h-3" /> MACD
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Indicator Summary Cards */}
      {activeIndicator !== 'none' && indicators && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {activeIndicator === 'rsi' && latestRSI !== undefined && (
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs text-muted-foreground">RSI (14)</p>
              <p className={cn(
                "text-xl font-bold font-mono",
                latestRSI > 70 ? "text-loss" : latestRSI < 30 ? "text-gain" : "text-[hsl(var(--warning))]"
              )}>
                {latestRSI?.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {latestRSI > 70 ? "Overbought" : latestRSI < 30 ? "Oversold" : "Neutral"}
              </p>
            </div>
          )}
          {activeIndicator === 'macd' && latestMACD && (
            <>
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs text-muted-foreground">MACD</p>
                <p className="text-xl font-bold font-mono text-blue-400">
                  {latestMACD.macd?.toFixed(4)}
                </p>
              </div>
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Signal</p>
                <p className="text-xl font-bold font-mono text-orange-400">
                  {latestMACD.signal?.toFixed(4)}
                </p>
              </div>
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Histogram</p>
                <p className={cn(
                  "text-xl font-bold font-mono",
                  (latestMACD.histogram || 0) > 0 ? "text-gain" : "text-loss"
                )}>
                  {latestMACD.histogram?.toFixed(4)}
                </p>
              </div>
            </>
          )}
          {activeIndicator === 'bollinger' && (
            <>
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Upper Band</p>
                <p className="text-lg font-bold font-mono text-blue-400">
                  {currencySymbol}{indicators.bollinger.filter(b => b.upper !== null).slice(-1)[0]?.upper?.toFixed(2)}
                </p>
              </div>
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Middle (SMA 20)</p>
                <p className="text-lg font-bold font-mono text-foreground">
                  {currencySymbol}{indicators.bollinger.filter(b => b.middle !== null).slice(-1)[0]?.middle?.toFixed(2)}
                </p>
              </div>
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Lower Band</p>
                <p className="text-lg font-bold font-mono text-blue-400">
                  {currencySymbol}{indicators.bollinger.filter(b => b.lower !== null).slice(-1)[0]?.lower?.toFixed(2)}
                </p>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Main Chart */}
      <div className="h-[350px]">
        {chartType === 'candlestick' ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={[...candlestickData, ...predictionLine.map(p => ({ ...p, isPrediction: true }))]} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
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
              
              {/* Bollinger Bands */}
              {activeIndicator === 'bollinger' && (
                <>
                  <Area
                    type="monotone"
                    dataKey="bollingerUpper"
                    stroke="transparent"
                    fill="hsl(217, 91%, 60%)"
                    fillOpacity={0.1}
                  />
                  <Line
                    type="monotone"
                    dataKey="bollingerUpper"
                    stroke="hsl(217, 91%, 60%)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="bollingerMiddle"
                    stroke="hsl(45, 93%, 58%)"
                    strokeWidth={1}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="bollingerLower"
                    stroke="hsl(217, 91%, 60%)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </>
              )}
              
              {/* Candlestick wicks and bodies using Bar */}
              <Bar 
                dataKey="bodyHeight" 
                fill="transparent"
                shape={(props: any) => {
                  const { x, y, width, payload } = props;
                  if (!payload || payload.isPrediction) return null;
                  
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
              
              {/* Prediction line - dotted */}
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
              
              {/* Bollinger Bands */}
              {activeIndicator === 'bollinger' && (
                <>
                  <Area
                    type="monotone"
                    dataKey="bollingerUpper"
                    stroke="transparent"
                    fill="hsl(217, 91%, 60%)"
                    fillOpacity={0.1}
                  />
                  <Line
                    type="monotone"
                    dataKey="bollingerUpper"
                    stroke="hsl(217, 91%, 60%)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="bollingerMiddle"
                    stroke="hsl(45, 93%, 58%)"
                    strokeWidth={1}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="bollingerLower"
                    stroke="hsl(217, 91%, 60%)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </>
              )}
              
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

      {/* RSI Chart */}
      {activeIndicator === 'rsi' && indicators && (
        <div className="mt-4 h-[120px] border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-2">RSI (14) - Relative Strength Index</p>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={indicators.rsi} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <XAxis 
                dataKey="datetime" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => value.slice(5, 10)}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                orientation="right"
                ticks={[30, 50, 70]}
              />
              <Tooltip content={<RSITooltip />} />
              <ReferenceLine y={70} stroke="hsl(0, 72%, 51%)" strokeDasharray="3 3" strokeOpacity={0.5} />
              <ReferenceLine y={30} stroke="hsl(152, 69%, 45%)" strokeDasharray="3 3" strokeOpacity={0.5} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(45, 93%, 58%)"
                fill="hsl(45, 93%, 58%)"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* MACD Chart */}
      {activeIndicator === 'macd' && indicators && (
        <div className="mt-4 h-[120px] border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-2">MACD (12, 26, 9)</p>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={indicators.macd} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <XAxis 
                dataKey="datetime" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => value.slice(5, 10)}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                orientation="right"
              />
              <Tooltip content={<MACDTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
              <Bar
                dataKey="histogram"
                fill="hsl(152, 69%, 45%)"
                shape={(props: any) => {
                  const { x, y, width, height, payload } = props;
                  const isPositive = (payload.histogram || 0) >= 0;
                  return (
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={Math.abs(height)}
                      fill={isPositive ? 'hsl(152, 69%, 45%)' : 'hsl(0, 72%, 51%)'}
                      fillOpacity={0.6}
                    />
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="macd"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="signal"
                stroke="hsl(25, 95%, 53%)"
                strokeWidth={1.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      
      <div className="flex items-center gap-6 mt-4 text-sm flex-wrap">
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
            {predictionLine.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 border-t-2 border-dashed border-[hsl(var(--chart-prediction))]" />
                <span className="text-muted-foreground">Predicted Price</span>
              </div>
            )}
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
        {activeIndicator === 'bollinger' && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-blue-400" />
            <span className="text-muted-foreground">Bollinger Bands</span>
          </div>
        )}
      </div>
    </div>
  );
}
