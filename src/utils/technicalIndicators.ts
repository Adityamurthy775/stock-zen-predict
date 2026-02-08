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

// Calculate Stochastic Oscillator (%K and %D)
export function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod: number = 14,
  dPeriod: number = 3
): { k: number[]; d: number[] } {
  const kValues: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) {
      kValues.push(NaN);
    } else {
      const highSlice = highs.slice(i - kPeriod + 1, i + 1);
      const lowSlice = lows.slice(i - kPeriod + 1, i + 1);
      const highestHigh = Math.max(...highSlice);
      const lowestLow = Math.min(...lowSlice);
      
      if (highestHigh === lowestLow) {
        kValues.push(50);
      } else {
        kValues.push(((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100);
      }
    }
  }
  
  // %D is the SMA of %K
  const dValues = calculateSMA(kValues.map(v => isNaN(v) ? 0 : v), dPeriod);
  
  return { k: kValues, d: dValues };
}

// Calculate ADX (Average Directional Index)
export function calculateADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): { adx: number[]; plusDI: number[]; minusDI: number[] } {
  const trueRange: number[] = [0];
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  
  for (let i = 1; i < closes.length; i++) {
    const highDiff = highs[i] - highs[i - 1];
    const lowDiff = lows[i - 1] - lows[i];
    
    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
    
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRange.push(tr);
  }
  
  // Smooth with Wilder's method
  const smoothTR: number[] = [];
  const smoothPlusDM: number[] = [];
  const smoothMinusDM: number[] = [];
  const plusDI: number[] = [];
  const minusDI: number[] = [];
  const dx: number[] = [];
  const adx: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      smoothTR.push(NaN);
      smoothPlusDM.push(NaN);
      smoothMinusDM.push(NaN);
      plusDI.push(NaN);
      minusDI.push(NaN);
      dx.push(NaN);
      adx.push(NaN);
    } else if (i === period) {
      const sumTR = trueRange.slice(1, period + 1).reduce((a, b) => a + b, 0);
      const sumPlusDM = plusDM.slice(1, period + 1).reduce((a, b) => a + b, 0);
      const sumMinusDM = minusDM.slice(1, period + 1).reduce((a, b) => a + b, 0);
      
      smoothTR.push(sumTR);
      smoothPlusDM.push(sumPlusDM);
      smoothMinusDM.push(sumMinusDM);
      
      const pdi = sumTR > 0 ? (sumPlusDM / sumTR) * 100 : 0;
      const mdi = sumTR > 0 ? (sumMinusDM / sumTR) * 100 : 0;
      plusDI.push(pdi);
      minusDI.push(mdi);
      
      const diSum = pdi + mdi;
      dx.push(diSum > 0 ? (Math.abs(pdi - mdi) / diSum) * 100 : 0);
      adx.push(NaN); // Need more DX values for ADX
    } else {
      const prevSTR = smoothTR[i - 1];
      const prevSPDM = smoothPlusDM[i - 1];
      const prevSMDM = smoothMinusDM[i - 1];
      
      if (isNaN(prevSTR)) {
        smoothTR.push(NaN);
        smoothPlusDM.push(NaN);
        smoothMinusDM.push(NaN);
        plusDI.push(NaN);
        minusDI.push(NaN);
        dx.push(NaN);
        adx.push(NaN);
        continue;
      }
      
      const str = prevSTR - (prevSTR / period) + trueRange[i];
      const spdm = prevSPDM - (prevSPDM / period) + plusDM[i];
      const smdm = prevSMDM - (prevSMDM / period) + minusDM[i];
      
      smoothTR.push(str);
      smoothPlusDM.push(spdm);
      smoothMinusDM.push(smdm);
      
      const pdi = str > 0 ? (spdm / str) * 100 : 0;
      const mdi = str > 0 ? (smdm / str) * 100 : 0;
      plusDI.push(pdi);
      minusDI.push(mdi);
      
      const diSum = pdi + mdi;
      const dxVal = diSum > 0 ? (Math.abs(pdi - mdi) / diSum) * 100 : 0;
      dx.push(dxVal);
      
      // ADX = smoothed DX over period
      const validDx = dx.filter(v => !isNaN(v));
      if (validDx.length >= period) {
        const adxVal = validDx.slice(-period).reduce((a, b) => a + b, 0) / period;
        adx.push(adxVal);
      } else {
        adx.push(NaN);
      }
    }
  }
  
  return { adx, plusDI, minusDI };
}

// Calculate VWAP (Volume Weighted Average Price)
export function calculateVWAP(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[]
): number[] {
  const result: number[] = [];
  let cumulativePV = 0;
  let cumulativeVol = 0;
  
  for (let i = 0; i < closes.length; i++) {
    const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
    cumulativePV += typicalPrice * volumes[i];
    cumulativeVol += volumes[i];
    result.push(cumulativeVol > 0 ? cumulativePV / cumulativeVol : closes[i]);
  }
  
  return result;
}

// Calculate OBV (On-Balance Volume)
export function calculateOBV(closes: number[], volumes: number[]): number[] {
  const result: number[] = [volumes[0] || 0];
  
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      result.push(result[i - 1] + volumes[i]);
    } else if (closes[i] < closes[i - 1]) {
      result.push(result[i - 1] - volumes[i]);
    } else {
      result.push(result[i - 1]);
    }
  }
  
  return result;
}

