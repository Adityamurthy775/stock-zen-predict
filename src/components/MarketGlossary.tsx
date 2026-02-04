import { BookOpen, TrendingUp, TrendingDown, Activity, BarChart3, Target, Waves, Scale, Gauge, ArrowUpDown, Percent, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface GlossaryTerm {
  term: string;
  shortName?: string;
  icon: React.ReactNode;
  definition: string;
  howToUse: string;
  example: string;
  interpretation: {
    bullish: string;
    bearish: string;
    neutral: string;
  };
  category: 'momentum' | 'trend' | 'volatility' | 'volume';
  color: string;
}

const glossaryTerms: GlossaryTerm[] = [
  {
    term: 'Relative Strength Index',
    shortName: 'RSI',
    icon: <Gauge className="w-5 h-5" />,
    definition: 'A momentum oscillator that measures the speed and magnitude of price changes on a scale from 0 to 100. It helps identify overbought or oversold conditions.',
    howToUse: 'RSI values above 70 suggest overbought conditions (potential sell), while values below 30 indicate oversold conditions (potential buy). The 50 level acts as a centerline.',
    example: 'If INFY has RSI of 25, it\'s oversold - the stock may be undervalued and could bounce back. If RSI is 80, it\'s overbought and may pull back.',
    interpretation: {
      bullish: 'RSI < 30 (oversold) or rising above 50',
      bearish: 'RSI > 70 (overbought) or falling below 50',
      neutral: 'RSI between 40-60',
    },
    category: 'momentum',
    color: 'bg-purple-500',
  },
  {
    term: 'Moving Average Convergence Divergence',
    shortName: 'MACD',
    icon: <Waves className="w-5 h-5" />,
    definition: 'A trend-following momentum indicator showing the relationship between two exponential moving averages (12-day and 26-day). The MACD line is the difference between them.',
    howToUse: 'When MACD crosses above the signal line (9-day EMA), it\'s bullish. When it crosses below, it\'s bearish. The histogram shows the distance between MACD and signal line.',
    example: 'RELIANCE shows MACD line crossing above signal line → potential uptrend starting. Good time to consider buying.',
    interpretation: {
      bullish: 'MACD crosses above signal line, histogram turns positive',
      bearish: 'MACD crosses below signal line, histogram turns negative',
      neutral: 'MACD and signal line close together, histogram near zero',
    },
    category: 'momentum',
    color: 'bg-blue-500',
  },
  {
    term: 'Bollinger Bands',
    shortName: 'BB',
    icon: <ArrowUpDown className="w-5 h-5" />,
    definition: 'Volatility bands placed above and below a moving average. The bands widen during high volatility and narrow during low volatility. Typically uses 20-period SMA with 2 standard deviations.',
    howToUse: 'Price touching upper band may indicate overbought; touching lower band may indicate oversold. Bands squeezing together often precedes a big move.',
    example: 'TCS price touches lower Bollinger Band while RSI is also low → potential bounce opportunity. Price at upper band with high RSI → consider taking profits.',
    interpretation: {
      bullish: 'Price bounces off lower band, bands starting to widen upward',
      bearish: 'Price rejected at upper band, bands widening downward',
      neutral: 'Price moving within bands, bands contracting (squeeze)',
    },
    category: 'volatility',
    color: 'bg-amber-500',
  },
  {
    term: 'Simple Moving Average',
    shortName: 'SMA',
    icon: <TrendingUp className="w-5 h-5" />,
    definition: 'The average price over a specific period (e.g., 20-day, 50-day, 200-day). It smooths out price data to identify trend direction.',
    howToUse: 'Price above SMA suggests uptrend; below suggests downtrend. Golden Cross (50-day crosses above 200-day) is bullish. Death Cross is bearish.',
    example: 'HDFCBANK trading above its 50-day and 200-day SMA → strong uptrend. If it falls below 50-day SMA, short-term trend may be weakening.',
    interpretation: {
      bullish: 'Price above SMA, shorter SMA above longer SMA (Golden Cross)',
      bearish: 'Price below SMA, shorter SMA below longer SMA (Death Cross)',
      neutral: 'Price crossing back and forth across SMA',
    },
    category: 'trend',
    color: 'bg-green-500',
  },
  {
    term: 'Exponential Moving Average',
    shortName: 'EMA',
    icon: <Activity className="w-5 h-5" />,
    definition: 'Similar to SMA but gives more weight to recent prices, making it more responsive to new information. Commonly used periods: 12, 26, 50, 200.',
    howToUse: 'EMA reacts faster than SMA to price changes. Use for faster signals but be aware of more false signals in choppy markets.',
    example: 'ICICIBANK\'s 12-day EMA crosses above 26-day EMA → short-term bullish signal. Many traders use this as entry trigger.',
    interpretation: {
      bullish: 'Fast EMA crosses above slow EMA, price above EMAs',
      bearish: 'Fast EMA crosses below slow EMA, price below EMAs',
      neutral: 'EMAs flattening, no clear crossover',
    },
    category: 'trend',
    color: 'bg-cyan-500',
  },
  {
    term: 'Volume',
    shortName: 'VOL',
    icon: <BarChart3 className="w-5 h-5" />,
    definition: 'The number of shares traded during a given period. High volume confirms price moves; low volume suggests weak conviction.',
    howToUse: 'Price rise with high volume = strong buying interest. Price fall with high volume = strong selling pressure. Low volume moves are often unreliable.',
    example: 'SBIN rises 5% on 3x average volume → strong institutional buying, trend likely to continue. Same move on low volume → may reverse.',
    interpretation: {
      bullish: 'Price up + volume up = strong bullish signal',
      bearish: 'Price down + volume up = strong bearish signal',
      neutral: 'Average volume with small price moves',
    },
    category: 'volume',
    color: 'bg-rose-500',
  },
  {
    term: 'Support & Resistance',
    shortName: 'S/R',
    icon: <Scale className="w-5 h-5" />,
    definition: 'Support is a price level where buying interest prevents further decline. Resistance is where selling pressure prevents further rise. These are key decision zones.',
    howToUse: 'Buy near support with stops below. Sell/short near resistance with stops above. Breakouts above resistance or below support signal new trends.',
    example: 'WIPRO has resistance at ₹500. If it breaks above with volume, next target might be ₹550. If rejected, may fall back to support at ₹450.',
    interpretation: {
      bullish: 'Price breaks above resistance, previous resistance becomes support',
      bearish: 'Price breaks below support, previous support becomes resistance',
      neutral: 'Price trading between support and resistance (range-bound)',
    },
    category: 'trend',
    color: 'bg-indigo-500',
  },
  {
    term: 'Average True Range',
    shortName: 'ATR',
    icon: <Target className="w-5 h-5" />,
    definition: 'Measures market volatility by calculating the average range between high and low prices over a period (typically 14 days). Higher ATR = more volatile.',
    howToUse: 'Use ATR to set stop-loss levels (e.g., 2x ATR below entry). Also helps position sizing - smaller positions in high ATR stocks.',
    example: 'If TITAN has ATR of ₹50 and you buy at ₹3000, a reasonable stop-loss might be ₹2900 (2x ATR). Expect daily swings of around ₹50.',
    interpretation: {
      bullish: 'Low ATR with price at support = potential breakout setup',
      bearish: 'High ATR with price at resistance = high risk zone',
      neutral: 'Average ATR indicates normal volatility conditions',
    },
    category: 'volatility',
    color: 'bg-orange-500',
  },
  {
    term: 'Price-to-Earnings Ratio',
    shortName: 'P/E',
    icon: <Percent className="w-5 h-5" />,
    definition: 'Stock price divided by earnings per share. Shows how much investors pay for each rupee of earnings. Lower P/E may indicate undervaluation.',
    howToUse: 'Compare P/E with sector average and historical P/E. High-growth companies often have higher P/E. Very high P/E may indicate overvaluation.',
    example: 'Infosys P/E of 25 vs IT sector average of 30 → relatively undervalued. Compare with TCS P/E to make better decisions.',
    interpretation: {
      bullish: 'P/E below historical average and sector peers',
      bearish: 'P/E significantly above historical average',
      neutral: 'P/E in line with sector and historical norms',
    },
    category: 'trend',
    color: 'bg-emerald-500',
  },
  {
    term: 'Market Capitalization',
    shortName: 'Market Cap',
    icon: <Clock className="w-5 h-5" />,
    definition: 'Total market value of a company\'s shares (Price × Shares Outstanding). Categories: Large-cap (>₹20,000 Cr), Mid-cap (₹5,000-20,000 Cr), Small-cap (<₹5,000 Cr).',
    howToUse: 'Large-caps are safer but slower growth. Small-caps are riskier but higher potential returns. Balance portfolio across market caps.',
    example: 'RELIANCE is a large-cap (₹17 lakh crore) - stable but moderate returns. A small-cap IT company may give 50%+ returns but with higher risk.',
    interpretation: {
      bullish: 'Rising market cap indicates growing investor confidence',
      bearish: 'Falling market cap suggests loss of investor confidence',
      neutral: 'Stable market cap with price consolidation',
    },
    category: 'volume',
    color: 'bg-teal-500',
  },
];

const categories = [
  { id: 'all', name: 'All Terms', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'momentum', name: 'Momentum', icon: <Gauge className="w-4 h-4" /> },
  { id: 'trend', name: 'Trend', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'volatility', name: 'Volatility', icon: <Activity className="w-4 h-4" /> },
  { id: 'volume', name: 'Volume', icon: <BarChart3 className="w-4 h-4" /> },
];

export function MarketGlossary() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Market Terms Glossary</h2>
            <p className="text-sm text-muted-foreground">Learn essential technical indicators and trading concepts</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary">{glossaryTerms.length}</div>
            <div className="text-xs text-muted-foreground">Total Terms</div>
          </div>
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-500">2</div>
            <div className="text-xs text-muted-foreground">Momentum</div>
          </div>
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-500">4</div>
            <div className="text-xs text-muted-foreground">Trend</div>
          </div>
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-500">2</div>
            <div className="text-xs text-muted-foreground">Volatility</div>
          </div>
        </div>
      </div>

      {/* Terms by Category */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full justify-start bg-card border border-border flex-wrap h-auto p-1 gap-1">
          {categories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {cat.icon}
              {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat.id} value={cat.id} className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {glossaryTerms
                .filter((term) => cat.id === 'all' || term.category === cat.id)
                .map((term) => (
                  <Card key={term.term} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white", term.color)}>
                          {term.icon}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {term.shortName && (
                              <span className="text-primary font-bold">{term.shortName}</span>
                            )}
                            <span className="text-foreground">{term.term}</span>
                          </CardTitle>
                          <CardDescription className="mt-1">{term.definition}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* How to Use */}
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          How to Use
                        </h4>
                        <p className="text-sm text-muted-foreground">{term.howToUse}</p>
                      </div>

                      {/* Example */}
                      <div className="bg-secondary/50 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-foreground mb-1">📊 Example</h4>
                        <p className="text-sm text-muted-foreground italic">{term.example}</p>
                      </div>

                      {/* Interpretation */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-gain/10 border border-gain/20 rounded-lg p-2 text-center">
                          <TrendingUp className="w-4 h-4 text-gain mx-auto mb-1" />
                          <p className="text-xs font-medium text-gain">Bullish</p>
                          <p className="text-xs text-muted-foreground mt-1">{term.interpretation.bullish}</p>
                        </div>
                        <div className="bg-loss/10 border border-loss/20 rounded-lg p-2 text-center">
                          <TrendingDown className="w-4 h-4 text-loss mx-auto mb-1" />
                          <p className="text-xs font-medium text-loss">Bearish</p>
                          <p className="text-xs text-muted-foreground mt-1">{term.interpretation.bearish}</p>
                        </div>
                        <div className="bg-muted/50 border border-border rounded-lg p-2 text-center">
                          <Activity className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                          <p className="text-xs font-medium text-muted-foreground">Neutral</p>
                          <p className="text-xs text-muted-foreground mt-1">{term.interpretation.neutral}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
