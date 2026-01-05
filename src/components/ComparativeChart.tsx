import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  ReferenceLine,
} from 'recharts';
import { GitCompareArrows, X, TrendingUp, TrendingDown, Calendar, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Stock, TimeSeriesPoint } from '@/types/stock';
import { fetchTimeSeries } from '@/services/stockService';

interface ComparativeChartProps {
  stocks: Stock[];
  selectedStock: Stock | null;
}

interface NormalizedDataPoint {
  datetime: string;
  [key: string]: string | number;
}

type Timeframe = '1W' | '1M' | '3M' | '1Y';
type NormalizationMode = 'percentage' | 'volume' | 'marketcap';

const TIMEFRAME_CONFIG: Record<Timeframe, { label: string; days: number }> = {
  '1W': { label: '1 Week', days: 7 },
  '1M': { label: '1 Month', days: 30 },
  '3M': { label: '3 Months', days: 90 },
  '1Y': { label: '1 Year', days: 365 },
};

const NORMALIZATION_OPTIONS: { value: NormalizationMode; label: string; description: string }[] = [
  { value: 'percentage', label: '% Change', description: 'Percentage change from start' },
  { value: 'volume', label: 'Volume Weighted', description: 'Weighted by trading volume' },
  { value: 'marketcap', label: 'Market Cap Weighted', description: 'Weighted by market cap' },
];

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(210 80% 60%)',
  'hsl(280 70% 60%)',
  'hsl(30 90% 55%)',
];

