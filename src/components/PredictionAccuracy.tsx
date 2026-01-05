import { useMemo } from 'react';
import { Target, TrendingUp, TrendingDown, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TimeSeriesPoint } from '@/types/stock';
import { cn } from '@/lib/utils';

interface PredictionAccuracyProps {
  timeSeries: TimeSeriesPoint[];
  stockSymbol: string;
  currency?: string;
}

// Simulated prediction data - in production this would come from your model
function generateMockPredictions(timeSeries: TimeSeriesPoint[]) {
  if (!timeSeries || timeSeries.length === 0) return [];
  
  // Generate predictions for each date with some variance
  return timeSeries.map((point, index) => {
    // Simulate prediction made 1 day before
    const variance = (Math.random() - 0.5) * 0.06; // ±3% variance
    const predictedPrice = point.close * (1 + variance);
    const error = ((predictedPrice - point.close) / point.close) * 100;
    const isAccurate = Math.abs(error) <= 2; // Within 2% is considered accurate
    
    return {
      date: point.datetime,
      actualClose: point.close,
      predictedClose: predictedPrice,
      error: error,
      isAccurate,
      direction: predictedPrice > (timeSeries[index - 1]?.close || point.close) ? 'up' : 'down',
      actualDirection: point.close > (timeSeries[index - 1]?.close || point.close) ? 'up' : 'down',
    };
  }).reverse(); // Show most recent first
}

export function PredictionAccuracy({ timeSeries, stockSymbol, currency = '₹' }: PredictionAccuracyProps) {
  const predictions = useMemo(() => generateMockPredictions(timeSeries), [timeSeries]);
  
  const stats = useMemo(() => {
    if (predictions.length === 0) return null;
    
    const accurateCount = predictions.filter(p => p.isAccurate).length;
    const directionCorrect = predictions.filter(p => p.direction === p.actualDirection).length;
    const avgError = predictions.reduce((sum, p) => sum + Math.abs(p.error), 0) / predictions.length;
    
    return {
      accuracy: (accurateCount / predictions.length) * 100,
      directionAccuracy: (directionCorrect / predictions.length) * 100,
      avgError,
      totalPredictions: predictions.length,
    };
  }, [predictions]);

  const formatPrice = (price: number) => {
    return `${currency}${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (!timeSeries || timeSeries.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center">
        <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">No Data Available</h2>
        <p className="text-muted-foreground">Select a stock to view prediction accuracy</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Target className="w-4 h-4" />
              <span className="text-sm">Price Accuracy</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.accuracy.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Within 2% of actual</p>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Direction Accuracy</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.directionAccuracy.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Correct trend prediction</p>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Avg Error</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.avgError.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Mean absolute error</p>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">Total Predictions</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.totalPredictions}</div>
            <p className="text-xs text-muted-foreground">Days analyzed</p>
          </div>
        </div>
      )}

      {/* Predictions Table */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Prediction vs Actual - {stockSymbol}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Historical comparison of model predictions against actual closing prices
          </p>
        </div>
        
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Predicted Close</TableHead>
                <TableHead className="text-right">Actual Close</TableHead>
                <TableHead className="text-right">Error %</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {predictions.map((pred, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{formatDate(pred.date)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {pred.direction === 'up' ? (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-500" />
                      )}
                      {formatPrice(pred.predictedClose)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {pred.actualDirection === 'up' ? (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-500" />
                      )}
                      {formatPrice(pred.actualClose)}
                    </div>
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-medium",
                    pred.error > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {pred.error > 0 ? '+' : ''}{pred.error.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-center">
                    {pred.isAccurate ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Accurate
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                        <XCircle className="w-3 h-3 mr-1" />
                        Off Target
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
