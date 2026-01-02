import type { TimeSeriesPoint } from '@/types/stock';

export interface IndicatorData {
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  bollingerUpper: number | null;
  bollingerMiddle: number | null;
  bollingerLower: number | null;
}

// Calculate Simple Moving Average
export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

// Calculate Exponential Moving Average
export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      // First EMA is SMA
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    } else {
      const prevEMA = result[i - 1];
      result.push((data[i] - prevEMA) * multiplier + prevEMA);
    }
  }
  return result;
}

// Calculate RSI (Relative Strength Index)
export function calculateRSI(prices: number[], period: number = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      result.push(NaN);
    } else {
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
  }
  
  return result;
}

// Calculate MACD (Moving Average Convergence Divergence)
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
  }
  
  const validMacd = macdLine.filter(v => !isNaN(v));
  const signalEMA = calculateEMA(validMacd, signalPeriod);
  
  const signalLine: number[] = [];
  let validIndex = 0;
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(macdLine[i])) {
      signalLine.push(NaN);
    } else {
      signalLine.push(signalEMA[validIndex] || NaN);
      validIndex++;
    }
  }
  
  const histogram: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
      histogram.push(NaN);
    } else {
      histogram.push(macdLine[i] - signalLine[i]);
    }
  }
  
  return { macd: macdLine, signal: signalLine, histogram };
}

// Calculate Bollinger Bands
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = middle[i];
      const squaredDiffs = slice.map(p => Math.pow(p - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      upper.push(mean + stdDev * standardDeviation);
      lower.push(mean - stdDev * standardDeviation);
    }
  }
  
  return { upper, middle, lower };
}

// Calculate all indicators for chart data
export function calculateIndicators(timeSeries: TimeSeriesPoint[]): {
  rsi: Array<{ datetime: string; value: number | null }>;
  macd: Array<{ datetime: string; macd: number | null; signal: number | null; histogram: number | null }>;
  bollinger: Array<{ datetime: string; upper: number | null; middle: number | null; lower: number | null }>;
} {
  const closePrices = timeSeries.map(p => p.close);
  
  const rsiValues = calculateRSI(closePrices, 14);
  const { macd, signal, histogram } = calculateMACD(closePrices);
  const { upper, middle, lower } = calculateBollingerBands(closePrices);
  
  return {
    rsi: timeSeries.map((p, i) => ({
      datetime: p.datetime,
      value: isNaN(rsiValues[i]) ? null : rsiValues[i]
    })),
    macd: timeSeries.map((p, i) => ({
      datetime: p.datetime,
      macd: isNaN(macd[i]) ? null : macd[i],
      signal: isNaN(signal[i]) ? null : signal[i],
      histogram: isNaN(histogram[i]) ? null : histogram[i]
    })),
    bollinger: timeSeries.map((p, i) => ({
      datetime: p.datetime,
      upper: isNaN(upper[i]) ? null : upper[i],
      middle: isNaN(middle[i]) ? null : middle[i],
      lower: isNaN(lower[i]) ? null : lower[i]
    }))
  };
}