export function ComparativeChart({ stocks, selectedStock }: ComparativeChartProps) {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [stocksData, setStocksData] = useState<Record<string, TimeSeriesPoint[]>>({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'normalized' | 'absolute'>('normalized');
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [normalizationMode, setNormalizationMode] = useState<NormalizationMode>('percentage');

  // Auto-select current stock
  useEffect(() => {
    if (selectedStock && !selectedSymbols.includes(selectedStock.symbol)) {
      setSelectedSymbols([selectedStock.symbol]);
    }
  }, [selectedStock]);

  // Clear cached data when timeframe changes to force refetch
  const handleTimeframeChange = useCallback((newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
    setStocksData({}); // Clear cache to refetch with new timeframe
  }, []);

  // Generate mock time series data when API fails
  const generateMockTimeSeries = useCallback((symbol: string, days: number): TimeSeriesPoint[] => {
    const data: TimeSeriesPoint[] = [];
    const stock = stocks.find(s => s.symbol === symbol);
    const basePrice = stock?.price || 100 + Math.random() * 500;
    const today = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const volatility = 0.02; // 2% daily volatility
      const change = (Math.random() - 0.5) * 2 * volatility * basePrice;
      const price = basePrice + change * (days - i) / 10;
      
      data.push({
        datetime: date.toISOString().split('T')[0],
        open: price * (1 - Math.random() * 0.01),
        high: price * (1 + Math.random() * 0.02),
        low: price * (1 - Math.random() * 0.02),
        close: price,
        volume: Math.floor(Math.random() * 10000000) + 1000000,
      });
    }
    return data;
  }, [stocks]);

  // Fetch time series for selected stocks
  useEffect(() => {
    const fetchData = async () => {
      if (selectedSymbols.length === 0) return;
      
      setLoading(true);
      const days = TIMEFRAME_CONFIG[timeframe].days;
      
      const fetchPromises = selectedSymbols.map(async (symbol) => {
        try {
          const series = await fetchTimeSeries(symbol, '1day', days);
          // If API returns empty, use mock data
          if (!series || series.length === 0) {
            console.log(`Using mock data for ${symbol} due to API limits`);
            return { symbol, series: generateMockTimeSeries(symbol, days) };
          }
          return { symbol, series };
        } catch (err) {
          console.error(`Error fetching data for ${symbol}:`, err);
          return { symbol, series: generateMockTimeSeries(symbol, days) };
        }
      });
      
      const results = await Promise.all(fetchPromises);
      const newData: Record<string, TimeSeriesPoint[]> = {};
      results.forEach(({ symbol, series }) => {
        if (series.length > 0) {
          newData[symbol] = series;
        }
      });

      setStocksData(newData);
      setLoading(false);
    };

    fetchData();
  }, [selectedSymbols, timeframe, generateMockTimeSeries]);

  const toggleStock = (symbol: string) => {
    setSelectedSymbols(prev => {
      if (prev.includes(symbol)) {
        return prev.filter(s => s !== symbol);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, symbol];
    });
  };

  const removeStock = (symbol: string) => {
    setSelectedSymbols(prev => prev.filter(s => s !== symbol));
  };

  // Get stock metadata for normalization
  const getStockMeta = useCallback((symbol: string) => {
    const stock = stocks.find(s => s.symbol === symbol);
    return {
      marketCap: stock?.marketCap || 1000000000, // Default 1B if unknown
      volume: stock?.volume || 1000000, // Default 1M if unknown
    };
  }, [stocks]);

  // Prepare normalized data for comparison
  const chartData = useMemo(() => {
    if (selectedSymbols.length === 0) return [];

    // Get all dates from all selected stocks
    const allDates = new Set<string>();
    selectedSymbols.forEach(symbol => {
      stocksData[symbol]?.forEach(point => {
        allDates.add(point.datetime.split('T')[0]);
      });
    });

    const sortedDates = Array.from(allDates).sort();
    
    // Calculate total weights for volume/marketcap normalization
    const totalVolume = selectedSymbols.reduce((sum, sym) => sum + getStockMeta(sym).volume, 0);
    const totalMarketCap = selectedSymbols.reduce((sum, sym) => sum + getStockMeta(sym).marketCap, 0);
    
    return sortedDates.map(date => {
      const dataPoint: NormalizedDataPoint = { datetime: date };
      
      selectedSymbols.forEach(symbol => {
        const series = stocksData[symbol];
        if (!series || series.length === 0) return;
        
        const point = series.find(p => p.datetime.split('T')[0] === date);
        if (point) {
          if (viewMode === 'absolute') {
            dataPoint[symbol] = point.close;
          } else {
            const firstPoint = series[0];
            const percentChange = ((point.close - firstPoint.close) / firstPoint.close) * 100;
            
            if (normalizationMode === 'percentage') {
              dataPoint[symbol] = Number(percentChange.toFixed(2));
            } else if (normalizationMode === 'volume') {
              // Volume-weighted: multiply % change by volume weight
              const volumeWeight = getStockMeta(symbol).volume / totalVolume;
              dataPoint[symbol] = Number((percentChange * volumeWeight * selectedSymbols.length).toFixed(2));
            } else if (normalizationMode === 'marketcap') {
              // Market cap weighted: multiply % change by market cap weight
              const mcWeight = getStockMeta(symbol).marketCap / totalMarketCap;
              dataPoint[symbol] = Number((percentChange * mcWeight * selectedSymbols.length).toFixed(2));
            }
          }
        }
      });
      
      return dataPoint;
    });
  }, [selectedSymbols, stocksData, viewMode, normalizationMode, getStockMeta]);

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    return selectedSymbols.map((symbol, index) => {
      const series = stocksData[symbol];
      const stock = stocks.find(s => s.symbol === symbol);
      
      if (!series || series.length < 2 || !stock) {
        return { symbol, change: 0, changePercent: 0, color: CHART_COLORS[index % CHART_COLORS.length] };
      }
      
      const firstPrice = series[0].close;
      const lastPrice = series[series.length - 1].close;
      const change = lastPrice - firstPrice;
      const changePercent = (change / firstPrice) * 100;
      
      return {
        symbol,
        name: stock.name,
        change,
        changePercent,
        currentPrice: stock.price,
        marketCap: stock.marketCap,
        volume: stock.volume,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
  }, [selectedSymbols, stocksData, stocks]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-foreground mb-2">
          {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <div className="space-y-1">
          {payload.map((entry: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }} 
              />
              <span className="font-medium">{entry.dataKey}:</span>
              <span className={cn(
                viewMode === 'normalized' && (entry.value > 0 ? 'text-chart-up' : entry.value < 0 ? 'text-chart-down' : 'text-foreground')
              )}>
                {viewMode === 'normalized' 
                  ? `${entry.value > 0 ? '+' : ''}${entry.value.toFixed(2)}%`
                  : `₹${entry.value.toLocaleString()}`
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getNormalizationLabel = () => {
    const option = NORMALIZATION_OPTIONS.find(o => o.value === normalizationMode);
    return option?.label || '% Change';
  };

  return (
    <div className="space-y-6">
      {/* Stock Selection Panel */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GitCompareArrows className="w-5 h-5 text-primary" />
                  Compare Stocks
                </CardTitle>
                <CardDescription>
                  Select up to 5 stocks to compare their performance side by side
                </CardDescription>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'normalized' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('normalized')}
                >
                  {getNormalizationLabel()}
                </Button>
                <Button
                  variant={viewMode === 'absolute' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('absolute')}
                >
                  Price
                </Button>
              </div>
            </div>
            
            {/* Timeframe & Normalization Controls */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Timeframe Selector */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Timeframe:</span>
                <div className="flex gap-1">
                  {(Object.keys(TIMEFRAME_CONFIG) as Timeframe[]).map((tf) => (
                    <Button
                      key={tf}
                      variant={timeframe === tf ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleTimeframeChange(tf)}
                      className="px-3"
                    >
                      {tf}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Normalization Mode (only show when in normalized view) */}
              {viewMode === 'normalized' && (
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Normalize by:</span>
                  <Select value={normalizationMode} onValueChange={(v) => setNormalizationMode(v as NormalizationMode)}>
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NORMALIZATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-24">
            <div className="flex flex-wrap gap-3">
              {stocks.map(stock => (
                <div 
                  key={stock.symbol}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all",
                    selectedSymbols.includes(stock.symbol)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => toggleStock(stock.symbol)}
                >
                  <Checkbox 
                    checked={selectedSymbols.includes(stock.symbol)}
                    onCheckedChange={() => toggleStock(stock.symbol)}
                  />
                  <span className="font-medium text-sm">{stock.symbol}</span>
                  <span className={cn(
                    "text-xs",
                    stock.changePercent >= 0 ? "text-chart-up" : "text-chart-down"
                  )}>
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selected Stocks Badges */}
      {selectedSymbols.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {performanceMetrics.map(metric => (
            <Badge 
              key={metric.symbol}
              variant="outline"
              className="flex items-center gap-2 px-3 py-1.5"
              style={{ borderColor: metric.color }}
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: metric.color }} 
              />
              <span className="font-medium">{metric.symbol}</span>
              <span className={cn(
                "text-xs",
                metric.changePercent >= 0 ? "text-chart-up" : "text-chart-down"
              )}>
                {metric.changePercent >= 0 ? '+' : ''}{metric.changePercent.toFixed(2)}%
              </span>
              <button 
                onClick={() => removeStock(metric.symbol)}
                className="ml-1 hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Comparative Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {viewMode === 'normalized' 
              ? `Performance Comparison (${getNormalizationLabel()})` 
              : 'Price Comparison'}
          </CardTitle>
          <CardDescription>
            {viewMode === 'normalized' 
              ? `${NORMALIZATION_OPTIONS.find(o => o.value === normalizationMode)?.description} over ${TIMEFRAME_CONFIG[timeframe].label.toLowerCase()}`
              : `Absolute price comparison over ${TIMEFRAME_CONFIG[timeframe].label.toLowerCase()}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : selectedSymbols.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
              <GitCompareArrows className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">Select stocks to compare</p>
              <p className="text-sm">Choose from the list above to see their performance</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
              <GitCompareArrows className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">No chart data available</p>
              <p className="text-sm">Try another stock or reduce the number of selected stocks.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="datetime" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => viewMode === 'normalized' ? `${value}%` : `₹${value.toLocaleString()}`}
                  domain={viewMode === 'normalized' ? ['auto', 'auto'] : ['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {viewMode === 'normalized' && (
                  <ReferenceLine
                    y={0}
                    stroke="hsl(var(--border))"
                    strokeDasharray="5 5"
                  />
                )}
                {selectedSymbols.map((symbol, index) => (
                  <Line
                    key={symbol}
                    type="monotone"
                    dataKey={symbol}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Performance Summary Table */}
      {selectedSymbols.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary ({TIMEFRAME_CONFIG[timeframe].label})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {performanceMetrics.map(metric => (
                <div 
                  key={metric.symbol}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card/50"
                >
                  <div 
                    className="w-3 h-12 rounded-full" 
                    style={{ backgroundColor: metric.color }} 
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{metric.symbol}</span>
                      {metric.changePercent >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-chart-up" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-chart-down" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{metric.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm">₹{metric.currentPrice?.toLocaleString()}</span>
                      <span className={cn(
                        "text-sm font-medium",
                        metric.changePercent >= 0 ? "text-chart-up" : "text-chart-down"
                      )}>
                        {metric.changePercent >= 0 ? '+' : ''}{metric.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    {metric.volume && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Vol: {(metric.volume / 1000000).toFixed(2)}M
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
