import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { Prediction, PredictionPeriod } from '@/types/stock';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface PredictionPanelProps {
  prediction: Prediction;
  period: PredictionPeriod;
  onPeriodChange: (period: PredictionPeriod) => void;
  isMarketClosed?: boolean;
  stockSymbol?: string;
  currentPrice?: number;
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

// Generate prediction chart data with dotted forecast line
const generatePredictionChartData = (
  currentPrice: number,
  predictedPrice: number,
  lowerBound: number,
  upperBound: number,
  period: PredictionPeriod
) => {
  const periodDays: Record<PredictionPeriod, number> = {
    '1d': 1,
    '5d': 5,
    '15d': 15,
    '3m': 90,
  };
  
  const days = periodDays[period];
  const data = [];
  const today = new Date();
  
  // Historical simulated data (last 5 points)
  for (let i = 5; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const variation = (Math.random() - 0.5) * 0.02 * currentPrice;
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: Number((currentPrice + variation - (currentPrice - predictedPrice) * (i / 10)).toFixed(2)),
      predicted: null,
      upperBound: null,
      lowerBound: null,
      isToday: false,
      isFuture: false,
    });
  }
  
  // Today's point (connects historical to prediction)
  data.push({
    date: 'Today',
    price: currentPrice,
    predicted: currentPrice,
    upperBound: null,
    lowerBound: null,
    isToday: true,
    isFuture: false,
  });
  
  // Future prediction points with dotted line
  const priceStep = (predictedPrice - currentPrice) / days;
  const upperStep = (upperBound - currentPrice) / days;
  const lowerStep = (lowerBound - currentPrice) / days;
  
  const futurePoints = Math.min(days, 10); // Cap at 10 points for readability
  const stepMultiplier = days / futurePoints;
  
  for (let i = 1; i <= futurePoints; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + Math.round(i * stepMultiplier));
    const progress = (i * stepMultiplier) / days;
    
    data.push({
      date: futureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: null,
      predicted: Number((currentPrice + priceStep * i * stepMultiplier).toFixed(2)),
      upperBound: Number((currentPrice + upperStep * i * stepMultiplier).toFixed(2)),
      lowerBound: Number((currentPrice + lowerStep * i * stepMultiplier).toFixed(2)),
      isToday: false,
      isFuture: true,
    });
  }
  
  return data;
};

