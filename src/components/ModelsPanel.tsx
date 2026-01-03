import { Brain, Calendar, TrendingUp, BarChart3, Activity, Target, Shield, Settings } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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
    description: 'RSI, MACD, Moving Averages, Bollinger Bands for comprehensive analysis.',
    color: 'bg-blue-500',
  },
  {
    icon: BarChart3,
    title: 'Volume Analysis',
    description: 'Track trading volume patterns to identify accumulation and distribution phases.',
    color: 'bg-emerald-500',
  },
  {
    icon: Activity,
    title: 'Market Sentiment',
    description: 'Real-time sentiment analysis from news, social media, and market data.',
    color: 'bg-orange-500',
  },
  {
    icon: Target,
    title: 'Price Predictions',
    description: '1-day, 5-day, and 1-month price forecasts with confidence intervals.',
    color: 'bg-rose-500',
  },
  {
    icon: Shield,
    title: 'Risk Assessment',
    description: 'Volatility metrics and risk indicators to protect your investments.',
    color: 'bg-amber-500',
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Data Collection',
    description: 'Real-time price feeds, news, and market data',
  },
  {
    step: '02',
    title: 'Feature Extraction',
    description: 'Technical indicators and pattern recognition',
  },
  {
    step: '03',
    title: 'AI Processing',
    description: 'Deep learning model analysis and prediction',
  },
  {
    step: '04',
    title: 'Prediction Output',
    description: 'Price targets with confidence levels',
  },
];

export function ModelsPanel({ metrics }: ModelsPanelProps) {
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-gain';
    if (accuracy >= 60) return 'text-accent';
    return 'text-loss';
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

      {/* Model Performance */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Model Performance</h3>
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
              
              {/* Model Description */}
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
        
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Connect your ML backend API to get real model metrics
        </p>
      </div>
    </div>
  );
}
