import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, TrendingUp, Activity, BarChart, CandlestickChart, ArrowUpDown, Layers, Target, DollarSign, LineChart, PieChart, Percent } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GlossaryTerm {
  term: string;
  shortName?: string;
  icon: React.ReactNode;
  category: string;
  definition: string;
  howToUse: string;
  example?: string;
}

const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'Relative Strength Index',
    shortName: 'RSI',
    icon: <TrendingUp className="h-5 w-5 text-purple-500" />,
    category: 'Technical Indicator',
    definition: 'RSI measures the speed and magnitude of recent price changes to evaluate overbought or oversold conditions. It ranges from 0 to 100.',
    howToUse: 'RSI above 70 suggests the stock is overbought (may fall). RSI below 30 suggests oversold (may rise). Between 30-70 is neutral.',
    example: 'If TCS has RSI = 75, it may be overbought — consider waiting before buying.'
  },
  {
    term: 'Moving Average Convergence Divergence',
    shortName: 'MACD',
    icon: <BarChart className="h-5 w-5 text-blue-500" />,
    category: 'Technical Indicator',
    definition: 'MACD shows the relationship between two moving averages of a stock\'s price. It consists of the MACD line, signal line, and histogram.',
    howToUse: 'When MACD crosses above the signal line, it\'s a bullish signal (buy). When it crosses below, it\'s bearish (sell).',
    example: 'MACD Line = 2.5, Signal = 1.8 → Bullish crossover, positive momentum.'
  },
  {
    term: 'Bollinger Bands',
    shortName: 'BB',
    icon: <Activity className="h-5 w-5 text-green-500" />,
    category: 'Technical Indicator',
    definition: 'Bollinger Bands consist of a middle band (20-day SMA) with upper and lower bands at 2 standard deviations. They measure volatility.',
    howToUse: 'Price near upper band = potentially overbought. Price near lower band = potentially oversold. Bands widening = increasing volatility.',
    example: 'If Reliance price touches the lower Bollinger Band, it might bounce back up.'
  },
  {
    term: 'Simple Moving Average',
    shortName: 'SMA',
    icon: <LineChart className="h-5 w-5 text-indigo-500" />,
    category: 'Technical Indicator',
    definition: 'SMA calculates the average closing price over a specified period (e.g., 20-day, 50-day, 200-day). It smooths out price fluctuations.',
    howToUse: 'Price above SMA = bullish. Price below SMA = bearish. The 50-day crossing above 200-day is called a "Golden Cross" (very bullish).',
    example: '50-day SMA crossing above 200-day SMA for Infosys signals a long-term uptrend.'
  },
  {
    term: 'Exponential Moving Average',
    shortName: 'EMA',
    icon: <LineChart className="h-5 w-5 text-pink-500" />,
    category: 'Technical Indicator',
    definition: 'EMA gives more weight to recent prices, making it more responsive to new information than SMA. Common periods: 9, 21, 50, 200 days.',
    howToUse: 'Faster than SMA to react to price changes. Short-term EMA crossing above long-term EMA is a buy signal.',
    example: '9-day EMA crossing above 21-day EMA suggests short-term bullish momentum.'
  },
  {
    term: 'Candlestick Chart',
    shortName: 'Candle',
    icon: <CandlestickChart className="h-5 w-5 text-amber-500" />,
    category: 'Chart Type',
    definition: 'A candlestick shows four price points: Open, High, Low, and Close (OHLC). Green candle = close > open (bullish). Red = close < open (bearish).',
    howToUse: 'Look for patterns like Doji (indecision), Hammer (reversal), and Engulfing (strong reversal) patterns.',
    example: 'A green hammer candle after a downtrend suggests a potential reversal upward.'
  },
  {
    term: 'Line Chart',
    shortName: 'Line',
    icon: <LineChart className="h-5 w-5 text-blue-400" />,
    category: 'Chart Type',
    definition: 'A line chart connects closing prices over time with a continuous line. Simplest way to visualize price trends.',
    howToUse: 'Use for quick trend identification. Upward slope = uptrend, downward = downtrend. Best for longer timeframes.',
    example: 'A line chart of NIFTY 50 over 1 year shows the overall market direction.'
  },
  {
    term: 'Bar Chart (OHLC)',
    shortName: 'OHLC',
    icon: <BarChart className="h-5 w-5 text-teal-500" />,
    category: 'Chart Type',
    definition: 'Similar to candlestick but uses horizontal ticks for open (left) and close (right) on a vertical bar showing high-low range.',
    howToUse: 'Good for seeing price range and direction. Less visual than candlesticks but shows the same OHLC data.',
    example: 'A bar with close tick higher than open tick indicates a bullish day.'
  },
  {
    term: 'Volume',
    shortName: 'Vol',
    icon: <Layers className="h-5 w-5 text-cyan-500" />,
    category: 'Market Data',
    definition: 'Volume is the total number of shares traded during a given period. High volume confirms price trends.',
    howToUse: 'Rising price + high volume = strong uptrend. Rising price + low volume = weak rally that might reverse.',
    example: 'HDFC Bank trading 2 Cr shares vs daily average of 50 L = unusually high volume.'
  },
  {
    term: 'Market Capitalization',
    shortName: 'Market Cap',
    icon: <DollarSign className="h-5 w-5 text-emerald-500" />,
    category: 'Market Data',
    definition: 'Market Cap = Current Share Price × Total Outstanding Shares. It represents the total market value of a company.',
    howToUse: 'Large Cap (>₹20,000 Cr) = stable. Mid Cap (₹5,000-20,000 Cr) = moderate risk. Small Cap (<₹5,000 Cr) = higher risk/reward.',
    example: 'Reliance with ₹18L Cr market cap is India\'s largest company by market value.'
  },
  {
    term: 'Open Interest',
    shortName: 'OI',
    icon: <Layers className="h-5 w-5 text-violet-500" />,
    category: 'Market Data',
    definition: 'Total number of outstanding derivative contracts (futures/options) that haven\'t been settled.',
    howToUse: 'Rising OI + rising price = bullish. Rising OI + falling price = bearish. Falling OI = trend weakening.',
    example: 'NIFTY futures OI increasing with price rise suggests strong institutional buying.'
  },
  {
    term: 'Price-to-Earnings Ratio',
    shortName: 'P/E Ratio',
    icon: <Percent className="h-5 w-5 text-teal-500" />,
    category: 'Fundamental',
    definition: 'P/E = Share Price ÷ Earnings Per Share. It shows how much investors pay for each rupee of earnings.',
    howToUse: 'Low P/E may indicate undervaluation. High P/E may indicate overvaluation or high growth expectations.',
    example: 'HDFC Bank P/E of 20 vs industry average of 15 means investors expect higher growth.'
  },
  {
    term: 'Dividend Yield',
    shortName: 'Div Yield',
    icon: <PieChart className="h-5 w-5 text-lime-500" />,
    category: 'Fundamental',
    definition: 'Dividend Yield = (Annual Dividends per Share ÷ Share Price) × 100. Shows percentage return from dividends.',
    howToUse: 'Higher yield = more income. Stable companies like ITC, Coal India offer higher dividends.',
    example: 'ITC with 3.5% dividend yield means ₹3.50 per ₹100 invested annually.'
  },
  {
    term: 'Earnings Per Share',
    shortName: 'EPS',
    icon: <DollarSign className="h-5 w-5 text-amber-500" />,
    category: 'Fundamental',
    definition: 'EPS = Net Profit ÷ Total Outstanding Shares. Measures profitability on a per-share basis.',
    howToUse: 'Rising EPS over quarters signals growing profitability. Compare with industry peers.',
    example: 'TCS EPS of ₹120 means each share earned ₹120 in profit over the year.'
  },
  {
    term: 'Book Value',
    shortName: 'BV',
    icon: <DollarSign className="h-5 w-5 text-green-600" />,
    category: 'Fundamental',
    definition: 'Book Value = Total Assets - Total Liabilities. Price-to-Book (P/B) ratio compares market price to book value.',
    howToUse: 'P/B < 1 may indicate undervalued stock. Banks typically trade at 1-3x book value.',
    example: 'SBI with P/B of 1.5 means market values it at 1.5 times its net assets.'
  },
  {
    term: 'Support and Resistance',
    shortName: 'S/R',
    icon: <ArrowUpDown className="h-5 w-5 text-orange-500" />,
    category: 'Price Action',
    definition: 'Support: price level where buying prevents further decline. Resistance: where selling prevents further rise.',
    howToUse: 'Buy near support levels, sell near resistance. Breakout above resistance is bullish.',
    example: 'If TCS consistently bounces off ₹3,500, that level is strong support.'
  },
  {
    term: 'Bull Market / Bear Market',
    shortName: 'Bull/Bear',
    icon: <TrendingUp className="h-5 w-5 text-green-500" />,
    category: 'Price Action',
    definition: 'Bull Market: prices rising (optimism). Bear Market: prices falling (pessimism). Generally defined as 20%+ move.',
    howToUse: 'In bull markets, "buy the dip" works. In bear markets, focus on capital preservation.',
    example: 'Indian market was bullish from March 2020 to October 2021 (Nifty 7,500 to 18,600).'
  },
  {
    term: 'Stop Loss',
    shortName: 'SL',
    icon: <Target className="h-5 w-5 text-red-500" />,
    category: 'Risk Management',
    definition: 'A predetermined price at which you sell to limit your loss. An automatic exit strategy.',
    howToUse: 'Set stop loss 5-10% below buy price for swing trades, 1-2% for intraday.',
    example: 'Bought Infosys at ₹1,500 with stop loss at ₹1,425 (5% risk).'
  },
  {
    term: 'Risk-Reward Ratio',
    shortName: 'R:R',
    icon: <Target className="h-5 w-5 text-orange-500" />,
    category: 'Risk Management',
    definition: 'Ratio of potential loss to potential gain. A 1:3 ratio means risking ₹1 to potentially gain ₹3.',
    howToUse: 'Always aim for at least 1:2 risk-reward. Higher ratios compensate for lower win rates.',
    example: 'Buy at ₹100, SL at ₹95 (₹5 risk), target ₹115 (₹15 reward) = 1:3 ratio.'
  },
  {
    term: 'Intraday vs Delivery Trading',
    shortName: 'Intraday/Delivery',
    icon: <ArrowUpDown className="h-5 w-5 text-violet-500" />,
    category: 'Trading Style',
    definition: 'Intraday: buy and sell same day. Delivery: hold for days/weeks/months.',
    howToUse: 'Intraday requires quick decisions and high volume stocks. Delivery suits long-term investors.',
    example: 'Buying Reliance at 9:30 AM and selling at 2:00 PM is intraday trading.'
  },
  {
    term: 'Swing Trading',
    shortName: 'Swing',
    icon: <Activity className="h-5 w-5 text-cyan-500" />,
    category: 'Trading Style',
    definition: 'Holding stocks for a few days to weeks, capturing "swings" in price momentum.',
    howToUse: 'Use technical analysis to find entry/exit. Look for stocks breaking out of ranges.',
    example: 'Buy TCS at ₹3,800 on breakout, sell at ₹4,100 in 5 days = swing trade.'
  },
];