// Find Support and Resistance Levels
export function findSupportResistance(
  highs: number[],
  lows: number[],
  closes: number[],
  lookback: number = 20,
  numLevels: number = 3
): { support: number[]; resistance: number[] } {
  if (closes.length < lookback) {
    return { support: [], resistance: [] };
  }
  
  const recentHighs = highs.slice(0, lookback);
  const recentLows = lows.slice(0, lookback);
  const currentPrice = closes[0];
  
  // Find local minima (support) and maxima (resistance)
  const pivotHighs: number[] = [];
  const pivotLows: number[] = [];
  
  for (let i = 2; i < recentHighs.length - 2; i++) {
    // Pivot high: higher than 2 neighbors on each side
    if (recentHighs[i] > recentHighs[i - 1] && recentHighs[i] > recentHighs[i - 2] &&
        recentHighs[i] > recentHighs[i + 1] && recentHighs[i] > recentHighs[i + 2]) {
      pivotHighs.push(recentHighs[i]);
    }
    // Pivot low: lower than 2 neighbors on each side
    if (recentLows[i] < recentLows[i - 1] && recentLows[i] < recentLows[i - 2] &&
        recentLows[i] < recentLows[i + 1] && recentLows[i] < recentLows[i + 2]) {
      pivotLows.push(recentLows[i]);
    }
  }
  
  // Add recent high/low as fallback
  if (pivotHighs.length === 0) pivotHighs.push(Math.max(...recentHighs));
  if (pivotLows.length === 0) pivotLows.push(Math.min(...recentLows));
  
  // Filter: resistance above current price, support below
  const resistance = [...new Set(pivotHighs)]
    .filter(p => p > currentPrice)
    .sort((a, b) => a - b)
    .slice(0, numLevels);
    
  const support = [...new Set(pivotLows)]
    .filter(p => p < currentPrice)
    .sort((a, b) => b - a)
    .slice(0, numLevels);
  
  return { support, resistance };
}

// Calculate indicators at a specific lookback window for multi-timeframe analysis
export function calculateIndicatorsAtWindow(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  window: number
): {
  rsi: number;
  macdValue: number;
  macdSignal: number;
  smaShort: number;
  smaLong: number;
  bollingerPosition: number;
  stochasticK: number;
  adxValue: number;
  obvTrend: number;
} {
  const windowCloses = closes.slice(0, Math.min(window, closes.length));
  const windowHighs = highs.slice(0, Math.min(window, highs.length));
  const windowLows = lows.slice(0, Math.min(window, lows.length));
  const windowVolumes = volumes.slice(0, Math.min(window, volumes.length));
  
  // RSI
  const rsiArr = calculateRSI(windowCloses);
  const rsi = rsiArr.filter(v => !isNaN(v)).pop() ?? 50;
  
  // MACD
  const macdResult = calculateMACD(windowCloses);
  const validMacd = macdResult.macd.filter(v => !isNaN(v));
  const validSignal = macdResult.signal.filter(v => !isNaN(v));
  const macdValue = validMacd.pop() ?? 0;
  const macdSignalVal = validSignal.pop() ?? 0;
  
  // SMA
  const smaShortArr = calculateSMA(windowCloses, Math.min(5, windowCloses.length));
  const smaLongArr = calculateSMA(windowCloses, Math.min(20, windowCloses.length));
  const smaShort = smaShortArr.filter(v => !isNaN(v)).pop() ?? windowCloses[0];
  const smaLong = smaLongArr.filter(v => !isNaN(v)).pop() ?? windowCloses[0];
  
  // Bollinger position
  const bb = calculateBollingerBands(windowCloses, Math.min(20, windowCloses.length));
  const lastUpper = bb.upper.filter(v => !isNaN(v)).pop() ?? 0;
  const lastLower = bb.lower.filter(v => !isNaN(v)).pop() ?? 0;
  const bollingerPosition = lastUpper !== lastLower
    ? (windowCloses[windowCloses.length - 1] - lastLower) / (lastUpper - lastLower)
    : 0.5;
  
  // Stochastic
  const stoch = calculateStochastic(windowHighs, windowLows, windowCloses);
  const stochasticK = stoch.k.filter(v => !isNaN(v)).pop() ?? 50;
  
  // ADX
  const adxResult = calculateADX(windowHighs, windowLows, windowCloses);
  const adxValue = adxResult.adx.filter(v => !isNaN(v)).pop() ?? 25;
  
  // OBV trend (normalized: positive = accumulation, negative = distribution)
  const obv = calculateOBV(windowCloses, windowVolumes);
  const obvRecent = obv.slice(-5);
  const obvTrend = obvRecent.length >= 2
    ? (obvRecent[obvRecent.length - 1] - obvRecent[0]) / Math.abs(obvRecent[0] || 1)
    : 0;
  
  return {
    rsi,
    macdValue,
    macdSignal: macdSignalVal,
    smaShort,
    smaLong,
    bollingerPosition,
    stochasticK,
    adxValue,
    obvTrend,
  };
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
