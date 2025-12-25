import { DollarSign, TrendingUp, Activity, Target } from 'lucide-react';
import type { Stock, ModelMetrics } from '@/types/stock';
import { cn } from '@/lib/utils';

interface MarketStatsProps {
  stocks: Stock[];
  modelMetrics: ModelMetrics[];
}

export function MarketStats({ stocks, modelMetrics }: MarketStatsProps) {
  // Calculate total market cap (simplified - using price * volume as proxy)
  const totalValue = stocks.reduce((sum, stock) => sum + stock.price * stock.volume, 0);
  
  // Calculate average 24h change
  const avgChange = stocks.length > 0
    ? stocks.reduce((sum, stock) => sum + stock.changePercent, 0) / stocks.length
    : 0;
  
  // Active stocks count
  const activeStocks = stocks.length;
  
  // Average model accuracy
  const avgAccuracy = modelMetrics.length > 0
    ? modelMetrics.reduce((sum, m) => sum + m.accuracy, 0) / modelMetrics.length
    : 0;

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toFixed(2)}`;
  };

  const stats = [
    {
      label: 'Market Cap',
      value: formatLargeNumber(totalValue),
      icon: DollarSign,
      iconColor: 'text-foreground',
    },
    {
      label: '24h Change',
      value: `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`,
      icon: TrendingUp,
      iconColor: avgChange >= 0 ? 'text-gain' : 'text-loss',
      valueColor: avgChange >= 0 ? 'text-gain' : 'text-loss',
    },
    {
      label: 'Active Stocks',
      value: activeStocks.toString(),
      icon: Activity,
      iconColor: 'text-gain',
    },
    {
      label: 'Avg. Model Accuracy',
      value: `${avgAccuracy.toFixed(0)}%`,
      icon: Target,
      iconColor: 'text-muted-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card border border-border rounded-lg p-4 flex items-center justify-between"
        >
          <div>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={cn(
              "text-xl font-bold font-mono tabular-nums mt-1",
              stat.valueColor || "text-foreground"
            )}>
              {stat.value}
            </p>
          </div>
          <stat.icon className={cn("w-6 h-6", stat.iconColor)} />
        </div>
      ))}
    </div>
  );
}