const SUB_TABS = [
  { id: 'all', label: 'All Terms' },
  { id: 'Technical Indicator', label: 'Technical Indicators' },
  { id: 'Chart Type', label: 'Chart Types' },
  { id: 'Market Data', label: 'Market Data' },
  { id: 'Fundamental', label: 'Fundamentals' },
  { id: 'Price Action', label: 'Price Action' },
  { id: 'Risk Management', label: 'Risk Management' },
  { id: 'Trading Style', label: 'Trading Styles' },
];

export default function GlossaryTab() {
  const [activeTab, setActiveTab] = useState('all');

  const filteredTerms = activeTab === 'all'
    ? GLOSSARY_TERMS
    : GLOSSARY_TERMS.filter(t => t.category === activeTab);

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-lg">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl">Stock Market Glossary</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Essential terms every trader and investor should know
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50 flex-wrap h-auto gap-1 p-1">
              {SUB_TABS.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="text-xs px-3 py-1.5">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="h-[600px] pr-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTerms.map(term => (
                  <Card key={term.term} className="border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        {term.icon}
                        <div>
                          <h3 className="font-bold text-sm">{term.term}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {term.shortName && (
                              <Badge variant="outline" className="text-[10px]">
                                {term.shortName}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px]">
                              {term.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {term.definition}
                      </p>
                      <div className="rounded-md bg-primary/5 p-2.5 border border-primary/10">
                        <p className="text-xs font-medium text-primary mb-1">📈 How to Use:</p>
                        <p className="text-xs text-muted-foreground">{term.howToUse}</p>
                      </div>
                      {term.example && (
                        <div className="rounded-md bg-muted/50 p-2.5">
                          <p className="text-xs font-medium mb-1">💡 Example:</p>
                          <p className="text-xs text-muted-foreground italic">{term.example}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
