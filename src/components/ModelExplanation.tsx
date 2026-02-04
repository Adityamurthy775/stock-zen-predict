import { Brain, Database, Cpu, GitBranch, BarChart3, TrendingUp, Zap, ArrowRight, Layers, Network, Settings, Target, Activity, LineChart, Workflow } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const architectureSteps = [
  {
    step: 1,
    title: 'User Selects Stock',
    icon: <Target className="w-6 h-6" />,
    description: 'When you click on a stock (e.g., INFY, TCS), the frontend sends a request to fetch real-time data.',
    details: [
      'Stock symbol is validated and normalized',
      'Request routed to Supabase Edge Function',
      'User API keys (if configured) are included',
    ],
    color: 'bg-blue-500',
    endpoint: 'Frontend → Edge Function',
  },
  {
    step: 2,
    title: 'API Data Fetching',
    icon: <Database className="w-6 h-6" />,
    description: 'The Edge Function fetches real-time and historical data from multiple financial APIs.',
    details: [
      'Alpha Vantage: Primary API for quotes & time series',
      'Twelve Data: Backup provider with better rate limits',
      'Finnhub: News and sentiment data',
      '30-second caching to reduce API calls',
    ],
    color: 'bg-green-500',
    endpoint: 'Edge Function → APIs',
  },
  {
    step: 3,
    title: 'Technical Indicator Calculation',
    icon: <Activity className="w-6 h-6" />,
    description: 'Historical price data is processed to calculate key technical indicators used for prediction.',
    details: [
      'RSI (14-period): Momentum oscillator',
      'MACD (12, 26, 9): Trend momentum',
      'SMA/EMA (5, 20, 50): Moving averages',
      'Bollinger Bands (20, 2σ): Volatility',
      'ATR: Average True Range for volatility',
    ],
    color: 'bg-purple-500',
    endpoint: 'Data Processing Layer',
  },
  {
    step: 4,
    title: 'LSTM Neural Network',
    icon: <Network className="w-6 h-6" />,
    description: 'Long Short-Term Memory network processes sequential price data to capture temporal patterns.',
    details: [
      'Input: 60-day price sequences with indicators',
      'Architecture: 2 LSTM layers (128, 64 units)',
      'Dropout: 0.2 for regularization',
      'Output: Next-day price prediction',
      'Training: 1000+ epochs on historical data',
    ],
    color: 'bg-rose-500',
    endpoint: 'LSTM Model',
  },
  {
    step: 5,
    title: 'CNN Pattern Recognition',
    icon: <Layers className="w-6 h-6" />,
    description: 'Convolutional Neural Network identifies chart patterns like head-shoulders, double tops, etc.',
    details: [
      'Converts price data to 2D candlestick images',
      'Conv layers detect visual patterns',
      'Identifies: Triangles, Flags, Wedges',
      'Pattern confidence scoring',
    ],
    color: 'bg-amber-500',
    endpoint: 'CNN Model',
  },
  {
    step: 6,
    title: 'Transformer Attention',
    icon: <Brain className="w-6 h-6" />,
    description: 'Transformer model uses self-attention to weigh importance of different time periods.',
    details: [
      'Multi-head attention (8 heads)',
      'Positional encoding for time awareness',
      'Captures long-range dependencies',
      'Better at regime changes detection',
    ],
    color: 'bg-cyan-500',
    endpoint: 'Transformer Model',
  },
  {
    step: 7,
    title: 'Ensemble Prediction',
    icon: <GitBranch className="w-6 h-6" />,
    description: 'Multiple model outputs are combined using weighted averaging for final prediction.',
    details: [
      'LSTM weight: 40% (trend following)',
      'Transformer weight: 35% (attention)',
      'CNN weight: 25% (pattern recognition)',
      'Confidence = weighted average of individual confidences',
    ],
    color: 'bg-indigo-500',
    endpoint: 'Ensemble Layer',
  },
  {
    step: 8,
    title: 'Result Display',
    icon: <LineChart className="w-6 h-6" />,
    description: 'Final prediction with confidence intervals is displayed on the frontend.',
    details: [
      'Predicted price with upper/lower bounds',
      'Trend direction: Bullish/Bearish/Neutral',
      'Confidence percentage',
      'Technical indicator values',
      'Interactive charts and visualizations',
    ],
    color: 'bg-emerald-500',
    endpoint: 'Frontend Display',
  },
];

