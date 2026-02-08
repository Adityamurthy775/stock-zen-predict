

# Prediction Model Enhancement Plan

## Current State Summary

The prediction system currently uses:
- A symbol-hash-based trend calculator with fixed momentum signals
- A multi-model ensemble (CNN 45%, Momentum 35%, Mean Reversion 20%) that does NOT use actual historical price data
- Static model metrics (hardcoded accuracy numbers)
- An offline fallback that DOES use real technical indicators (RSI, MACD, Bollinger Bands, VWAP, Stochastic)
- An AI-powered prediction edge function (uses Gemini 2.5 Flash) that is only triggered manually from the Accuracy tab

## Key Problem

The main prediction engine (`generateMockPrediction`) generates forecasts based on the **stock symbol hash** rather than **actual price data**. This means the same stock always gets roughly the same trend regardless of what the market is actually doing. The real technical analysis logic exists in `offlinePrediction.ts` but is only used as a fallback, not as the primary engine.

---

## Proposed Improvements

### 1. Feed Real Price Data into the Primary Prediction Engine

**What changes:** Refactor `generateMockPrediction` to accept `timeSeries` (historical price data) as an input parameter, and compute RSI, MACD, Bollinger Bands, SMA crossovers, and volume signals from actual data instead of symbol hashes.

**Why it matters:** Right now, predictions for AAPL will always be the same regardless of whether the stock is at an all-time high or crashing. Using real data makes every prediction reactive to actual market conditions.

**Files affected:**
- `src/services/predictionService.ts` - accept `timeSeries` param, compute real indicators
- `src/hooks/useStockData.ts` - pass `timeSeries` to `generateMockPrediction`

---

### 2. Add Volume-Weighted Signals to the Ensemble

**What changes:** Incorporate VWAP (Volume Weighted Average Price) and OBV (On-Balance Volume) into the prediction calculation. Volume confirms or denies price movements - a price rise on low volume is less reliable than one on high volume.

**Why it matters:** Currently, volume data is completely ignored in predictions even though it's available in the time series data.

**Files affected:**
- `src/services/predictionService.ts` - add volume analysis functions and integrate into ensemble weights

---

### 3. Add Stochastic Oscillator and ADX (Average Directional Index)

**What changes:** Add two more technical indicators:
- **Stochastic Oscillator** - identifies overbought/oversold conditions differently than RSI
- **ADX** - measures trend strength (not direction), helping the model know when to trust trend signals vs mean reversion

**Why it matters:** More diverse indicators reduce the chance of false signals. ADX specifically helps decide whether to follow momentum or expect reversal.

**Files affected:**
- `src/utils/technicalIndicators.ts` - add `calculateStochastic` and `calculateADX` functions
- `src/services/predictionService.ts` - integrate new indicators into the ensemble

---

### 4. Dynamic Model Weight Adjustment Based on Market Regime

**What changes:** Instead of fixed weights (CNN 45%, Momentum 35%, Reversion 20%), dynamically adjust based on detected market conditions:
- **Trending market** (high ADX): increase momentum weight, decrease mean reversion
- **Range-bound market** (low ADX): increase mean reversion weight, decrease momentum
- **High volatility**: widen uncertainty bounds, reduce confidence
- **Low volatility**: tighten bounds, increase confidence

**Why it matters:** No single model works in all market conditions. Adapting weights to the current regime significantly improves accuracy.

**Files affected:**
- `src/services/predictionService.ts` - add regime detection and dynamic weight logic

---

### 5. Sector-Specific Calibration Profiles

**What changes:** Expand the asset-type classification beyond just "commodity" and "tech stock" to include:
- **Banking/Financial** (HDFC, ICICI, SBI) - interest rate sensitive
- **Pharma/Healthcare** - defensive, lower beta
- **Energy** - commodity-linked, cyclical
- **IT/Software** (TCS, INFY, WIPRO) - export-linked, USD-sensitive
- **Auto** - consumer discretionary, cyclical

Each sector gets tuned volatility multipliers, mean reversion thresholds, and momentum decay rates.

**Why it matters:** A pharma stock behaves very differently from a tech stock. Sector-aware calibration makes predictions more realistic per asset class.

**Files affected:**
- `src/services/predictionService.ts` - add sector classification map and per-sector parameters

---

### 6. Multi-Timeframe Analysis (MTF)

**What changes:** Analyze trends across multiple timeframes simultaneously:
- **Short-term** (5-day): for 1-day predictions
- **Medium-term** (20-day): for 5-day and 15-day predictions  
- **Long-term** (60-day): for quarterly predictions

A prediction is stronger when all timeframes align (e.g., all bullish).

