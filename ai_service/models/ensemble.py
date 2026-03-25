import numpy as np
import pandas as pd
from .lstm_model import LSTMPredictor
from .cnn_model import CNNPredictor
from .technical_indicators import calculate_all_indicators


class EnsemblePredictor:
    """
    Weighted ensemble combining LSTM, CNN, and technical analysis models.
    Dynamically adjusts weights based on market regime detection.
    """

    def __init__(self):
        self.lstm = LSTMPredictor(sequence_length=60, epochs=50, batch_size=32)
        self.cnn = CNNPredictor(sequence_length=30, epochs=50, batch_size=32)
        self.weights = {'lstm': 0.40, 'cnn': 0.35, 'technical': 0.25}
        self.metrics = {}

    def _detect_regime(self, df: pd.DataFrame) -> str:
        """Detect market regime: trending, ranging, or volatile."""
        adx = df['ADX'].iloc[-1] if 'ADX' in df.columns else 25
        volatility = df['Volatility_20d'].iloc[-1] if 'Volatility_20d' in df.columns else 0.02

        if adx > 30:
            return 'trending'
        elif volatility > 0.03:
            return 'volatile'
        else:
            return 'ranging'

    def _adjust_weights(self, regime: str):
        """Dynamically adjust model weights based on market regime."""
        if regime == 'trending':
            self.weights = {'lstm': 0.50, 'cnn': 0.30, 'technical': 0.20}
        elif regime == 'volatile':
            self.weights = {'lstm': 0.30, 'cnn': 0.40, 'technical': 0.30}
        else:  # ranging
            self.weights = {'lstm': 0.35, 'cnn': 0.30, 'technical': 0.35}

    def _technical_prediction(self, df: pd.DataFrame) -> dict:
        """Technical analysis based prediction using indicator consensus."""
        close = float(df['Close'].iloc[-1])
        signals = []

        # RSI signal
        rsi = df['RSI'].iloc[-1]
        if rsi < 30:
            signals.append(0.03)
        elif rsi < 40:
            signals.append(0.01)
        elif rsi > 70:
            signals.append(-0.03)
        elif rsi > 60:
            signals.append(-0.01)
        else:
            signals.append(0)

        # MACD signal
        macd = df['MACD'].iloc[-1]
        macd_signal = df['MACD_Signal'].iloc[-1]
        if macd > macd_signal:
            signals.append(0.02)
        else:
            signals.append(-0.02)

        # SMA crossover
        sma_10 = df['SMA_10'].iloc[-1]
        sma_50 = df['SMA_50'].iloc[-1]
        if sma_10 > sma_50:
            signals.append(0.015)
        else:
            signals.append(-0.015)

        # Bollinger position
        bb_pos = df['BB_Position'].iloc[-1]
        if bb_pos < 0.2:
            signals.append(0.02)
        elif bb_pos > 0.8:
            signals.append(-0.02)
        else:
            signals.append(0)

        # Stochastic
        stoch_k = df['Stoch_K'].iloc[-1]
        if stoch_k < 20:
            signals.append(0.015)
        elif stoch_k > 80:
            signals.append(-0.015)
        else:
            signals.append(0)

        avg_signal = np.mean(signals)
        predicted_price = close * (1 + avg_signal)

        return {
            'model': 'Technical Analysis',
            'predicted_price': predicted_price,
            'current_price': close,
            'change_pct': avg_signal * 100,
            'confidence': 75,
        }

    def train(self, df: pd.DataFrame, lookahead: int = 1):
        """Train all sub-models."""
        df = calculate_all_indicators(df.copy())

        print("Training LSTM model...")
        self.lstm.train(df, lookahead)

        print("Training CNN model...")
        self.cnn.train(df, lookahead)

        # Evaluate and store metrics
        print("Evaluating models...")
        self.metrics['lstm'] = self.lstm.evaluate(df, lookahead)
        self.metrics['cnn'] = self.cnn.evaluate(df, lookahead)

        print(f"LSTM metrics: {self.metrics.get('lstm', {})}")
        print(f"CNN metrics: {self.metrics.get('cnn', {})}")

    def predict(self, df: pd.DataFrame) -> dict:
        """Generate ensemble prediction."""
        df = calculate_all_indicators(df.copy())

        regime = self._detect_regime(df)
        self._adjust_weights(regime)

        predictions = {}
        lstm_pred = self.lstm.predict(df)
        cnn_pred = self.cnn.predict(df)
        tech_pred = self._technical_prediction(df)

        if lstm_pred:
            predictions['lstm'] = lstm_pred
        if cnn_pred:
            predictions['cnn'] = cnn_pred
        predictions['technical'] = tech_pred

        if not predictions:
            return tech_pred

        # Weighted average
        total_weight = 0
        weighted_price = 0
        weighted_confidence = 0

        for key, pred in predictions.items():
            w = self.weights.get(key, 0.2)
            weighted_price += pred['predicted_price'] * w
            weighted_confidence += pred['confidence'] * w
            total_weight += w

        if total_weight > 0:
            weighted_price /= total_weight
            weighted_confidence /= total_weight

        current_price = float(df['Close'].iloc[-1])
        change = weighted_price - current_price
        change_pct = (change / current_price) * 100

        trend = 'bullish' if change_pct > 0.5 else ('bearish' if change_pct < -0.5 else 'neutral')
        recommendation = 'Buy' if change_pct > 2 else ('Sell' if change_pct < -2 else 'Hold')

        return {
            'current_price': current_price,
            'predicted_price': float(weighted_price),
            'change_pct': change_pct,
            'trend': trend,
            'recommendation': recommendation,
            'confidence': weighted_confidence / 100,
            'regime': regime,
            'weights': self.weights,
            'individual_predictions': predictions,
            'model_metrics': self.metrics,
        }
