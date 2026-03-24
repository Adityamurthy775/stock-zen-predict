import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Brain, BarChart3, Shield, Zap, ArrowRight, Activity, Target, Layers, LineChart, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Brain,
    title: '6-Model Ensemble AI',
    description: 'Holt-Winters, ARIMA, MARS, Random Forest, ANN, and Stacked LSTM working in parallel for robust predictions.',
    color: 'text-purple-400',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Market Data',
    description: 'Live prices from NSE/BSE and NYSE with automatic currency detection. Supports 100+ Indian and US stocks.',
    color: 'text-blue-400',
  },
  {
    icon: Activity,
    title: 'Technical Analysis Suite',
    description: 'RSI, MACD, Bollinger Bands, ADX, Stochastic, OBV, VWAP — computed from real historical data.',
    color: 'text-emerald-400',
  },
  {
    icon: Target,
    title: 'Multi-Timeframe Predictions',
    description: '1-day, 5-day, 15-day, and quarterly forecasts with confidence intervals and support/resistance awareness.',
    color: 'text-amber-400',
  },
  {
    icon: Shield,
    title: 'Dynamic Regime Detection',
    description: 'Automatically adjusts model weights between momentum and mean-reversion based on market conditions.',
    color: 'text-rose-400',
  },
  {
    icon: Layers,
    title: 'Sector Calibration',
    description: 'Custom volatility profiles for Banking, IT, Pharma, Energy, Auto, and Consumer sectors.',
    color: 'text-cyan-400',
  },
];

const stats = [
  { value: '6', label: 'AI Models', suffix: '' },
  { value: '95', label: 'Avg Accuracy', suffix: '%' },
  { value: '100', label: 'Stocks Tracked', suffix: '+' },
  { value: '<3', label: 'Response Time', suffix: 's' },
];

const pipelineSteps = [
  { step: '01', title: 'Select Stock', desc: 'Click any stock to trigger the pipeline' },
  { step: '02', title: 'Data Collection', desc: '30-day OHLCV via Alpha Vantage + Twelve Data' },
  { step: '03', title: 'Feature Engineering', desc: 'RSI, MACD, ADX, Bollinger, Volume signals' },
  { step: '04', title: 'Ensemble Prediction', desc: '6 models weighted by market regime' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-primary font-medium">v3.0 — 6-Model Ensemble Architecture</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            <span className="text-foreground">Stock Market</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Prediction Platform
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            AI-powered stock analysis combining time-series, econometric, ML, and deep learning models
            for Indian & US markets. Real data. Real indicators. Real predictions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg shadow-glow hover:scale-105 transition-transform"
            >
              Open Dashboard
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#features"
              className="flex items-center gap-2 px-8 py-4 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors font-medium"
            >
              Learn More
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-card/60 backdrop-blur border border-border rounded-xl p-4">
                <div className="text-3xl font-bold text-primary font-mono">
                  {stat.value}<span className="text-lg">{stat.suffix}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <a href="#features" className="absolute bottom-8 animate-bounce">
          <ChevronDown className="w-6 h-6 text-muted-foreground" />
        </a>
      </section>

      {/* Pipeline Section */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">End-to-End Prediction Pipeline</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            From stock selection to final ensemble prediction in under 3 seconds
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pipelineSteps.map((item, index) => (
              <div key={item.step} className="relative bg-card border border-border rounded-xl p-5">
                <span className="text-4xl font-black text-primary/20 block mb-2 font-mono">{item.step}</span>
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {index < pipelineSteps.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Platform Capabilities</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Everything you need for data-driven stock analysis and prediction
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors"
              >
                <feature.icon className={cn("w-10 h-10 mb-4", feature.color)} />
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-card border border-border rounded-2xl p-10">
            <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Start Analyzing Stocks</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Access real-time predictions for 100+ Indian and US stocks with our 6-model ensemble AI engine.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg shadow-glow hover:scale-105 transition-transform"
            >
              Open Dashboard
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">StockZen Predict</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            ⚠️ Predictions are for educational purposes only. Past performance does not guarantee future results. Always do your own research.
          </p>
        </div>
      </footer>
    </div>
  );
}
