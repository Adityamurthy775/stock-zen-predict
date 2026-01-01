import { Trophy, TrendingUp, TrendingDown, Star, Medal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Stock } from '@/types/stock';
import { cn } from '@/lib/utils';

interface BestStockOfDayProps {
  stocks: Stock[];
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

const RANK_STYLES = [
  { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', icon: 'text-yellow-500', label: '🥇 1st' },
  { bg: 'bg-gray-300/20', border: 'border-gray-400/30', icon: 'text-gray-400', label: '🥈 2nd' },
  { bg: 'bg-orange-400/20', border: 'border-orange-400/30', icon: 'text-orange-400', label: '🥉 3rd' },
  { bg: 'bg-primary/10', border: 'border-primary/20', icon: 'text-primary', label: '4th' },
  { bg: 'bg-muted/50', border: 'border-border', icon: 'text-muted-foreground', label: '5th' },
];

export function BestStockOfDay({ stocks }: BestStockOfDayProps) {
  if (stocks.length === 0) return null;

  // Sort stocks by changePercent and get top 5
  const topStocks = [...stocks]
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 5);

  const formatPrice = (stock: Stock) => {
    const currencySymbol = isIndianStock(stock.symbol) ? '₹' : '$';
    return `${currencySymbol}${stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            Best Stocks of the Day
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          </h3>
          <p className="text-xs text-muted-foreground">Top 5 performers based on daily change</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {topStocks.map((stock, index) => {
          const style = RANK_STYLES[index];
          const isPositive = stock.changePercent >= 0;
          
          return (
            <Card 
              key={stock.symbol} 
              className={cn(
                "border transition-all hover:scale-[1.02]",
                style.bg,
                style.border
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-xs font-bold", style.icon)}>
                    {style.label}
                  </span>
                  {index === 0 && (
                    <Medal className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                
                <div className="mb-2">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-foreground text-sm">
                      {stock.symbol.split(':')[0].replace('.NS', '').replace('.BSE', '')}
                    </span>
                    {index === 0 && (
                      <span className="px-1.5 py-0.5 bg-gain/20 text-gain text-[10px] font-semibold rounded-full flex items-center gap-0.5">
                        <TrendingUp className="w-2.5 h-2.5" />
                        TOP
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{stock.name}</p>
                </div>
                
                <div>
                  <p className="text-lg font-bold font-mono text-foreground">
                    {formatPrice(stock)}
                  </p>
                  <p className={cn(
                    "text-sm font-semibold flex items-center gap-1",
                    isPositive ? "text-gain" : "text-loss"
                  )}>
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 gap-1">
                  <div>
                    <p className="text-[9px] text-muted-foreground">High</p>
                    <p className="text-[11px] font-mono text-gain">
                      {isIndianStock(stock.symbol) ? '₹' : '$'}{stock.high.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Low</p>
                    <p className="text-[11px] font-mono text-loss">
                      {isIndianStock(stock.symbol) ? '₹' : '$'}{stock.low.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
