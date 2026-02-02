import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { BarChart3, Activity, TrendingUp, Zap } from 'lucide-react';
import type { Stock, TimeSeriesPoint } from '@/types/stock';

interface CompareChartsProps {
  selectedSymbols: string[];
  stocksData: Record<string, TimeSeriesPoint[]>;
  stocks: Stock[];
  colors: string[];
}

// Vibrant chart colors for better visibility
const CHART_COLORS = [
  '#22c55e', // Green
  '#3b82f6', // Blue  
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#84cc16', // Lime
];

// Calculate volatility as standard deviation of daily returns
const calculateVolatility = (series: TimeSeriesPoint[]): number => {
  if (!series || series.length < 2) return 0;
  
  const returns: number[] = [];
  for (let i = 1; i < series.length; i++) {
    const dailyReturn = (series[i].close - series[i - 1].close) / series[i - 1].close;
    returns.push(dailyReturn);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  // Annualized volatility (assuming 252 trading days)
  return Math.sqrt(variance * 252) * 100;
};

// Calculate correlation between two series
const calculateCorrelation = (series1: TimeSeriesPoint[], series2: TimeSeriesPoint[]): number => {
  if (!series1 || !series2 || series1.length < 2 || series2.length < 2) return 0;
  
  // Create return arrays matching by date
  const dateMap1 = new Map(series1.map(p => [p.datetime.split('T')[0], p.close]));
  const dateMap2 = new Map(series2.map(p => [p.datetime.split('T')[0], p.close]));
  
  const commonDates = [...dateMap1.keys()].filter(d => dateMap2.has(d)).sort();
  if (commonDates.length < 3) return 0;
  
  const returns1: number[] = [];
  const returns2: number[] = [];
  
  for (let i = 1; i < commonDates.length; i++) {
    const prev = commonDates[i - 1];
    const curr = commonDates[i];
    
    const p1Prev = dateMap1.get(prev)!;
    const p1Curr = dateMap1.get(curr)!;
    const p2Prev = dateMap2.get(prev)!;
    const p2Curr = dateMap2.get(curr)!;
    
    returns1.push((p1Curr - p1Prev) / p1Prev);
    returns2.push((p2Curr - p2Prev) / p2Prev);
  }
  
  // Pearson correlation
  const n = returns1.length;
  const mean1 = returns1.reduce((a, b) => a + b, 0) / n;
  const mean2 = returns2.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let sum1Sq = 0;
  let sum2Sq = 0;
  
  for (let i = 0; i < n; i++) {
    const d1 = returns1[i] - mean1;
    const d2 = returns2[i] - mean2;
    numerator += d1 * d2;
    sum1Sq += d1 * d1;
    sum2Sq += d2 * d2;
  }
  
  const denominator = Math.sqrt(sum1Sq * sum2Sq);
  return denominator === 0 ? 0 : numerator / denominator;
};

export function CompareCharts({ selectedSymbols, stocksData, stocks, colors }: CompareChartsProps) {
  // Volume comparison data
  const volumeData = useMemo(() => {
    return selectedSymbols.map((symbol, index) => {
      const stock = stocks.find(s => s.symbol === symbol);
      const series = stocksData[symbol];
      const avgVolume = series?.length 
        ? series.reduce((sum, p) => sum + (p.volume || 0), 0) / series.length 
        : (stock?.volume || 0);
      
      return {
        symbol,
        volume: avgVolume / 1000000, // In millions
        color: colors[index] || CHART_COLORS[index % CHART_COLORS.length],
      };
    });
  }, [selectedSymbols, stocksData, stocks, colors]);

  // Volatility comparison data
  const volatilityData = useMemo(() => {
    return selectedSymbols.map((symbol, index) => {
      const series = stocksData[symbol];
      const volatility = calculateVolatility(series || []);
      
      return {
        symbol,
        volatility: Number(volatility.toFixed(2)),
        color: colors[index] || CHART_COLORS[index % CHART_COLORS.length],
      };
    });
  }, [selectedSymbols, stocksData, colors]);

  // Risk-return scatter data
  const riskReturnData = useMemo(() => {
    return selectedSymbols.map((symbol, index) => {
      const series = stocksData[symbol];
      const volatility = calculateVolatility(series || []);
      
      let returnPercent = 0;
      if (series && series.length >= 2) {
        const firstPrice = series[0].close;
        const lastPrice = series[series.length - 1].close;
        returnPercent = ((lastPrice - firstPrice) / firstPrice) * 100;
      }
      
      return {
        symbol,
        risk: Number(volatility.toFixed(2)),
        return: Number(returnPercent.toFixed(2)),
        volume: (stocks.find(s => s.symbol === symbol)?.volume || 1000000) / 1000000,
        color: colors[index] || CHART_COLORS[index % CHART_COLORS.length],
      };
    });
  }, [selectedSymbols, stocksData, stocks, colors]);

  // Radar chart data for multi-metric comparison
  const radarData = useMemo(() => {
    if (selectedSymbols.length === 0) return [];
    
    // Get max values for normalization
    const maxVolatility = Math.max(...volatilityData.map(d => d.volatility), 1);
    const maxVolume = Math.max(...volumeData.map(d => d.volume), 1);
    const maxReturn = Math.max(...riskReturnData.map(d => Math.abs(d.return)), 1);
    
    const metrics = ['Volatility', 'Volume', 'Return', 'Momentum', 'Liquidity'];
    
    return metrics.map(metric => {
      const point: Record<string, any> = { metric };
      
      selectedSymbols.forEach((symbol, idx) => {
        const vol = volatilityData.find(d => d.symbol === symbol)?.volatility || 0;
        const volume = volumeData.find(d => d.symbol === symbol)?.volume || 0;
        const ret = riskReturnData.find(d => d.symbol === symbol)?.return || 0;
        
        let value = 0;
        switch (metric) {
          case 'Volatility':
            value = (vol / maxVolatility) * 100;
            break;
          case 'Volume':
            value = (volume / maxVolume) * 100;
            break;
          case 'Return':
            value = ((Math.abs(ret) / maxReturn) * 100);
            break;
          case 'Momentum':
            // Simple momentum: positive return = high momentum
            value = Math.max(0, ret > 0 ? 50 + (ret / maxReturn) * 50 : 50 - (Math.abs(ret) / maxReturn) * 50);
            break;
          case 'Liquidity':
            // Based on volume relative to max
            value = (volume / maxVolume) * 100;
            break;
        }
        
        point[`series_${idx}`] = Math.round(value);
      });
      
      return point;
    });
  }, [selectedSymbols, volatilityData, volumeData, riskReturnData]);

  // Correlation matrix data
  const correlationData = useMemo(() => {
    if (selectedSymbols.length < 2) return [];
    
    const matrix: Array<{ stock1: string; stock2: string; correlation: number; color: string }> = [];
    
    for (let i = 0; i < selectedSymbols.length; i++) {
      for (let j = i + 1; j < selectedSymbols.length; j++) {
        const sym1 = selectedSymbols[i];
        const sym2 = selectedSymbols[j];
        const corr = calculateCorrelation(stocksData[sym1] || [], stocksData[sym2] || []);
        
        matrix.push({
          stock1: sym1,
          stock2: sym2,
          correlation: Number(corr.toFixed(3)),
          color: corr > 0.5 ? 'hsl(var(--chart-up))' : corr < -0.5 ? 'hsl(var(--chart-down))' : 'hsl(var(--muted-foreground))',
        });
      }
    }
    
    return matrix;
  }, [selectedSymbols, stocksData]);

  if (selectedSymbols.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}: {entry.value?.toFixed?.(2) || entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Volume Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-4 h-4 text-primary" />
            Average Volume
          </CardTitle>
          <CardDescription>Trading volume comparison (in millions)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={volumeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis 
                type="category" 
                dataKey="symbol" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="volume" name="Avg Volume (M)" radius={[0, 4, 4, 0]}>
                {volumeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Volatility Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-4 h-4 text-primary" />
            Volatility Analysis
          </CardTitle>
          <CardDescription>Annualized volatility (% standard deviation)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={volatilityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="symbol" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="volatility" name="Volatility (%)" radius={[4, 4, 0, 0]}>
                {volatilityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Risk vs Return Scatter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            Risk vs Return
          </CardTitle>
          <CardDescription>Higher return with lower risk is better (top-left)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number" 
                dataKey="risk" 
                name="Risk (Volatility %)" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                label={{ value: 'Risk (Volatility %)', position: 'bottom', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                type="number" 
                dataKey="return" 
                name="Return %" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                label={{ value: 'Return %', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <ZAxis type="number" dataKey="volume" range={[100, 400]} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-bold">{data.symbol}</p>
                      <p>Risk: {data.risk}%</p>
                      <p>Return: {data.return}%</p>
                      <p>Volume: {data.volume.toFixed(1)}M</p>
                    </div>
                  );
                }}
              />
              {riskReturnData.map((entry, index) => (
                <Scatter 
                  key={entry.symbol} 
                  name={entry.symbol} 
                  data={[entry]} 
                  fill={entry.color}
                >
                  <Cell fill={entry.color} />
                </Scatter>
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Radar Chart - Multi-metric */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-primary" />
            Multi-Factor Comparison
          </CardTitle>
          <CardDescription>Normalized scores across key metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="metric" fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={10} stroke="hsl(var(--muted-foreground))" />
              {selectedSymbols.map((symbol, index) => (
                <Radar
                  key={symbol}
                  name={symbol}
                  dataKey={`series_${index}`}
                  stroke={colors[index] || CHART_COLORS[index % CHART_COLORS.length]}
                  fill={colors[index] || CHART_COLORS[index % CHART_COLORS.length]}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              ))}
              <Legend />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Correlation Display */}
      {correlationData.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-primary" />
              Correlation Analysis
            </CardTitle>
            <CardDescription>
              How stock prices move together (1 = same direction, -1 = opposite, 0 = independent)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {correlationData.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50"
                >
                  <span className="font-medium">{item.stock1}</span>
                  <span className="text-muted-foreground">↔</span>
                  <span className="font-medium">{item.stock2}</span>
                  <span 
                    className="font-bold text-lg px-2 py-0.5 rounded"
                    style={{ 
                      color: item.color,
                      backgroundColor: `${item.color}20`,
                    }}
                  >
                    {item.correlation > 0 ? '+' : ''}{item.correlation.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
