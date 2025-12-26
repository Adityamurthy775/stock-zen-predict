import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import type { Prediction, PredictionPeriod } from '@/types/stock';
import { cn } from '@/lib/utils';

interface PredictionPanelProps {
  prediction: Prediction;
  period: PredictionPeriod;
  onPeriodChange: (period: PredictionPeriod) => void;
  isMarketClosed?: boolean;
}

export function PredictionPanel({ prediction, period, onPeriodChange, isMarketClosed }: PredictionPanelProps) {
  const isPositive = prediction.changePercent >= 0;
  
  const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  
  const periodLabels: Record<PredictionPeriod, string> = {
    '1d': '1 Day',
    '5d': '5 Days',
    '1m': '1 Month',
    '3m': 'Quarterly',
    '6m': 'Half Yearly',
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'High confidence - Strong signal';
    if (confidence >= 60) return 'Moderate confidence - Proceed with caution';
    return 'Low confidence - High uncertainty';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Next Day Closing Price</h3>
          {isMarketClosed && (
            <span className="px-2 py-1 rounded bg-loss/20 text-loss text-xs font-medium">
              Market Closed
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => onPeriodChange(v as PredictionPeriod)}>
            <SelectTrigger className="w-[140px] bg-secondary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">1 Day</SelectItem>
              <SelectItem value="5d">5 Days</SelectItem>
              <SelectItem value="1m">1 Month</SelectItem>
              <SelectItem value="3m">Quarterly</SelectItem>
              <SelectItem value="6m">Half Yearly</SelectItem>
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
      </p>
      
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
          {isPositive ? '+' : ''}{formatPrice(prediction.priceChange)} ({isPositive ? '+' : ''}{prediction.changePercent}%)
        </p>
      </div>
      
      {/* Confidence */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">AI Confidence Level</span>
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
          <div className="flex-1 mx-4 h-px bg-border" />
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Upper Bound</p>
            <p className="text-lg font-mono font-semibold text-foreground">{formatPrice(prediction.upperBound)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
