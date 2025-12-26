import type { Prediction, ModelMetrics, NewsItem, PredictionPeriod } from "@/types/stock";

// Generate mock predictions - this will be replaced with actual ML backend API calls
export function generateMockPrediction(
  symbol: string,
  currentPrice: number,
  period: PredictionPeriod
): Prediction {
  // Simulate prediction logic based on period
  const volatility = 0.02 + Math.random() * 0.03; // 2-5% volatility
  const trend = Math.random() > 0.5 ? 1 : -1;
  
  const periodDays: Record<PredictionPeriod, number> = {
    '1d': 1,
    '5d': 5,
    '1m': 30,
    '3m': 90,
    '6m': 180,
  };
  
  const days = periodDays[period];
  const changeMultiplier = Math.sqrt(days) * volatility * trend;
  const predictedChange = currentPrice * changeMultiplier;
  const predictedPrice = currentPrice + predictedChange;
  
  const confidence = Math.max(50, Math.min(95, 85 - days * 0.3 + Math.random() * 10));
  const uncertainty = (100 - confidence) / 100 * currentPrice * 0.05;
  
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

// Model metrics with descriptions
export function getMockModelMetrics(): ModelMetrics[] {
  return [
    {
      name: 'LSTM Neural Network',
      description: 'Captures long-term temporal dependencies in sequential price data for trend prediction.',
      accuracy: 84.2,
      mse: 0.0023,
      mae: 0.0156,
      r2Score: 0.892,
      lastTrained: '2024-12-20',
    },
    {
      name: 'CNN Pattern Recognition',
      description: 'Identifies chart patterns and visual signals using convolutional filters on price data.',
      accuracy: 81.5,
      mse: 0.0031,
      mae: 0.0189,
      r2Score: 0.854,
      lastTrained: '2024-12-19',
    },
    {
      name: 'Logistic Regression',
      description: 'Binary classification model for predicting market direction (up/down) based on features.',
      accuracy: 72.8,
      mse: 0.0052,
      mae: 0.0245,
      r2Score: 0.723,
      lastTrained: '2024-12-18',
    },
    {
      name: 'Sentiment Analysis',
      description: 'Analyzes news and social media sentiment to predict market mood and price movements.',
      accuracy: 68.5,
      mse: 0.0078,
      mae: 0.0312,
      r2Score: 0.645,
      lastTrained: '2024-12-17',
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