**Why it matters:** A stock might be bullish on the daily chart but bearish on the weekly. Conflicting signals should reduce confidence rather than ignore the bigger picture.

**Files affected:**
- `src/services/predictionService.ts` - add MTF analysis function
- `src/utils/technicalIndicators.ts` - add helper for computing indicators at different lookback windows

---

### 7. Prediction Confidence Calibration with Historical Backtesting

**What changes:** Instead of formula-based confidence scores, run a quick backtest against the available historical data:
- Apply the prediction logic to past data points
- Compare predicted vs actual outcomes
- Use the historical hit rate as the real confidence score

**Why it matters:** Current confidence scores (82-98%) are calculated from formulas and don't reflect actual prediction quality. A backtest-derived confidence is honest and verifiable.

**Files affected:**
- `src/services/predictionService.ts` - add backtesting function
- `src/components/PredictionAccuracy.tsx` - display backtested metrics alongside current ones

---

### 8. Enhanced AI Prediction Integration

**What changes:** 
- Auto-trigger the AI prediction (via the `stock-prediction` edge function) when a user selects a stock, instead of requiring a manual button click
- Cache AI predictions to avoid redundant API calls
- Blend AI predictions with technical analysis predictions using a weighted average
- Send more technical context to the AI (RSI, MACD values, support/resistance levels)

**Why it matters:** The AI prediction capability already exists but is buried behind a button. Making it seamless and blending it with local analysis creates a stronger hybrid model.

**Files affected:**
- `src/hooks/useStockData.ts` - auto-fetch AI predictions
- `src/components/PredictionAccuracy.tsx` - display blended results
- `supabase/functions/stock-prediction/index.ts` - accept and use pre-computed indicator values

---

### 9. Support and Resistance Level Detection

**What changes:** Add automatic detection of key price levels:
- **Support levels**: recent lows where price bounced
- **Resistance levels**: recent highs where price reversed
- Use these levels to adjust prediction targets (price tends to stall at these levels)

**Why it matters:** A prediction of $155 is less meaningful if there's strong resistance at $152. Support/resistance awareness makes predictions more market-aware.

**Files affected:**
- `src/utils/technicalIndicators.ts` - add `findSupportResistance` function
- `src/services/predictionService.ts` - incorporate S/R levels into price target calculation
- `src/components/StockChart.tsx` - optionally display S/R lines on chart

---

### 10. Model Performance Dashboard Enhancements

**What changes:**
- Show per-stock accuracy breakdown (how well the model performs on each individual stock)
- Add a training progress visualization showing epoch-by-epoch improvement
- Display real-time model metrics derived from actual backtesting instead of hardcoded values
- Add a "Model Comparison" chart showing which model performs best for different stock types

**Why it matters:** Users currently see static, hardcoded model metrics. Dynamic, real metrics build trust and help users understand model strengths and weaknesses.

**Files affected:**
- `src/components/ModelsPanel.tsx` - add per-stock breakdown table and comparison charts
- `src/services/predictionService.ts` - compute real metrics from backtesting

---

## Technical Details

### Implementation Priority (Suggested Order)

1. **Real price data integration** (highest impact - fixes the core problem)
2. **Volume-weighted signals** (quick win, data already available)
3. **Dynamic model weights** (improves all predictions)
4. **Sector calibration** (targeted improvement for Indian stocks)
5. **Multi-timeframe analysis** (improves longer-term predictions)
6. **Support/Resistance detection** (visual and analytical improvement)
7. **Stochastic + ADX indicators** (incremental accuracy gain)
8. **Confidence calibration via backtesting** (trust improvement)
9. **AI prediction auto-integration** (UX and accuracy improvement)
10. **Model dashboard enhancements** (transparency improvement)

### Architecture Approach

The core change is making `generateMockPrediction` accept actual time series data:

```text
Current Flow:
  symbol + currentPrice --> hash-based trend --> prediction

Proposed Flow:
  symbol + currentPrice + timeSeries[] --> real indicators (RSI, MACD, BB, Volume, ADX)
    --> regime detection --> dynamic ensemble weights --> prediction
```

### Key Function Signature Change

```text
// Current
generateMockPrediction(symbol, currentPrice, period)

// Proposed
generateMockPrediction(symbol, currentPrice, period, timeSeries?)
```

The `timeSeries` parameter would be optional to maintain backward compatibility, falling back to the current hash-based approach when data is unavailable.

### Risk Considerations

- All changes maintain the offline fallback capability
- No database changes required
- No new API keys needed
- The AI prediction integration uses the existing Lovable AI gateway (already configured)
- Edge function changes are backward compatible

