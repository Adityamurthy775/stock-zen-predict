import type { Prediction, ModelMetrics, NewsItem, PredictionPeriod } from "@/types/stock";

// Generate mock predictions - this will be replaced with actual ML backend API calls
export function generateMockPrediction(
  symbol: string,
  currentPrice: number,
  period: PredictionPeriod
): Prediction {
  // Use a seeded approach based on symbol for consistent predictions
  const symbolHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seedValue = (symbolHash % 100) / 100; // 0 to 1 based on symbol
  
  const periodDays: Record<PredictionPeriod, number> = {
    '1d': 1,
    '5d': 5,
    '15d': 15,
    '3m': 90,
  };
  
  const days = periodDays[period];
  
  // More realistic volatility: 0.5-2% for short term, scales with time
  const baseVolatility = 0.005 + (seedValue * 0.015); // 0.5% to 2%
  const timeScaledVolatility = baseVolatility * Math.sqrt(days / 252); // Annualized scaling
  
  // Trend based on symbol characteristics (consistent direction)
  const trend = seedValue > 0.5 ? 1 : -1;
  const trendStrength = 0.3 + (seedValue * 0.4); // 30% to 70% of volatility goes to trend
  
  // Calculate price change with realistic bounds
  const trendComponent = currentPrice * timeScaledVolatility * trend * trendStrength;
  const predictedChange = trendComponent;
  const predictedPrice = currentPrice + predictedChange;
  
  // Higher confidence for shorter periods
  const baseConfidence = 92 - (days * 0.15); // Starts at ~92% for 1 day
  const confidence = Math.max(65, Math.min(95, baseConfidence));
  
  // Uncertainty grows with time horizon
  const uncertaintyPercent = (100 - confidence) / 100;
  const uncertainty = currentPrice * uncertaintyPercent * 0.03 * Math.sqrt(days);
  
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  
  return {
    targetDate: targetDate.toISOString().split('T')[0],
    predictedPrice: Math.round(predictedPrice * 100) / 100,
    currentPrice,
    priceChange: Math.round(predictedChange * 100) / 100,
    changePercent: Math.round((predictedChange / currentPrice) * 10000) / 100,
    confidence: Math.round(confidence),
    lowerBound: Math.round((predictedPrice - uncertainty) * 100) / 100,
    upperBound: Math.round((predictedPrice + uncertainty) * 100) / 100,
    trend: predictedChange > 0 ? 'bullish' : predictedChange < 0 ? 'bearish' : 'neutral',
  };
}

// Model metrics with descriptions - increased accuracy
export function getMockModelMetrics(): ModelMetrics[] {
  return [
    {
      name: 'LSTM Neural Network',
      description: 'Captures long-term temporal dependencies in sequential price data for trend prediction.',
      accuracy: 94.7,
      mse: 0.0012,
      mae: 0.0089,
      r2Score: 0.962,
      lastTrained: '2025-01-01',
    },
    {
      name: 'Transformer (GPT-Finance)',
      description: 'State-of-the-art attention-based model trained on financial time series and market data.',
      accuracy: 92.3,
      mse: 0.0015,
      mae: 0.0102,
      r2Score: 0.948,
      lastTrained: '2025-01-01',
    },
    {
      name: 'CNN Pattern Recognition',
      description: 'Identifies chart patterns and visual signals using convolutional filters on price data.',
      accuracy: 89.8,
      mse: 0.0019,
      mae: 0.0124,
      r2Score: 0.921,
      lastTrained: '2024-12-31',
    },
    {
      name: 'Ensemble (XGBoost + LightGBM)',
      description: 'Gradient boosting ensemble combining multiple decision tree models for robust predictions.',
      accuracy: 87.5,
      mse: 0.0022,
      mae: 0.0145,
      r2Score: 0.898,
      lastTrained: '2024-12-31',
    },
    {
      name: 'Sentiment Analysis (NLP)',
      description: 'Analyzes news and social media sentiment using BERT-based models for market mood prediction.',
      accuracy: 82.1,
      mse: 0.0035,
      mae: 0.0198,
      r2Score: 0.845,
      lastTrained: '2024-12-30',
    },
  ];
}

// Calculate prediction points for chart overlay
export function generatePredictionLine(
  lastDataPoint: { datetime: string; close: number },
  prediction: Prediction,
  period: PredictionPeriod
): Array<{ datetime: string; predicted: number }> {
  const points: Array<{ datetime: string; predicted: number }> = [];
  const startDate = new Date(lastDataPoint.datetime);
  const endDate = new Date(prediction.targetDate);
  
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const priceStep = (prediction.predictedPrice - lastDataPoint.close) / totalDays;
  
  for (let i = 1; i <= totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Add some realistic noise to the prediction line
    const noise = (Math.random() - 0.5) * Math.abs(priceStep) * 0.5;
    const predictedValue = lastDataPoint.close + priceStep * i + noise;
    
    points.push({
      datetime: date.toISOString().split('T')[0],
      predicted: Math.round(predictedValue * 100) / 100,
    });
  }
  
  return points;
}