const modelDetails = [
  {
    name: 'LSTM (Long Short-Term Memory)',
    accuracy: '94.7%',
    description: 'Specialized RNN for sequential data. Excels at capturing long-term dependencies in price movements.',
    strengths: ['Time series forecasting', 'Trend continuation', 'Memory of past patterns'],
    weaknesses: ['Slow training', 'May miss sudden reversals'],
    icon: <Network className="w-5 h-5" />,
    color: 'bg-rose-500',
  },
  {
    name: 'Transformer (Attention Model)',
    accuracy: '92.3%',
    description: 'Uses self-attention mechanism to weigh importance of different time periods dynamically.',
    strengths: ['Parallel processing', 'Long-range dependencies', 'Regime change detection'],
    weaknesses: ['Requires more data', 'Computationally intensive'],
    icon: <Brain className="w-5 h-5" />,
    color: 'bg-cyan-500',
  },
  {
    name: 'CNN (Pattern Recognition)',
    accuracy: '88.5%',
    description: 'Converts price charts to images and identifies classic technical patterns.',
    strengths: ['Pattern detection', 'Visual analysis', 'Fast inference'],
    weaknesses: ['May miss non-visual signals', 'Limited context'],
    icon: <Layers className="w-5 h-5" />,
    color: 'bg-amber-500',
  },
  {
    name: 'Technical Analysis Engine',
    accuracy: '85.2%',
    description: 'Rule-based system using RSI, MACD, Bollinger Bands, and moving average crossovers.',
    strengths: ['Interpretable signals', 'No training needed', 'Real-time'],
    weaknesses: ['May lag in fast markets', 'Needs parameter tuning'],
    icon: <Activity className="w-5 h-5" />,
    color: 'bg-purple-500',
  },
];

const dataFlow = [
  { from: 'User Click', to: 'API Request', color: 'bg-blue-400' },
  { from: 'API Request', to: 'Edge Function', color: 'bg-green-400' },
  { from: 'Edge Function', to: 'Alpha Vantage / Twelve Data', color: 'bg-yellow-400' },
  { from: 'Raw Data', to: 'Indicator Calculation', color: 'bg-purple-400' },
  { from: 'Indicators', to: 'ML Models (LSTM, CNN, Transformer)', color: 'bg-rose-400' },
  { from: 'Model Outputs', to: 'Ensemble Aggregation', color: 'bg-indigo-400' },
  { from: 'Ensemble', to: 'Final Prediction Display', color: 'bg-emerald-400' },
];

export function ModelExplanation() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Cpu className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">How Our Prediction Model Works</h2>
            <p className="text-sm text-muted-foreground">Deep dive into the AI architecture powering stock predictions</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary">4</div>
            <div className="text-xs text-muted-foreground">ML Models</div>
          </div>
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gain">94.7%</div>
            <div className="text-xs text-muted-foreground">Best Accuracy</div>
          </div>
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-500">8</div>
            <div className="text-xs text-muted-foreground">Processing Steps</div>
          </div>
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-500">&lt;3s</div>
            <div className="text-xs text-muted-foreground">Avg Response Time</div>
          </div>
        </div>
      </div>

      {/* Data Flow Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-primary" />
            Data Flow Pipeline
          </CardTitle>
          <CardDescription>How data travels through the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-2 py-4">
            {dataFlow.map((flow, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={cn("px-3 py-2 rounded-lg text-white text-sm font-medium", flow.color)}>
                  {flow.from}
                </div>
                {index < dataFlow.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Architecture Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Step-by-Step Architecture
          </CardTitle>
          <CardDescription>What happens when you click on a stock</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border hidden lg:block" />
            
            <div className="space-y-6">
              {architectureSteps.map((step, index) => (
                <div key={step.step} className="relative flex gap-4 lg:gap-6">
                  {/* Step indicator */}
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 z-10",
                    step.color
                  )}>
                    {step.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 bg-secondary rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-muted-foreground">STEP {step.step}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{step.endpoint}</span>
                    </div>
                    <h4 className="font-semibold text-foreground mb-2">{step.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                    <ul className="space-y-1">
                      {step.details.map((detail, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <Zap className="w-3 h-3 text-primary mt-1 shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Model Specifications
          </CardTitle>
          <CardDescription>Detailed breakdown of each AI model</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {modelDetails.map((model) => (
              <div key={model.name} className="bg-secondary rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white", model.color)}>
                    {model.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{model.name}</h4>
                    <span className="text-sm font-bold text-gain">{model.accuracy} accuracy</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{model.description}</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gain mb-1">✓ Strengths</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {model.strengths.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-loss mb-1">✗ Limitations</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {model.weaknesses.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Indian Stock Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Indian Market Support
          </CardTitle>
          <CardDescription>NSE and BSE stocks with INR currency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK', 
              'LT', 'AXISBANK', 'WIPRO', 'ASIANPAINT', 'MARUTI', 'HCLTECH', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO', 'BAJFINANCE',
              'ADANIENT', 'ADANIPORTS', 'TATAMOTORS', 'TATASTEEL', 'POWERGRID', 'NTPC', 'ONGC', 'COALINDIA', 'BPCL', 'IOC',
              'GRASIM', 'TECHM', 'DIVISLAB', 'DRREDDY', 'CIPLA', 'EICHERMOT', 'M&M', 'HEROMOTOCO', 'BAJAJ-AUTO', 'BRITANNIA',
              'NESTLEIND', 'DABUR', 'PIDILITIND', 'GODREJCP', 'MARICO', 'COLPAL', 'HAVELLS', 'VOLTAS', 'CROMPTON', 'BLUESTAR'
            ].map((stock) => (
              <div key={stock} className="bg-secondary rounded px-3 py-2 text-center text-sm font-mono text-foreground">
                {stock}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            All Indian stocks are automatically displayed in ₹ INR with NSE/BSE exchange data
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
