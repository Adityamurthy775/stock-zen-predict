import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { TimeSeriesPoint } from '@/types/stock';

interface StockHistoryProps {
  timeSeries: TimeSeriesPoint[];
  currency?: string;
}

export function StockHistory({ timeSeries, currency = 'INR' }: StockHistoryProps) {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
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

  // Reverse to show latest first
  const sortedData = [...timeSeries].reverse();

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Price History</h3>
        <p className="text-sm text-muted-foreground">Historical OHLC data</p>
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
