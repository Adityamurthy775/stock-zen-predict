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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
} from 'recharts';
import { BarChart3, Activity, TrendingUp, Zap, TrendingDown, LineChart as LineChartIcon } from 'lucide-react';
import type { Stock, TimeSeriesPoint } from '@/types/stock';

interface CompareChartsProps {
  selectedSymbols: string[];
  stocksData: Record<string, TimeSeriesPoint[]>;
  stocks: Stock[];
  colors: string[];
}

// Ultra-bright neon chart colors for maximum visibility
const CHART_COLORS = [
  '#00FF88', '#00BFFF', '#FF6B35', '#FF3366', '#9945FF',
  '#00FFFF', '#FFFF00', '#FF1493', '#39FF14', '#FF4500',
];

const calculateVolatility = (series: TimeSeriesPoint[]): number => {
  if (!series || series.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < series.length; i++) {
    returns.push((series[i].close - series[i - 1].close) / series[i - 1].close);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance * 252) * 100;
};

const calculateCorrelation = (series1: TimeSeriesPoint[], series2: TimeSeriesPoint[]): number => {
  if (!series1 || !series2 || series1.length < 2 || series2.length < 2) return 0;
  const dateMap1 = new Map(series1.map(p => [p.datetime.split('T')[0], p.close]));
  const dateMap2 = new Map(series2.map(p => [p.datetime.split('T')[0], p.close]));
  const commonDates = [...dateMap1.keys()].filter(d => dateMap2.has(d)).sort();
  if (commonDates.length < 3) return 0;
  const returns1: number[] = [];
  const returns2: number[] = [];
  for (let i = 1; i < commonDates.length; i++) {
    const prev = commonDates[i - 1];
    const curr = commonDates[i];
    returns1.push((dateMap1.get(curr)! - dateMap1.get(prev)!) / dateMap1.get(prev)!);
    returns2.push((dateMap2.get(curr)! - dateMap2.get(prev)!) / dateMap2.get(prev)!);
  }
  const n = returns1.length;
  const mean1 = returns1.reduce((a, b) => a + b, 0) / n;
  const mean2 = returns2.reduce((a, b) => a + b, 0) / n;
  let numerator = 0, sum1Sq = 0, sum2Sq = 0;
  for (let i = 0; i < n; i++) {
    const d1 = returns1[i] - mean1, d2 = returns2[i] - mean2;
    numerator += d1 * d2;
    sum1Sq += d1 * d1;
    sum2Sq += d2 * d2;
  }
  const denominator = Math.sqrt(sum1Sq * sum2Sq);
  return denominator === 0 ? 0 : numerator / denominator;
};

