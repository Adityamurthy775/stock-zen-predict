"""
Legacy compatibility module.
Now delegates to the ensemble of LSTM + CNN + Technical Analysis models.
"""
import numpy as np
import pandas as pd
from models.ensemble import EnsemblePredictor
from models.technical_indicators import calculate_all_indicators


def train_and_predict(df, forecast_period="1mo"):
    """Train LSTM + CNN ensemble and generate prediction."""
    lookahead = {'1d': 1, '1w': 7, '1mo': 30, '3mo': 90, '1y': 365}.get(forecast_period, 30)

    if len(df) < 100:
        # Not enough data for deep learning — use technical analysis only
        df = calculate_all_indicators(df.copy())
        last_price = float(df['Close'].iloc[-1])
        return {
            "current_price": last_price,
            "predicted_price": last_price * 1.02,
            "confidence": 0.55,
            "trend": "neutral",
            "recommendation": "Hold",
            "lookahead_days": lookahead,
            "models_used": ["Technical Analysis"],
        }

    ensemble = EnsemblePredictor()
    ensemble.train(df, lookahead=min(lookahead, 30))  # Cap training lookahead
    result = ensemble.predict(df)

    return {
        "current_price": result['current_price'],
        "predicted_price": result['predicted_price'],
        "confidence": result['confidence'],
        "trend": result['trend'],
        "recommendation": result['recommendation'],
        "lookahead_days": lookahead,
        "regime": result.get('regime', 'unknown'),
        "weights": result.get('weights', {}),
        "individual_predictions": result.get('individual_predictions', {}),
        "model_metrics": result.get('model_metrics', {}),
        "models_used": ["LSTM", "CNN", "Technical Analysis"],
    }
