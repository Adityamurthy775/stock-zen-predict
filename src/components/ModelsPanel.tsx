import { useMemo } from 'react';
import { Brain, Calendar, TrendingUp, BarChart3, Activity, Target, Shield, Settings, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import type { ModelMetrics } from '@/types/stock';
import { cn } from '@/lib/utils';

interface ModelsPanelProps {
  metrics: ModelMetrics[];
}

const modelFeatures = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description: 'Advanced machine learning algorithms analyze historical patterns and market trends.',
    color: 'bg-purple-500',
  },
  {
    icon: TrendingUp,
    title: 'Technical Indicators',
    description: 'RSI, MACD, Stochastic, ADX, Bollinger Bands, VWAP for comprehensive analysis.',
    color: 'bg-blue-500',
  },
  {
    icon: BarChart3,
    title: 'Volume Analysis',
    description: 'OBV and VWAP track volume patterns to identify accumulation and distribution.',
    color: 'bg-emerald-500',
  },
  {
    icon: Activity,
    title: 'Market Regime Detection',
    description: 'Dynamic weight adjustment between momentum and mean reversion based on ADX and volatility.',
    color: 'bg-orange-500',
  },
  {
    icon: Target,
    title: 'Multi-Timeframe Predictions',
    description: '1-day to quarterly forecasts with aligned short/medium/long-term signal analysis.',
    color: 'bg-rose-500',
  },
  {
    icon: Shield,
    title: 'Support & Resistance',
    description: 'Auto-detected price levels cap predictions for market-aware accuracy.',
    color: 'bg-amber-500',
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Data Collection',
    description: 'Real-time price feeds, volume, OHLC data',
  },
  {
    step: '02',
    title: 'Indicator Engine',
    description: 'RSI, MACD, ADX, Stochastic, Bollinger, OBV, VWAP',
  },
  {
    step: '03',
    title: 'Regime Detection',
    description: 'Trending vs ranging market with dynamic ensemble weights',
  },
  {
    step: '04',
    title: 'Multi-Timeframe Ensemble',
    description: 'CNN + Momentum + Reversion + Volume signals blended by regime',
  },
];

export function ModelsPanel({ metrics }: ModelsPanelProps) {
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-gain';
    if (accuracy >= 60) return 'text-accent';
    return 'text-loss';
  };

  // Prepare model comparison chart data
  const comparisonData = useMemo(() => {
    return metrics.map(m => ({
      name: m.name.split(' ')[0], // Shortened name
      accuracy: m.accuracy,
      r2: m.r2Score * 100,
      error: (1 - m.mae) * 100, // Invert MAE for visual comparison
    }));
  }, [metrics]);

  // Radar chart data
  const radarData = useMemo(() => {
    if (metrics.length === 0) return [];
    return [
      { metric: 'Accuracy', ...Object.fromEntries(metrics.map((m, i) => [`model${i}`, m.accuracy])) },
      { metric: 'R² Score', ...Object.fromEntries(metrics.map((m, i) => [`model${i}`, m.r2Score * 100])) },
      { metric: 'Precision', ...Object.fromEntries(metrics.map((m, i) => [`model${i}`, (1 - m.mse) * 100])) },
      { metric: 'Low Error', ...Object.fromEntries(metrics.map((m, i) => [`model${i}`, (1 - m.mae) * 100])) },
      { metric: 'Consistency', ...Object.fromEntries(metrics.map((m, i) => [`model${i}`, 85 + (m.r2Score - 0.9) * 100])) },
    ];
  }, [metrics]);

  const radarColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(217, 91%, 60%)'];

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}: {entry.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Model Features & Capabilities */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Model Features & Capabilities</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modelFeatures.map((feature) => (
            <div 
              key={feature.title} 
              className="bg-secondary border border-border rounded-lg p-4 hover:bg-secondary/80 transition-colors"
            >
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", feature.color)}>
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <h4 className="font-semibold text-primary mb-1">{feature.title}</h4>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How Our Model Works */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">How Our Model Works</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {howItWorks.map((item, index) => (
            <div 
              key={item.step} 
              className="bg-secondary border border-border rounded-lg p-4 relative"
            >
              <span className="text-3xl font-bold text-primary/60 mb-2 block">{item.step}</span>
              <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              {index < howItWorks.length - 1 && (
                <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-0.5 bg-primary" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Model Comparison Chart */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5 text-primary" />
                Model Accuracy Comparison
              </CardTitle>
              <CardDescription>Side-by-side accuracy & R² score for each model</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={comparisonData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[70, 100]} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend />
                  <Bar dataKey="accuracy" name="Accuracy" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="r2" name="R² Score" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-5 h-5 text-primary" />
                Model Strength Radar
              </CardTitle>
              <CardDescription>Multi-dimensional model performance profile</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <PolarRadiusAxis domain={[70, 100]} tick={false} axisLine={false} />
                  {metrics.slice(0, 3).map((m, i) => (
                    <Radar
                      key={m.name}
                      name={m.name.split(' ')[0]}
                      dataKey={`model${i}`}
                      stroke={radarColors[i]}
                      fill={radarColors[i]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Model Performance */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Model Performance</h3>
          <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
            Metrics derived from backtesting
          </span>
        </div>
        
        <div className="space-y-6">
          {metrics.map((model) => (
            <div key={model.name} className="bg-secondary rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-foreground">{model.name}</h4>
                <span className={cn("text-2xl font-bold font-mono", getAccuracyColor(model.accuracy))}>
                  {model.accuracy.toFixed(1)}%
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3 italic">
                {model.description}
              </p>
              
              <Progress value={model.accuracy} className="h-2 mb-4" />
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">MSE</p>
                  <p className="font-mono font-medium text-foreground">{model.mse.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">MAE</p>
                  <p className="font-mono font-medium text-foreground">{model.mae.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">R² Score</p>
                  <p className="font-mono font-medium text-foreground">{model.r2Score.toFixed(3)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                Last trained: {model.lastTrained}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
