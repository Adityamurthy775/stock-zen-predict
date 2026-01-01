import { TrendingUp, Activity, Target, IndianRupee } from 'lucide-react';
import type { Stock, ModelMetrics } from '@/types/stock';
import { cn } from '@/lib/utils';

interface MarketStatsProps {
  stocks: Stock[];
  modelMetrics: ModelMetrics[];
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

export function MarketStats({ stocks, modelMetrics }: MarketStatsProps) {
  // Separate Indian and US stocks
  const indianStocks = stocks.filter(s => isIndianStock(s.symbol));
  const usStocks = stocks.filter(s => !isIndianStock(s.symbol));
  
  // Calculate total market cap (simplified - using price * volume as proxy)
  const indianValue = indianStocks.reduce((sum, stock) => sum + stock.price * stock.volume, 0);
  const usValue = usStocks.reduce((sum, stock) => sum + stock.price * stock.volume, 0);
  
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

  const formatLargeNumber = (num: number, isIndian: boolean) => {
    const symbol = isIndian ? '₹' : '$';
    if (num >= 1e12) return `${symbol}${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${symbol}${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${symbol}${(num / 1e6).toFixed(2)}M`;
    return `${symbol}${num.toFixed(2)}`;
  };

  const stats = [
    {
      label: 'Market Cap (INR)',
      value: formatLargeNumber(indianValue, true),
      icon: IndianRupee,
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
      iconColor: 'text-primary',
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
