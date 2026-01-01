import { Trophy, TrendingUp, Star } from 'lucide-react';
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

export function BestStockOfDay({ stocks }: BestStockOfDayProps) {
  if (stocks.length === 0) return null;

  // Find the best performing stock
  const bestStock = stocks.reduce((best, current) => 
    current.changePercent > best.changePercent ? current : best
  , stocks[0]);

  const currencySymbol = isIndianStock(bestStock.symbol) ? '₹' : '$';

  const formatPrice = (price: number) => {
    return `${currencySymbol}${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            Best Stock of the Day
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          </h3>
          <p className="text-xs text-muted-foreground">Top performer based on daily change</p>
        </div>
      </div>

      <Card className="bg-card/50 border-primary/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-foreground">{bestStock.symbol}</span>
                <span className="px-2 py-0.5 bg-gain/20 text-gain text-xs font-semibold rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  TOP PICK
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{bestStock.name}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono text-foreground">{formatPrice(bestStock.price)}</p>
              <p className={cn(
                "text-lg font-semibold",
                bestStock.changePercent >= 0 ? "text-gain" : "text-loss"
              )}>
                {bestStock.changePercent >= 0 ? '+' : ''}{bestStock.changePercent.toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Open</p>
              <p className="text-sm font-semibold text-foreground">{formatPrice(bestStock.open)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">High</p>
              <p className="text-sm font-semibold text-gain">{formatPrice(bestStock.high)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Low</p>
              <p className="text-sm font-semibold text-loss">{formatPrice(bestStock.low)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