// Calculate Simple Moving Average
const calculateSMA = (series: TimeSeriesPoint[], period: number): (number | null)[] => {
  return series.map((_, idx) => {
    if (idx < period - 1) return null;
    const slice = series.slice(idx - period + 1, idx + 1);
    return slice.reduce((sum, p) => sum + p.close, 0) / period;
  });
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
        volume: avgVolume / 1000000,
        color: colors[index] || CHART_COLORS[index % CHART_COLORS.length],
      };
    });
  }, [selectedSymbols, stocksData, stocks, colors]);

  // Volatility comparison data
  const volatilityData = useMemo(() => {
    return selectedSymbols.map((symbol, index) => {
      const series = stocksData[symbol];
      return {
        symbol,
        volatility: Number(calculateVolatility(series || []).toFixed(2)),
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
        returnPercent = ((series[series.length - 1].close - series[0].close) / series[0].close) * 100;
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

  // Radar chart data
  const radarData = useMemo(() => {
    if (selectedSymbols.length === 0) return [];
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
          case 'Volatility': value = (vol / maxVolatility) * 100; break;
          case 'Volume': value = (volume / maxVolume) * 100; break;
          case 'Return': value = (Math.abs(ret) / maxReturn) * 100; break;
          case 'Momentum': value = Math.max(0, ret > 0 ? 50 + (ret / maxReturn) * 50 : 50 - (Math.abs(ret) / maxReturn) * 50); break;
          case 'Liquidity': value = (volume / maxVolume) * 100; break;
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
        const corr = calculateCorrelation(stocksData[selectedSymbols[i]] || [], stocksData[selectedSymbols[j]] || []);
        matrix.push({
          stock1: selectedSymbols[i],
          stock2: selectedSymbols[j],
          correlation: Number(corr.toFixed(3)),
          color: corr > 0.5 ? 'hsl(var(--chart-up))' : corr < -0.5 ? 'hsl(var(--chart-down))' : 'hsl(var(--muted-foreground))',
        });
      }
    }
    return matrix;
  }, [selectedSymbols, stocksData]);

  // Cumulative Returns data
  const cumulativeReturnsData = useMemo(() => {
    if (selectedSymbols.length === 0) return [];
    const allDates = new Set<string>();
    selectedSymbols.forEach(sym => {
      stocksData[sym]?.forEach(p => allDates.add(p.datetime.split('T')[0]));
    });
    const sortedDates = Array.from(allDates).sort();
    return sortedDates.map(date => {
      const point: Record<string, any> = { date };
      selectedSymbols.forEach((sym, idx) => {
        const series = stocksData[sym];
        if (!series || series.length === 0) return;
        const firstClose = series[0].close;
        const current = series.find(p => p.datetime.split('T')[0] === date);
        if (current) {
          point[`series_${idx}`] = Number((((current.close - firstClose) / firstClose) * 100).toFixed(2));
        }
      });
      return point;
    });
  }, [selectedSymbols, stocksData]);

  // Drawdown data
  const drawdownData = useMemo(() => {
    if (selectedSymbols.length === 0) return [];
    const allDates = new Set<string>();
    selectedSymbols.forEach(sym => {
      stocksData[sym]?.forEach(p => allDates.add(p.datetime.split('T')[0]));
    });
    const sortedDates = Array.from(allDates).sort();
    
    // Track peak for each symbol
    const peaks: Record<string, number> = {};
    selectedSymbols.forEach(sym => {
      const series = stocksData[sym];
      peaks[sym] = series?.[0]?.close || 0;
    });

    return sortedDates.map(date => {
      const point: Record<string, any> = { date };
      selectedSymbols.forEach((sym, idx) => {
        const series = stocksData[sym];
        if (!series || series.length === 0) return;
        const current = series.find(p => p.datetime.split('T')[0] === date);
        if (current) {
          if (current.close > peaks[sym]) peaks[sym] = current.close;
          const drawdown = ((current.close - peaks[sym]) / peaks[sym]) * 100;
          point[`series_${idx}`] = Number(drawdown.toFixed(2));
        }
      });
      return point;
    });
  }, [selectedSymbols, stocksData]);

  // Daily Returns Distribution data
  const dailyReturnsData = useMemo(() => {
    return selectedSymbols.map((symbol, index) => {
      const series = stocksData[symbol];
      if (!series || series.length < 2) return { symbol, positive: 0, negative: 0, neutral: 0, avgReturn: 0, color: colors[index] || CHART_COLORS[index % CHART_COLORS.length] };
      
      let positive = 0, negative = 0, neutral = 0, totalReturn = 0;
      for (let i = 1; i < series.length; i++) {
        const ret = ((series[i].close - series[i-1].close) / series[i-1].close) * 100;
        totalReturn += ret;
        if (ret > 0.1) positive++;
        else if (ret < -0.1) negative++;
        else neutral++;
      }
      
      return {
        symbol,
        positive,
        negative,
        neutral,
        avgReturn: Number((totalReturn / (series.length - 1)).toFixed(3)),
        color: colors[index] || CHART_COLORS[index % CHART_COLORS.length],
      };
    });
  }, [selectedSymbols, stocksData, colors]);

  if (selectedSymbols.length === 0) return null;

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
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal vertical={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis type="category" dataKey="symbol" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
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

      {/* Cumulative Returns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            Cumulative Returns
          </CardTitle>
          <CardDescription>Total return (%) from start of period</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={cumulativeReturnsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={11}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              {selectedSymbols.map((sym, idx) => (
                <Area
                  key={sym}
                  type="monotone"
                  dataKey={`series_${idx}`}
                  name={sym}
                  stroke={colors[idx] || CHART_COLORS[idx % CHART_COLORS.length]}
                  fill={colors[idx] || CHART_COLORS[idx % CHART_COLORS.length]}
                  fillOpacity={0.1}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Drawdown Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="w-4 h-4 text-destructive" />
            Drawdown Analysis
          </CardTitle>
          <CardDescription>Peak-to-trough decline (%) — closer to 0 is better</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={drawdownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={11}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              {selectedSymbols.map((sym, idx) => (
                <Area
                  key={sym}
                  type="monotone"
                  dataKey={`series_${idx}`}
                  name={sym}
                  stroke={colors[idx] || CHART_COLORS[idx % CHART_COLORS.length]}
                  fill={colors[idx] || CHART_COLORS[idx % CHART_COLORS.length]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </AreaChart>
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
              <XAxis type="number" dataKey="risk" name="Risk (Volatility %)" stroke="hsl(var(--muted-foreground))" fontSize={12}
                label={{ value: 'Risk (Volatility %)', position: 'bottom', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis type="number" dataKey="return" name="Return %" stroke="hsl(var(--muted-foreground))" fontSize={12}
                label={{ value: 'Return %', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <ZAxis type="number" dataKey="volume" range={[100, 400]} />
              <Tooltip content={({ active, payload }) => {
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
              }} />
              {riskReturnData.map((entry) => (
                <Scatter key={entry.symbol} name={entry.symbol} data={[entry]} fill={entry.color}>
                  <Cell fill={entry.color} />
                </Scatter>
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Radar Chart */}
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
                <Radar key={symbol} name={symbol} dataKey={`series_${index}`}
                  stroke={colors[index] || CHART_COLORS[index % CHART_COLORS.length]}
                  fill={colors[index] || CHART_COLORS[index % CHART_COLORS.length]}
                  fillOpacity={0.2} strokeWidth={2} />
              ))}
              <Legend />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Returns Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChartIcon className="w-4 h-4 text-primary" />
            Daily Returns Distribution
          </CardTitle>
          <CardDescription>Win/Loss ratio — number of positive vs negative days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyReturnsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis type="category" dataKey="symbol" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
                    <p className="font-bold mb-1">{data.symbol}</p>
                    <p className="text-[hsl(var(--gain))]">▲ {data.positive} positive days</p>
                    <p className="text-[hsl(var(--loss))]">▼ {data.negative} negative days</p>
                    <p className="text-muted-foreground">— {data.neutral} flat days</p>
                    <p className="mt-1">Avg daily: {data.avgReturn}%</p>
                  </div>
                );
              }} />
              <Bar dataKey="positive" name="Up Days" stackId="a" fill="hsl(var(--gain))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="negative" name="Down Days" stackId="a" fill="hsl(var(--loss))" radius={[0, 4, 4, 0]} />
              <Legend />
            </BarChart>
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
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50">
                  <span className="font-medium">{item.stock1}</span>
                  <span className="text-muted-foreground">↔</span>
                  <span className="font-medium">{item.stock2}</span>
                  <span className="font-bold text-lg px-2 py-0.5 rounded"
                    style={{ color: item.color, backgroundColor: `${item.color}20` }}>
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
