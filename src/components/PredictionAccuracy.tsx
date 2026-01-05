import { useMemo, useState } from 'react';
import { Target, TrendingUp, TrendingDown, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { TimeSeriesPoint } from '@/types/stock';
import { cn } from '@/lib/utils';

type ChartTimeframe = '1W' | '2W' | '1M' | 'ALL';

const TIMEFRAME_CONFIG: Record<ChartTimeframe, { label: string; days: number }> = {
  '1W': { label: '1 Week', days: 7 },
  '2W': { label: '2 Weeks', days: 14 },
  '1M': { label: '1 Month', days: 30 },
  'ALL': { label: 'All Data', days: 999 },
};

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
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('2W');
  
  const predictions = useMemo(() => generateMockPredictions(timeSeries), [timeSeries]);
  
  // Filter predictions based on timeframe for chart
  const filteredPredictions = useMemo(() => {
    const days = TIMEFRAME_CONFIG[chartTimeframe].days;
    return predictions.slice(0, days);
  }, [predictions, chartTimeframe]);
  
  // Prepare chart data (reverse to show chronological order)
  const chartData = useMemo(() => {
    return [...filteredPredictions].reverse().map(pred => ({
      date: new Date(pred.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actual: pred.actualClose,
      predicted: pred.predictedClose,
      fullDate: pred.date,
    }));
  }, [filteredPredictions]);
  
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }} 
              />
              <span className="font-medium">{entry.name}:</span>
              <span>{formatPrice(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

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

      {/* Chart Visualization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Predicted vs Actual Prices - {stockSymbol}
              </CardTitle>
              <CardDescription>
                Visual comparison of model predictions against actual closing prices
              </CardDescription>
            </div>
            <Select value={chartTimeframe} onValueChange={(v) => setChartTimeframe(v as ChartTimeframe)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border">
                {(Object.keys(TIMEFRAME_CONFIG) as ChartTimeframe[]).map((tf) => (
                  <SelectItem key={tf} value={tf}>
                    {TIMEFRAME_CONFIG[tf].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `${currency}${value.toLocaleString()}`}
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Price"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="Predicted Price"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              <p>No chart data available</p>
            </div>
          )}
        </CardContent>
      </Card>

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