export function PredictionPanel({ prediction, period, onPeriodChange, isMarketClosed, stockSymbol = '', currentPrice }: PredictionPanelProps) {
  const isPositive = prediction.changePercent >= 0;
  const currencySymbol = isIndianStock(stockSymbol) ? '₹' : '$';
  const actualCurrentPrice = currentPrice || prediction.predictedPrice - prediction.priceChange;
  
  const chartData = useMemo(() => {
    return generatePredictionChartData(
      actualCurrentPrice,
      prediction.predictedPrice,
      prediction.lowerBound,
      prediction.upperBound,
      period
    );
  }, [actualCurrentPrice, prediction, period]);
  
  const formatPrice = (price: number) => {
    return `${currencySymbol}${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };
  
  const periodLabels: Record<PredictionPeriod, string> = {
    '1d': '1 Day',
    '5d': '5 Days',
    '15d': 'Half Month',
    '3m': 'Quarterly',
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'High confidence - Strong signal';
    if (confidence >= 60) return 'Moderate confidence - Proceed with caution';
    return 'Low confidence - High uncertainty';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-foreground mb-2">{label}</p>
        {payload.map((entry: any, idx: number) => {
          if (entry.value === null) return null;
          return (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">{formatPrice(entry.value)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Price Prediction</h3>
          {isMarketClosed && (
            <span className="px-2 py-1 rounded bg-loss/20 text-loss text-xs font-medium">
              Market Closed
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => onPeriodChange(v as PredictionPeriod)}>
            <SelectTrigger className="w-[160px] bg-secondary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">1 Day</SelectItem>
              <SelectItem value="5d">5 Days</SelectItem>
              <SelectItem value="15d">Half Month (15 Days)</SelectItem>
              <SelectItem value="3m">Quarterly (3 Months)</SelectItem>
            </SelectContent>
          </Select>
          
          <span className={cn(
            "px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1",
            prediction.trend === 'bullish' 
              ? "bg-gain/20 text-gain" 
              : prediction.trend === 'bearish'
              ? "bg-loss/20 text-loss"
              : "bg-muted text-muted-foreground"
          )}>
            {prediction.trend === 'bullish' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {prediction.trend.charAt(0).toUpperCase() + prediction.trend.slice(1)}
          </span>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Predicted for {new Date(prediction.targetDate).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
        {' '}({periodLabels[period]} forecast)
      </p>
      
      {/* Prediction Chart with Dotted Forecast Line */}
      <div className="bg-secondary/50 rounded-lg p-4 mb-6">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={11}
              tickLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={11}
              tickFormatter={(v) => `${currencySymbol}${v.toLocaleString()}`}
              domain={['auto', 'auto']}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Upper Bound - dotted area */}
            <Line
              type="monotone"
              dataKey="upperBound"
              name="Upper Bound"
              stroke="hsl(var(--chart-up))"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
              strokeOpacity={0.5}
            />
            
            {/* Lower Bound - dotted area */}
            <Line
              type="monotone"
              dataKey="lowerBound"
              name="Lower Bound"
              stroke="hsl(var(--chart-down))"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
              strokeOpacity={0.5}
            />
            
            {/* Historical Price - solid line */}
            <Line
              type="monotone"
              dataKey="price"
              name="Historical"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={{ r: 3, fill: 'white', stroke: 'hsl(var(--chart-1))', strokeWidth: 1 }}
              activeDot={{ r: 5, fill: 'white', stroke: 'hsl(var(--chart-1))' }}
              connectNulls={false}
            />
            
            {/* Predicted Price - dotted line */}
            <Line
              type="monotone"
              dataKey="predicted"
              name="Predicted"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              dot={{ r: 4, fill: 'white', stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: 'white', stroke: 'hsl(var(--primary))' }}
              connectNulls={false}
            />
            
            {/* Reference line for today */}
            <ReferenceLine 
              x="Today" 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="3 3" 
              label={{ value: 'Now', position: 'top', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Predicted Price */}
      <div className="bg-secondary rounded-lg p-6 mb-6">
        <p className="text-sm text-muted-foreground mb-2">Predicted Closing Price</p>
        <div className="flex items-center gap-3">
          <span className="text-4xl font-bold font-mono tabular-nums text-foreground">
            {formatPrice(prediction.predictedPrice)}
          </span>
          {isPositive ? <TrendingUp className="w-6 h-6 text-gain" /> : <TrendingDown className="w-6 h-6 text-loss" />}
        </div>
        <p className={cn("text-lg font-semibold mt-2", isPositive ? "text-gain" : "text-loss")}>
          {isPositive ? '+' : ''}{formatPrice(prediction.priceChange)} ({isPositive ? '+' : ''}{prediction.changePercent.toFixed(2)}%)
        </p>
      </div>
      
      {/* Confidence */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Confidence Level</span>
          <span className="text-sm font-semibold text-foreground">{prediction.confidence}%</span>
        </div>
        <Progress value={prediction.confidence} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">{getConfidenceLabel(prediction.confidence)}</p>
      </div>
      
      {/* Price Range */}
      <div className="bg-secondary rounded-lg p-4">
        <p className="text-sm font-semibold text-foreground mb-3">Expected Price Range</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Lower Bound</p>
            <p className="text-lg font-mono font-semibold text-foreground">{formatPrice(prediction.lowerBound)}</p>
          </div>
          <div className="flex-1 mx-4 relative">
            <div className="h-px bg-border" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Upper Bound</p>
            <p className="text-lg font-mono font-semibold text-foreground">{formatPrice(prediction.upperBound)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
