import { useState } from 'react';
import { format, subMonths } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { TimeSeriesPoint } from '@/types/stock';

interface StockHistoryProps {
  timeSeries: TimeSeriesPoint[];
  currency?: string;
  stockSymbol?: string;
}

type HistoryPeriod = '1m' | '2m' | 'all';

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

export function StockHistory({ timeSeries, currency = 'USD', stockSymbol = '' }: StockHistoryProps) {
  const [period, setPeriod] = useState<HistoryPeriod>('1m');
  
  const currencySymbol = isIndianStock(stockSymbol) ? '₹' : '$';

  const formatPrice = (value: number) => {
    return `${currencySymbol}${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)}K`;
    }
    return volume.toString();
  };

  const formatDate = (datetime: string) => {
    return format(new Date(datetime), 'MMM dd');
  };

  // Filter data based on selected period
  const getFilteredData = () => {
    const now = new Date();
    let cutoffDate: Date;
    
    switch (period) {
      case '1m':
        cutoffDate = subMonths(now, 1);
        break;
      case '2m':
        cutoffDate = subMonths(now, 2);
        break;
      default:
        return [...timeSeries].reverse();
    }
    
    return [...timeSeries]
      .filter(point => new Date(point.datetime) >= cutoffDate)
      .reverse();
  };

  const sortedData = getFilteredData();

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Price History</h3>
          <p className="text-sm text-muted-foreground">Historical OHLC data</p>
        </div>
        <Select value={period} onValueChange={(value: HistoryPeriod) => setPeriod(value)}>
          <SelectTrigger className="w-[140px] bg-background">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="1m">1 Month</SelectItem>
            <SelectItem value="2m">2 Months</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="max-h-[500px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground">Date</TableHead>
              <TableHead className="text-muted-foreground text-right">Open</TableHead>
              <TableHead className="text-muted-foreground text-right">High</TableHead>
              <TableHead className="text-muted-foreground text-right">Low</TableHead>
              <TableHead className="text-muted-foreground text-right">Close</TableHead>
              <TableHead className="text-muted-foreground text-right">Change</TableHead>
              <TableHead className="text-muted-foreground text-right">Volume</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((point, index) => {
              const change = point.close - point.open;
              const changePercent = ((change / point.open) * 100);
              const isPositive = change >= 0;
              const isLatest = index === 0;

              return (
                <TableRow 
                  key={point.datetime}
                  className={`border-border hover:bg-muted/50 ${isLatest ? 'bg-muted/30' : ''}`}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {formatDate(point.datetime)}
                      {isLatest && (
                        <Badge variant="default" className="bg-primary text-primary-foreground text-xs">
                          Latest
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPrice(point.open)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-profit">
                    {formatPrice(point.high)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-loss">
                    {formatPrice(point.low)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPrice(point.close)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={`flex items-center justify-end gap-1 ${isPositive ? 'text-profit' : 'text-loss'}`}>
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span className="font-mono">
                        {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatVolume(point.volume)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
