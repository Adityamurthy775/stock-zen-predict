import { useMemo } from 'react';
import { Brain, TrendingUp, BarChart3, Zap, AlertTriangle, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import type { ModelMetrics } from '@/types/stock';
import { cn } from '@/lib/utils';

interface ModelsPanelProps {
  metrics: ModelMetrics[];
}

// ── 6-Model Ensemble (matching reference screenshot) ───────────────────
const SIX_MODELS = [
  {
    name: 'Holt-Winters',
    tag: 'Time Series',
    tagColor: 'bg-emerald-600',
    description: 'Triple exponential smoothing capturing level, trend, and weekly seasonality (period=5).',
    bullets: ['α=0.3 (level), β=0.1 (trend), γ=0.2 (season)', 'Additive seasonality, 5-day period'],
    weight: 10,
    weightColor: 'bg-rose-500',
  },
  {
    name: 'ARIMA(p,d,q)',
    tag: 'Econometric',
    tagColor: 'bg-purple-600',
    description: 'Auto-Regressive Integrated Moving Average with differencing for stationarity.',
    bullets: ['d=1 differencing for stationarity', 'AR(3) with OLS-estimated coefficients'],
    weight: 10,
    weightColor: 'bg-amber-500',
  },
  {
    name: 'MARS',
    tag: 'ML',
    tagColor: 'bg-rose-600',
    description: 'Multivariate Adaptive Regression Splines with knots at quartiles and hinge basis functions.',
    bullets: ['Knots at Q1, Q2, Q3 of price distribution', 'Hinge functions: max(0, x−knot)'],
    weight: 20,
    weightColor: 'bg-rose-500',
  },
  {
    name: 'Random Forest',
    tag: 'ML',
    tagColor: 'bg-emerald-600',
    description: '10-tree ensemble with bootstrap aggregation (bagging) using random lookback windows.',
    bullets: ['10 decision trees with random subsets', 'MinMax scaling applied'],
    weight: 20,
    weightColor: 'bg-emerald-500',
  },
  {
    name: 'ANN',
    tag: 'Neural',
    tagColor: 'bg-blue-600',
    description: 'Feedforward network with 7 engineered inputs → 4 hidden (tanh) → 1 output.',
    bullets: ['Inputs: H-L, O-C, 7/14/21-MA, StdDev, Vol', 'Activation: tanh'],
    weight: 15,
    weightColor: 'bg-blue-500',
  },
  {
    name: 'Stacked LSTM',
    tag: 'Deep Learning',
    tagColor: 'bg-violet-600',
    description: '2-layer LSTM with forget/input/output gates and 7-day sliding window.',
    bullets: ['Layer 1 & 2: 128 nodes each', '7-day rolling window input'],
    weight: 25,
    weightColor: 'bg-violet-500',
  },
];

const EVALUATION_METRICS = [
  { name: 'RMSE', full: 'Root Mean Squared Error', formula: '√(Σ(yₜ − ŷₜ)² / n)' },
  { name: 'MAPE', full: 'Mean Absolute Percentage Error', formula: '(100/n) × Σ|yₜ − ŷₜ| / |yₜ|' },
  { name: 'MBE', full: 'Mean Bias Error', formula: '(1/n) × Σ(ŷₜ − yₜ)' },
];

const PIPELINE_STEPS = [
  { step: 1, title: 'User Selects Stock', desc: 'onClick triggers the data collection pipeline — symbol passed to API layer.' },
  { step: 2, title: 'Data Collection', desc: '30-day OHLCV data fetched via Alpha Vantage → Twelve Data → Finnhub → Web Scraping fallback.' },
  { step: 3, title: 'Feature Engineering', desc: 'Create derived features: H-L, O-C, 7/14/21-day MA, 7-day StdDev, Volume. MinMax scaling applied.' },
  { step: 4, title: '6-Model Ensemble', desc: 'All 6 models run in parallel. Weighted ensemble produces final prediction, confidence, and bounds.' },
];

export function ModelsPanel({ metrics }: ModelsPanelProps) {
  // Bar chart data from real metrics
  const comparisonData = useMemo(() => {
    return metrics.map(m => ({
      name: m.name.split(' ')[0],
      accuracy: m.accuracy,
      r2: m.r2Score * 100,
    }));
  }, [metrics]);

  // Radar chart data
  const radarData = useMemo(() => {
    if (metrics.length === 0) return [];
    return [
      { metric: 'Accuracy', ...Object.fromEntries(metrics.map((m, i) => [`m${i}`, m.accuracy])) },
      { metric: 'R² Score', ...Object.fromEntries(metrics.map((m, i) => [`m${i}`, m.r2Score * 100])) },
      { metric: 'Precision', ...Object.fromEntries(metrics.map((m, i) => [`m${i}`, (1 - m.mse) * 100])) },
      { metric: 'Low Error', ...Object.fromEntries(metrics.map((m, i) => [`m${i}`, (1 - m.mae) * 100])) },
      { metric: 'Consistency', ...Object.fromEntries(metrics.map((m, i) => [`m${i}`, 85 + (m.r2Score - 0.9) * 100])) },
    ];
  }, [metrics]);

  const radarColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">6-Model Ensemble Architecture</h2>
              <p className="text-sm text-muted-foreground">Combines time-series, econometric, ML and deep learning models for stock price prediction</p>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20">v3.0 Active</Badge>
        </div>
      </div>

      {/* Pipeline */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">End-to-End Prediction Pipeline</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PIPELINE_STEPS.map((item, idx) => (
            <div key={item.step} className="relative bg-secondary border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-md bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">{item.step}</span>
                <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              {idx < PIPELINE_STEPS.length - 1 && (
                <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 text-primary z-10">→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* The Six Prediction Models */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">The Six Prediction Models</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SIX_MODELS.map((model) => (
            <div key={model.name} className="bg-secondary border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-foreground">{model.name}</h4>
                <Badge className={cn("text-[10px] text-white border-0", model.tagColor)}>{model.tag}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{model.description}</p>
              <ul className="space-y-1 mb-4">
                {model.bullets.map((b, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span> {b}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Ensemble Weight</span>
                <span className={cn("text-sm font-bold", model.weight >= 20 ? "text-primary" : "text-muted-foreground")}>{model.weight}%</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full rounded-full", model.weightColor)} style={{ width: `${model.weight * 4}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Comparison Charts */}
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
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
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
                    <Radar key={m.name} name={m.name.split(' ')[0]} dataKey={`m${i}`}
                      stroke={radarColors[i]} fill={radarColors[i]} fillOpacity={0.15} strokeWidth={2} />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Evaluation Metrics */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Evaluation Metrics</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {EVALUATION_METRICS.map((m) => (
            <div key={m.name} className="bg-secondary border border-border rounded-lg p-4">
              <h4 className="font-bold text-foreground mb-0.5">{m.name}</h4>
              <p className="text-xs text-muted-foreground mb-3">{m.full}</p>
              <div className="bg-muted rounded-md px-3 py-2 font-mono text-sm text-center text-foreground">
                {m.formula}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Model Performance from Backtest */}
      {metrics.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Live Model Performance</h3>
            <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
              Metrics from backtesting
            </span>
          </div>
          <div className="space-y-4">
            {metrics.map((model) => (
              <div key={model.name} className="bg-secondary rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-foreground text-sm">{model.name}</h4>
                  <span className={cn("text-xl font-bold font-mono", model.accuracy >= 80 ? "text-gain" : model.accuracy >= 60 ? "text-accent" : "text-loss")}>
                    {model.accuracy.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground italic mb-2">{model.description}</p>
                <Progress value={model.accuracy} className="h-1.5 mb-3" />
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div><span className="text-muted-foreground">MSE</span><p className="font-mono font-medium text-foreground">{model.mse.toFixed(4)}</p></div>
                  <div><span className="text-muted-foreground">MAE</span><p className="font-mono font-medium text-foreground">{model.mae.toFixed(4)}</p></div>
                  <div><span className="text-muted-foreground">R²</span><p className="font-mono font-medium text-foreground">{model.r2Score.toFixed(3)}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-amber-500">Disclaimer:</span> These predictions are for educational purposes only.
          Past performance does not guarantee future results. Always do your own research before investing.
        </p>
      </div>
    </div>
  );
}
